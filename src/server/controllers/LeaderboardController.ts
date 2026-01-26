import { Request, Response } from 'express';
import { LeaderboardService, LeaderboardEntryInput } from '../services/LeaderboardService';
import { Logger } from '../Logger';

/**
 * Controller for managing global and topic-specific leaderboards.
 */
export class LeaderboardController {
    /**
     * Retrieves the top 50 users for the global totals leaderboard.
     */
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

    /**
     * Submits a fresh score to the topic, rolling, and global leaderboards.
     */
    static async submitScore(req: Request, res: Response) {
        try {
            const { userKey, nickname, score, timeTakenMs, slug } = req.body || {};
            if (!userKey || !nickname || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid submission payload' });
            }

            const svc = new LeaderboardService();
            const entry: LeaderboardEntryInput = { userKey, nickname, score, timeTakenMs: timeTakenMs || 0 };

            // Persist across all relevant leaderboard partitions
            const topicRes = await svc.submit(slug || 'global', entry);

            if (slug) {
                await svc.submitRolling(slug, entry);
            }

            await svc.addToGlobalTotals(entry);

            res.json({ ok: true, topic: topicRes });
        } catch (e) {
            Logger.error('[Leaderboard] Submit Error', e);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    }

    /**
     * Lists entries for a specific topic's daily leaderboard.
     */
    static async listTopicLeaderboard(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug || '');
            const date = req.params.date ? String(req.params.date) : undefined;

            if (!slug) return res.status(400).json({ error: 'Slug required' });

            const svc = new LeaderboardService();
            const list = await svc.list(slug, date);
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List Topic Error', e);
            res.status(500).json({ error: 'Failed to list topic leaderboard' });
        }
    }
}
