import { Request, Response } from 'express';
import { LeaderboardService, LeaderboardEntryInput } from '../services/LeaderboardService';
import { Logger } from '../Logger';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { CacheService } from '../services/CacheService';

/**
 * Controller for managing global and topic-specific leaderboards.
 */
export class LeaderboardController {
    /**
     * Retrieves the top 50 users for the global totals leaderboard.
     */
    static async listGlobal(_req: Request, res: Response) {
        try {
            const cache = CacheService.getInstance();
            const cached = cache.get('lb_global');
            if (cached) return res.json(cached);

            const svc = new LeaderboardService();
            const list = await svc.listGlobalTotals(50);

            cache.set('lb_global', list, 300); // Cache for 5 mins
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List global error', e);
            res.status(500).json({ error: 'Failed' });
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

                // NEW: Mark this quiz as completed for the user so they get a fresh one next time (if next day)
                // We resolve the user ID from headers (userKey is often just username in client payload, 
                // but for security/consistency we try to use the auth header if present, or fallback to userKey)
                // In Devvit, userKey IS the username. 
                const fs = new FirestoreRestService();
                await fs.updateUserTopicStats(userKey, slug, { isCompleted: true });
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
            const date = req.params.date ? String(req.params.date) : 'today'; // Use today as default key suffix

            if (!slug) return res.status(400).json({ error: 'Slug required' });

            const cacheKey = `lb_${slug}_${date}`;
            const cache = CacheService.getInstance();
            const cached = cache.get(cacheKey);
            if (cached) return res.json(cached);

            const svc = new LeaderboardService();
            const dateParam = typeof req.params.date === 'string' ? req.params.date : undefined;
            const list = await svc.list(slug, dateParam); // Pass original undefined if missing

            cache.set(cacheKey, list, 180); // Cache for 3 mins
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List topic error', e);
            res.status(500).json({ error: 'Failed' });
        }
    }
}
