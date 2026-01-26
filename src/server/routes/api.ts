import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { QuizController } from '../controllers/QuizController';
import { RobotController } from '../controllers/RobotController';
import { UserController } from '../controllers/UserController';
import { LeaderboardController } from '../controllers/LeaderboardController';
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
router.post('/leaderboard/submit', LeaderboardController.submitScore);
router.get('/topics/:slug/leaderboard', LeaderboardController.listTopicLeaderboard);

// --- Robot ---
router.get('/robot/dialogues/today', RobotController.getDialogues);

// --- Users ---
router.get('/context/user', UserController.resolveContextUser);
router.get('/users/resolve', UserController.resolveUser);
router.post('/users/signup', UserController.signup);
router.get('/user', UserController.getCurrentUser); // Legacy/Simple

// --- Init (System/Context) ---
// Kept inline or moved? Moving logic to inline here or helper since it uses 'context' which is global
// Actually, let's move the logic to a handler function here to keep it clean, 
// or export a static method in UserController if we want to share it. 
// For now, I'll implement it here or separate SystemController?
// Detailed implementation plan didn't specify SystemController.
// I'll implement it as an inline handler here for now to strictly follow "cleanup index.ts", 
// but referencing UserController for shared logic if needed. 
// Actually, looking at the code, it just gets postId and username.
router.get('/init', async (_req, res) => {
    const { postId } = context as { postId?: string };

    if (!postId) {
        console.error('API Init Error: postId not found in devvit context');
        res.status(400).json({ status: 'error', message: 'postId is required but missing from context' });
        return;
    }

    try {
        const username = await reddit.getCurrentUsername();
        res.json({
            type: 'init',
            postId: postId,
            username: username ?? null,
        });
    } catch (error: any) {
        console.error(`API Init Error for post ${postId}:`, error);
        res.status(400).json({ status: 'error', message: error.message || 'Unknown error' });
    }
});

export const apiRouter = router;
