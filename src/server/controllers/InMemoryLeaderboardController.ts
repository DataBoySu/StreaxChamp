import { Request, Response } from 'express';
import { LeaderboardMemoryService } from '../services/LeaderboardMemoryService';

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
            const mem = LeaderboardMemoryService.getInstance();
            const entries = mem.get(safeSlug);
            res.json({ entries });
        } catch (e) {
            console.error('[InMemoryLeaderboard] Fetch failed', e);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }
}
