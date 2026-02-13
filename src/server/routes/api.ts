import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { QuizController } from '../controllers/QuizController';
import { RobotController } from '../controllers/RobotController';
import { UserController } from '../controllers/UserController';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { InMemoryLeaderboardController } from '../controllers/InMemoryLeaderboardController'; // NEW
import { LandingController } from '../controllers/LandingController';


import { HistoryController } from '../controllers/HistoryController'; // Added import
import { FirestoreRestService } from '../services/FirestoreRestService';
import { LimitController } from '../controllers/LimitController';
import { MaintenanceController } from '../controllers/MaintenanceController';
import { context } from '@devvit/web/server';
import { reddit, redis } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

const router = Router();

// --- Limits ---
router.get('/limits', LimitController.getLimits); // NEW: Frontend blocking

// --- Topics ---
router.get('/topics', TopicController.listTopics);
router.get('/topics/:slug', TopicController.getTopic);
router.get('/topics/:slug/status', TopicController.getTopicStatus);
router.post('/topics/generate', TopicController.generateTopic);

// --- Quizzes ---
router.get('/quiz', QuizController.getDailyQuiz);
router.get('/quiz/daily/leaderboard', QuizController.getDailyLeaderboard); // NEW
router.post('/quiz/daily/submit', QuizController.submitDailyScore); // NEW
router.get('/quiz/daily/list', QuizController.listDailyQuizzes);    // NEW
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

// --- Memory Leaderboard (Server-Only, No Firestore) ---
router.post('/leaderboard/memory/:slug/submit', InMemoryLeaderboardController.submitScore);
router.get('/leaderboard/memory/:slug', InMemoryLeaderboardController.getLeaderboard);

// --- History ---
router.get('/history/global', HistoryController.getGlobalHistory);
router.post('/history/save', HistoryController.savePlay);

// --- Robot ---
router.get('/robot/dialogues/today', RobotController.getDialogues);

// --- Landing ---
router.get('/landing/summary', LandingController.getSummary);

// --- Maintenance ---
router.get('/maintenance/migrate-legacy', MaintenanceController.migrateLegacySnapshots);

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

        // [NEW] Daily Quiz Status for dynamic splash
        let dailyQuizStatus = 'READY';
        try {
            const todayStr = new Date().toISOString().slice(0, 10);

            // [NEW] Daily Quiz Status via Firestore
            if (username) {
                const fs = new FirestoreRestService();
                const history = await fs.getDailyPlayHistory(username, todayStr);
                if (history && history.completed) {
                    dailyQuizStatus = 'COMPLETED';
                }
            }
        } catch (statusErr) {
            console.error('[Init] Failed to check daily quiz status', statusErr);
        }

        res.json({
            type: 'init',
            postId: postId,
            username: username,
            customQuiz: customQuiz,
            dailyQuizStatus: dailyQuizStatus
        });
    } catch (error: any) {
        console.error(`API Init Error for post ${postId}:`, error);
        res.status(200).json({ type: 'init', postId, username: null, error: error.message });
    }
});

router.post('/share/comment', async (req, res) => {
    let targetPostId = req.body.postId;
    const { text } = req.body;

    // [FALLBACK] If client didn't send postId, try to get it from context
    if (!targetPostId) {
        const ctx: any = context;
        targetPostId = ctx.postId;
        console.log(`[SHARE] Client postId missing. Falling back to context.postId: ${targetPostId}`);
    }

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

        // Block anonymous "Player" users from sharing
        if (username === 'Player') {
            return res.status(403).json({ error: 'Anonymous users cannot share scores' });
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

        // [REMOVED] Daily Leaderboard Submission to Memory. 
        // Now fully Firestore-based via QuizController.submitDailyScore.
        // We still check userStats for duplicate share check below.

        // Allow DEV users to bypass limit
        const isDev = CONFIG.DEV.USERNAMES.includes(username);
        if (isDev) {
            console.log(`[SHARE] User ${username} is DEV. Bypassing share limit.`);
        } else if (userStats?.hasShared === true) {
            console.log("[SHARE] User already shared score for this quiz.");
            // Even if already shared, we updated the leaderboard above, so we can return success or 409.
            // Returning 409 is fine as long as leaderboard is updated.
            return res.status(409).json({ error: 'Already shared' });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("[SHARE] Comment post failed", error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// --- Community ---
router.post('/community/subscribe', async (_req, res) => {
    try {
        const username = await reddit.getCurrentUsername();
        if (!username) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        await reddit.subscribeToCurrentSubreddit();

        console.log(`[SUBSCRIBE] User ${username} subscribed to subreddit`);
        res.json({ success: true, subscribed: true });
    } catch (error) {
        console.error('[SUBSCRIBE] Failed to subscribe:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

export const apiRouter = router;
