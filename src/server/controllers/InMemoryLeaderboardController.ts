import { Request, Response } from 'express';
import { LeaderboardMemoryService } from '../services/LeaderboardMemoryService';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { TopicLeaderboardService } from '../services/TopicLeaderboardService';

export class InMemoryLeaderboardController {

    static async submitScore(req: Request, res: Response): Promise<void> {
        const { slug } = req.params;
        const safeSlug = String(slug); // Ensure string
        const { userKey, nickname, score, timeTakenMs } = req.body;

        if (!safeSlug || !nickname) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        try {
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(safeSlug);

            if (topic && topic.activeQuizId) {
                // TOPIC BRANCH: Use TopicLeaderboardService (Requirement 3 & 4)
                const topicSvc = new TopicLeaderboardService();
                const result = await topicSvc.submitScore({
                    slug: safeSlug,
                    quizId: topic.activeQuizId,
                    userId: String(userKey || nickname),
                    nickname,
                    score: Number(score || 0),
                    submittedAt: new Date().toISOString()
                });
                res.json({ ok: result.accepted, reason: result.reason });
                return;
            }

            const mem = LeaderboardMemoryService.getInstance();
            // Pass metadata including timeTakenMs and userKey
            mem.submit(safeSlug, nickname, Number(score || 0), {
                timeTakenMs: Number(timeTakenMs || 0),
                userKey: String(userKey || '')
            });
            res.json({ ok: true });
        } catch (e) {
            console.error('[InMemoryLeaderboard] Submit failed', e);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    }

    static async getLeaderboard(req: Request, res: Response): Promise<void> {
        const { slug } = req.params;
        const safeSlug = String(slug);
        try {
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(safeSlug);

            if (topic && topic.activeQuizId) {
                // TOPIC BRANCH: Use TopicLeaderboardService (Requirement 3 & 4)
                const topicSvc = new TopicLeaderboardService();
                const raw = await topicSvc.getLeaderboard(safeSlug, topic.activeQuizId, 10);
                const entries = raw.map(e => ({
                    username: e.nickname,
                    score: e.score,
                    timestamp: new Date(e.submittedAt).getTime(),
                    timeTakenMs: 0,
                    userKey: e.userId
                }));
                res.json({ entries });
                return;
            }

            const mem = LeaderboardMemoryService.getInstance();
            const entries = mem.get(safeSlug);
            res.json({ entries });
        } catch (e) {
            console.error('[InMemoryLeaderboard] Fetch failed', e);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }
}
