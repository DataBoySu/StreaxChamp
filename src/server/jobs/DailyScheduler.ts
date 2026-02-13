import { FirestoreRestService } from '../services/FirestoreRestService';
import { generateUnifiedContent } from '../services/GeminiService';
import { createPost } from '../core/post';
import { CommentLeaderboardService } from '../services/CommentLeaderboardService';
import { Logger } from '../Logger';

// Job Names (Must match main.ts registration)
export const JOB_GENERATE_DAILY = 'daily-quiz-generation';
export const JOB_SYNC_LEADERBOARD = 'daily-quiz-leaderboard-sync';

// Job Handler: Generation
export async function handleDailyGeneration(_event: any, context: any) {
    const todayStr = new Date().toISOString().slice(0, 10);
    Logger.info(`[Job:DailyGen] Starting for ${todayStr}`);

    try {
        const fs = new FirestoreRestService();

        // 1. Check if exists
        const existing = await fs.getDailyQuizByDate(todayStr);
        if (existing) {
            Logger.info(`[Job:DailyGen] Quiz for ${todayStr} already exists. Skipping.`);
            return;
        }

        // 2. Determine Topic
        const dayOfWeek = new Date().getDay();
        const topicRotation = [
            'Mixed General Knowledge',
            'Science & Technology',
            'History & Geography',
            'Arts & Literature',
            'Sports & Entertainment',
            'Nature & Animals',
            'World Cultures & Traditions'
        ];
        const dailyTopic = topicRotation[dayOfWeek];

        // 3. Generate Content
        Logger.info(`[Job:DailyGen] Generating topic: ${dailyTopic}`);
        const generated = await generateUnifiedContent(dailyTopic || 'General Knowledge', { isDev: false });

        const questions = generated.quiz.questions.map((q: any) => ({
            id: `q${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            question: q.question,
            options: q.options,
            correctAnswer: Number(q.correctAnswer) || 0,
            difficulty: String(q.difficulty || 'medium'),
            category: String(q.category || 'General'),
            explanation: q.explanation,
            createdAt: new Date().toISOString()
        }));

        const quizPayload = {
            questions,
            metadata: {
                generatedAt: new Date().toISOString(),
                sourceWikis: generated.topic.sources,
                version: 'v6-divers-scheduled',
                model: generated.model,
                generator: 'gemini',
                topic: dailyTopic,
                difficulty: 'mixed',
                redditPostId: '', // Placeholder, will update after post creation
                leaderboardHash: '',
                leaderboardCommentId: '',
                generationSource: 'scheduled'
            }
        };

        // 4. ATOMIC LOCK: Try to create document in Firestore
        // Only succeeds if the document DOES NOT exist.
        const created = await fs.createDailyQuizOnly(todayStr, quizPayload);

        if (!created) {
            Logger.info(`[Job:DailyGen] Race condition detected. Document ${todayStr} was created by another process. Exiting safely.`);
            return;
        }

        // 5. Create Reddit Post (Authority established)
        let redditPostId = '';
        try {
            const post = await createPost(context.reddit);
            redditPostId = post.id;
        } catch (e) {
            Logger.error('[Job:DailyGen] Authority established but Reddit Post failed. Manual intervention may be needed.', e);
            // We established authority but failed the post. 
            // The quiz exists in Firestore, so subsequent runs will exit at step 1 or 4.
            throw e;
        }

        // 6. Update Firestore with Reddit Post ID
        await fs.saveDailyQuizMetadata(todayStr, { redditPostId });

        Logger.info(`[Job:DailyGen] Success! Date=${todayStr}, Post=${redditPostId}`);

    } catch (e) {
        Logger.error(`[Job:DailyGen] Failed`, e);
        // Rethrow to let Devvit scheduler know it failed (potentially retrying)
        throw e;
    }
}

// Job Handler: Leaderboard Sync
export async function handleLeaderboardSync(_event: any, context: any) {
    const todayStr = new Date().toISOString().slice(0, 10);
    Logger.info(`[Job:Sync] Starting for ${todayStr}`);

    try {
        const fs = new FirestoreRestService();

        // a. Fetch daily quiz
        const quiz = await fs.getDailyQuizByDate(todayStr);
        if (!quiz) {
            Logger.info('[Job:Sync] No quiz for today. Exiting.');
            return;
        }

        // b. Check redditPostId
        const postId = quiz.metadata?.redditPostId;
        if (!postId) {
            Logger.info('[Job:Sync] No redditPostId. Exiting.');
            return;
        }

        // c. Fetch top 10 leaderboard
        const entries = await fs.getQuizLeaderboard(todayStr, 10);

        // d. Render markdown & Compute Hash
        const mappedEntries = entries.map(e => ({
            username: e.nickname,
            score: e.score,
            timestamp: new Date(e.completedAt).getTime()
        }));

        const lbService = CommentLeaderboardService.getInstance();
        const text = lbService.renderLeaderboard(mappedEntries, todayStr);

        // e. Compute SHA256 Hash
        const currentHash = await sha256(text);
        const storedHash = quiz.metadata?.leaderboardHash || '';
        const changed = currentHash !== storedHash;

        Logger.info(`[Job:Sync] Results: entries=${mappedEntries.length}, changed=${changed}, currentHash=${currentHash.slice(0, 8)}, storedHash=${storedHash.slice(0, 8)}`);

        // f. Compare
        if (!changed) {
            Logger.info('[Job:Sync] Content unchanged. Exiting.');
            return;
        }

        Logger.info('[Job:Sync] Content changed or missing hash. Procceeding to update...');

        // g. Update Comment
        let commentId = quiz.metadata?.leaderboardCommentId;
        let commentCreated = false;
        let commentEdited = false;

        if (!commentId) {
            Logger.info('[Job:Sync] No commentId. Creating new comment.');
            const comment = await context.reddit.submitComment({
                id: postId as string,
                text: text
            });
            commentId = (comment.id as string);
            commentCreated = true;
            Logger.info(`[Job:Sync] Comment created: ${commentId}`);

            await fs.saveDailyQuizMetadata(todayStr, { leaderboardCommentId: commentId });
        } else {
            // Edit Existing
            await context.reddit.editComment({
                id: commentId as string,
                text: text
            });
            commentEdited = true;
            Logger.info(`[Job:Sync] Comment updated: ${commentId}`);
        }

        // h. Update Hash
        await fs.saveDailyQuizMetadata(todayStr, {
            leaderboardHash: currentHash
        });

        Logger.info(`[Job:Sync] Completed: created=${commentCreated}, edited=${commentEdited}`);

    } catch (e) {
        Logger.error(`[Job:Sync] Failed`, e);
    }
}

// Helper: SHA256 (Simple implementation for string)
async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
