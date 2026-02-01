import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { QuizController } from '../controllers/QuizController';
import { RobotController } from '../controllers/RobotController';
import { UserController } from '../controllers/UserController';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { LandingController } from '../controllers/LandingController';
import { HistoryController } from '../controllers/HistoryController'; // Added import
import { FirestoreRestService } from '../services/FirestoreRestService';
import { context } from '@devvit/web/server';
import { reddit, redis } from '@devvit/web/server';

const router = Router();

// --- Topics ---
router.get('/topics', TopicController.listTopics);
router.get('/topics/:slug', TopicController.getTopic);
router.get('/topics/:slug/status', TopicController.getTopicStatus);
router.post('/topics/generate', TopicController.generateTopic);

// --- Quizzes ---
router.get('/quiz', QuizController.getDailyQuiz);
router.get('/quiz/bonus', QuizController.getDailyBonus); // New
// This was POST in index.ts for "Generate or Get" logic
router.post('/topics/:slug/quiz', QuizController.getTopicQuiz);
router.post('/quizzes/create', QuizController.createUserQuiz);
router.post('/quizzes/post', QuizController.postUserQuiz);
router.get('/quizzes/user/:username', QuizController.getUserCreatedQuizzes);
router.get('/quizzes/:quizId', QuizController.getQuiz);

// --- Leaderboard ---
router.get('/leaderboard/global', LeaderboardController.listGlobal);
router.get('/leaderboard/:slug', LeaderboardController.listTopicLeaderboard); // Added alias to match frontend
router.get('/stats/:quizId', LeaderboardController.getQuizStats); // NEW: Stats for custom splash
router.post('/leaderboard/:slug/submit', LeaderboardController.submitScore);
router.post('/leaderboard/submit', LeaderboardController.submitScore); // Fallback for any legacy calls
router.get('/topics/:slug/leaderboard', LeaderboardController.listTopicLeaderboard);

// --- History ---
router.get('/history/global', HistoryController.getGlobalHistory);
router.post('/history/save', HistoryController.savePlay);

// --- Robot ---
router.get('/robot/dialogues/today', RobotController.getDialogues);

// --- Landing ---
router.get('/landing/summary', LandingController.getSummary);

// --- Users ---
router.get('/context/user', UserController.resolveContextUser);
router.get('/users/resolve', UserController.resolveUser);
router.get('/users/:userId/stats', UserController.getUserStats);
router.post('/users/signup', UserController.signup);
router.get('/user', UserController.getCurrentUser); // Legacy/Simple

// --- Init (System/Context) ---
router.get('/init', async (_req, res) => {
    const { postId } = context as { postId?: string };

    if (!postId) {
        console.error('API Init Error: postId not found in devvit context');
        res.status(400).json({ status: 'error', message: 'postId is required but missing from context' });
        return;
    }

    try {
        let username: string | null = null;

        // Retrieve current username from Devvit context with fallback to null on failure
        const currentName = await reddit.getCurrentUsername().catch((err: any) => {
            console.warn('[Init] getCurrentUsername failed, defaulting to null:', err?.message);
            return null;
        });
        username = currentName || null;

        // Check for Custom Quiz Mapping (Step 4 of Prompt)
        let customQuiz = null;
        try {
            // SATISFIES STEP 2: Splash Must Enforce a Negative Gate
            // Check Redis Allowlist FIRST
            const isCustomPost = await redis.get(`custom_post_allowlist:${postId}`);
            console.log(`[Init] Checking Allowlist for ${postId}: ${isCustomPost === 'true' ? 'ALLOWED' : 'DENIED (Normal Post)'}`);

            if (isCustomPost === 'true') {
                const rawMapping = await redis.get(`post_quiz:${postId}`);
                if (rawMapping) {
                    // Parse JSON if possible, handle legacy string if needed
                    try {
                        const parsed = JSON.parse(rawMapping);
                        if (parsed && parsed.quizId) {
                            customQuiz = parsed;
                            console.log(`[Init] 🎯 Found custom quiz mapping for post ${postId}:`, parsed);
                        }
                    } catch {
                        // Legacy: It's just a quizId string
                        customQuiz = { quizId: rawMapping, topic: 'Custom Quiz' };
                        console.log(`[Init] Found legacy quiz mapping for post ${postId}: ${rawMapping}`);
                    }
                }
            } else {
                console.log(`[Init] Post ${postId} is NOT a custom quiz origin. Serving default splash.`);
            }
        } catch (e) {
            console.error(`[Init] Failed to lookup quiz mapping for ${postId}`, e);
        }

        res.json({
            type: 'init',
            postId: postId,
            username: username,
            customQuiz: customQuiz
        });
    } catch (error: any) {
        console.error(`API Init Error for post ${postId}:`, error);
        res.status(200).json({ type: 'init', postId, username: null, error: error.message });
    }
});

router.post('/share/comment', async (req, res) => {
    const { postId: targetPostId, text } = req.body;
    // const { postId: contextPostId } = context;

    console.log(`[SHARE] Request to post comment on ${targetPostId}`);

    if (!targetPostId || !text) {
        return res.status(400).json({ error: 'Missing postId or text' });
    }

    // Ideally we ensure we are commenting on the same post we are running on, or generally allow it if authorized.
    // The prompt says "Use context.reddit.submitComment" and "Use the actual Reddit post ID".

    // Check for duplicate comment for this user/quiz
    // We need to resolve the user. context.userId?
    try {
        const username = await reddit.getCurrentUsername();
        if (!username) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // We need quizId to track state. It's not in the body but we can infer or pass it.
        // Let's pass quizId from client. The client knows it.
        const { quizId } = req.body;

        if (!quizId) {
            return res.status(400).json({ error: 'Missing quizId' });
        }

        console.log("[SHARE] Attempting comment post", {
            postId: targetPostId,
            quizId,
            userId: username,
        });

        // Check Firestore state
        const fs = new FirestoreRestService();
        const userStats = await fs.getUserTopicStats(username, quizId);

        console.log("[SHARE] Resolved userStats:", userStats);
        console.log("[SHARE] hasShared =", userStats?.hasShared);

        if (userStats?.hasShared === true) {
            console.log("[SHARE] User already shared score for this quiz.");
            return res.status(409).json({ error: 'Already shared' });
        }

        await reddit.submitComment({
            id: targetPostId,
            text: text
        });

        const commentId = 'posted'; // reddit.submitComment returns Promise<Comment> in updated versions, checking signatures...
        // The mock type definitions or real ones usually return the comment object.
        // For now logging "posted" is safe.

        console.log("[SHARE] Comment posted successfully", { commentId });

        // Update state
        await fs.updateUserTopicStats(username, quizId, { hasShared: true } as any);

        res.json({ success: true });
    } catch (error) {
        console.error("[SHARE] Comment post failed", error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

export const apiRouter = router;
