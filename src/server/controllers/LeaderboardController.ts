import { Request, Response } from 'express';
import { LeaderboardService, LeaderboardEntryInput } from '../services/LeaderboardService';
import { Logger } from '../Logger';

export class LeaderboardController {
    static async listGlobal(_req: Request, res: Response) {
        try {
            const svc = new LeaderboardService();
            const list = await svc.listGlobalTotals(50);
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List Global Error', e);
            res.status(500).json({ error: 'Failed to list global leaderboard' });
        }
    }

    static async submitScore(req: Request, res: Response) {
        try {
            const { userKey, nickname, score, timeTakenMs, slug } = req.body || {};
            if (!userKey || !nickname || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid submission payload' });
            }

            const svc = new LeaderboardService();
            const entry: LeaderboardEntryInput = { userKey, nickname, score, timeTakenMs: timeTakenMs || 0 };

            // 1. Submit to Topic Leaderboard (Daily default)
            const topicRes = await svc.submit(slug || 'global', entry);

            // 2. Submit to Rolling Leaderboard (All-time best for topic)
            if (slug) {
                await svc.submitRolling(slug, entry);
            }

            // 3. Add to Global Totals (Lifetime score)
            // Only add if it's a new "best" or just cumulative?
            // Service logic says 'addToGlobalTotals' adds the score. 
            // We should probably only do this for "Official Daily Quiz" or unique plays.
            // For now, restoring behavior: Add every play to global totals.
            await svc.addToGlobalTotals(entry);

            res.json({ ok: true, topic: topicRes });
        } catch (e) {
            Logger.error('[Leaderboard] Submit Error', e);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    }

    static async listTopicLeaderboard(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug || '');
            const date = req.params.date ? String(req.params.date) : undefined;
            if (!slug) return res.status(400).json({ error: 'Slug required' });
            const svc = new LeaderboardService();
            // If date provided use it, else default to today (in service)
            const list = await svc.list(slug, date);
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List Topic Error', e);
            res.status(500).json({ error: 'Failed to list topic leaderboard' });
        }
    }
}
