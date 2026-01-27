import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { QuizController } from '../controllers/QuizController';
import { RobotController } from '../controllers/RobotController';
import { UserController } from '../controllers/UserController';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { LandingController } from '../controllers/LandingController';
import { HistoryController } from '../controllers/HistoryController'; // Added import
import { context } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';

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

// --- Leaderboard ---
router.get('/leaderboard/global', LeaderboardController.listGlobal);
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

        res.json({
            type: 'init',
            postId: postId,
            username: username,
        });
    } catch (error: any) {
        console.error(`API Init Error for post ${postId}:`, error);
        res.status(200).json({ type: 'init', postId, username: null, error: error.message });
    }
});

export const apiRouter = router;
