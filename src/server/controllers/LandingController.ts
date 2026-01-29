import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { CacheService } from '../services/CacheService';


/**
 * Controller for landing page summary data
 */
export class LandingController {
    /**
     * Returns aggregated landing page data with aggressive caching
     */
    static async getSummary(_req: Request, res: Response) {
        try {
            const cache = CacheService.getInstance();
            const fs = new FirestoreRestService();

            // 1. Handle Hot Topics (30 min cache)
            let popularTopics = await cache.get<any[]>('hot_topics_data');
            if (!popularTopics) {
                popularTopics = await fs.getHotTopics(5);
                // Cache hot topics for 30 minutes (stable data)
                await cache.set('hot_topics_data', popularTopics, 1800);
            }

            // 2. Handle Leaderboard (5 min cache)
            let leaderboardData = await cache.get<any>('landing_leaderboard');
            if (!leaderboardData) {
                const globalTopRaw = await fs.getTopUsers(50);
                const globalTop = globalTopRaw.map(entry => ({
                    userKey: entry.userKey,
                    nickname: entry.nickname,
                    score: entry.totalScore
                }));
                leaderboardData = {
                    globalTop: globalTop.slice(0, 50),
                    top3: globalTop.slice(0, 3)
                };
                // Cache leaderboard for 5 minutes
                await cache.set('landing_leaderboard', leaderboardData, 300);
            }

            const summary = {
                ...leaderboardData,
                hotTopics: popularTopics,
                popular: popularTopics.map(t => ({
                    slug: t.slug,
                    title: t.title,
                    totalCompletions: t.playCount
                }))
            };

            return res.json({ ok: true, ...summary });
        } catch (e) {
            Logger.error('[Landing] Summary error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch summary' });
        }
    }
}
