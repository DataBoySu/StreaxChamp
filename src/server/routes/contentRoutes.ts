import { Router, Request, Response } from 'express';
import { Logger } from '../Logger';
import { ROBOT_DIALOGUES } from '../data/robotDialogues';

// Mock summary data to replace Firestore stats
const MOCK_SUMMARY = {
    top3: [],
    popular: [],
    globalTop: [],
    hotTopics: [
        { title: 'General Knowledge', slug: 'general-knowledge', playCount: 100 },
        { title: 'Science', slug: 'science', playCount: 80 },
        { title: 'History', slug: 'history', playCount: 75 },
    ],
    globalTotals: { players: 1, quizzes: 10 },
    updatedAt: new Date().toISOString()
};

const router = Router();

// GET /api/robot/dialogues/today
router.get('/robot/dialogues/today', async (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);

    // Pick 5 random unique lines from local file
    const shuffled = [...ROBOT_DIALOGUES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    Logger.info('[RobotDialogues] Serving local dialogues.');
    return res.json({ ok: true, date: today, lines: selected });
});

// GET /api/landing/summary
router.get('/landing/summary', async (_req, res) => {
    // Return mock data to stop Firestore 404 errors as requested
    // Logger.info('[LandingSummary] Serving local mock summary.');
    res.json({ ok: true, ...MOCK_SUMMARY });
});

export default router;
