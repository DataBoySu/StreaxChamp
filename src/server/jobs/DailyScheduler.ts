import { FirestoreRestService } from '../services/FirestoreRestService';
import { generateUnifiedContent } from '../services/GeminiService';
import { createPost } from '../core/post';
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
        // getQuizLeaderboard(date, limit) returns { userKey, nickname, score, completedAt }
        const entries = await fs.getQuizLeaderboard(todayStr, 10);

        // d. Render markdown & Compute Hash
        // formatLeaderboard expects CommentLeaderboardEntry[]
        const mappedEntries = entries.map(e => ({
            username: e.nickname, // Use nickname as username for display
            score: e.score,
            timestamp: new Date(e.completedAt).getTime()
        }));

        // Access private method? No, formatLeaderboard is private.
        // We can't access formatLeaderboard publicly. 
        // We should expose a public formatting method or construct hash from content string.
        // Or reproduce formatting logic here to compute hash.
        // Better: Update CommentLeaderboardService to expose `getLeaderboardText(entries, date)` public method.
        // For now, let's assume we can make it public or duplicate logic if needed.
        // Wait, CommentLeaderboardService handles the update too.
        // Let's use `updateLeaderboardComment`? But that updates blindly.
        // We need to check hash first.

        // Let's implement hash check logic here.
        // Format text first.
        const text = formatLeaderboard(mappedEntries, todayStr);

        // e. Compute SHA256 Hash
        const currentHash = await sha256(text);
        const storedHash = quiz.metadata?.leaderboardHash || '';

        // f. Compare
        if (currentHash === storedHash) {
            Logger.info('[Job:Sync] Hash match. No changes.');
            return;
        }

        Logger.info('[Job:Sync] content changed. Updating comment...');

        // g. Update Comment
        let commentId = quiz.metadata?.leaderboardCommentId;

        if (!commentId) {
            // Create New
            const comment = await context.reddit.submitComment({
                id: postId,
                text: text
            });
            commentId = comment.id;
            Logger.info(`[Job:Sync] Created new comment: ${commentId}`);

            // Update Firestore with new comment ID
            const fsMeta: any = { leaderboardCommentId: commentId }; // Partial updates usually supported?
            // saveDailyQuizMetadata uses PATCH, correct.
            await fs.saveDailyQuizMetadata(todayStr, fsMeta);
        } else {
            // Edit Existing
            await context.reddit.editComment({
                id: commentId,
                text: text
            });
            Logger.info(`[Job:Sync] Updated existing comment: ${commentId}`);
        }

        // h. Update Hash & Timestamp
        // We need a method to update arbitrary metadata or reuse saveDailyQuizMetadata
        // saveDailyQuizMetadata expects { leaderboardCommentId? } in interface logic? 
        // Let's check FirestoreRestService.saveDailyQuizMetadata.

        // It currently only handles leaderboardCommentId (see lines 1543-1562 in FirestoreRestService.ts).
        // I need to update saveDailyQuizMetadata to accept generic or expanded fields.
        // For now, I can use a raw patch call or add `leaderboardHash` to `saveDailyQuizMetadata`.

        // Workaround: We will update saveDailyQuizMetadata to generic later.
        // Actually, let's extend saveDailyQuizMetadata now in source logic or use raw fetch here?
        // Raw fetch inside Job is ugly. 
        // I'll assume I update saveDailyQuizMetadata in next tool call.

        // Call assuming extended capability:
        await fs.saveDailyQuizMetadata(todayStr, {
            leaderboardHash: currentHash
            // lastSync: new Date().toISOString()
        });

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

// Helper: Format Leaderboard (Duplicated for now to avoid breaking encapsulation)
function formatLeaderboard(entries: any[], date: string): string {
    const header = `### 🏆 Daily Quiz Leaderboard: ${date}\n\n`;

    if (entries.length === 0) {
        return header + `Be the first to play and claim your spot!\n\n*Updated every 3 hours*`;
    }

    let table = `| Rank | Player | Score | Time |\n`;
    table += `|:---:|:---|:---:|:---:|\n`;

    const rows = entries.slice(0, 10).map((e, i) => {
        const rank = i + 1;
        const timeStr = new Date(e.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const name = rank <= 3 ? `**u/${e.username}**` : `u/${e.username}`;
        const score = rank <= 3 ? `**${e.score}**` : `${e.score}`;

        return `| ${rank} | ${name} | ${score} | ${timeStr} |`;
    });

    return header + table + rows.join('\n') + `\n\n*Updated every 3 hours. Only your first shared score counts.*`;
}
