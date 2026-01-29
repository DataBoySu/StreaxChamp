import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { CacheService } from '../services/CacheService';
import { CONFIG } from '../../shared/constants';

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
            const cached = await cache.get('landing_summary');
            if (cached) return res.json({ ok: true, ...cached });

            const fs = new FirestoreRestService();

            // Fetch data: use fs.getTopUsers (from users collection) for canonical global leaderboard
            const [globalTopRaw, topics] = await Promise.all([
                fs.getTopUsers(50),
                fs.listTopics()
            ]);

            // Map totalScore to the expected leaderboard fields
            const globalTop = globalTopRaw.map(entry => ({
                userKey: entry.userKey,
                nickname: entry.nickname,
                score: entry.totalScore
            }));

            const summary = {
                globalTop: globalTop.slice(0, 10),
                globalTotals: globalTop.slice(0, 50),
                hotTopics: topics.slice(0, CONFIG.GAME.TOP_HOT_TOPICS_COUNT),
                popular: topics.slice(0, 10),
                top3: globalTop.slice(0, 3)
            };

            // Cache for 5 minutes (invalidated manually on quiz completion)
            await cache.set('landing_summary', summary, 300);

            return res.json({ ok: true, ...summary });
        } catch (e) {
            Logger.error('[Landing] Summary error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch summary' });
        }
    }
}
