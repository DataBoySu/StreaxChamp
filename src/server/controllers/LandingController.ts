import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
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
            const cached = cache.get('landing_summary');
            if (cached) return res.json({ ok: true, ...cached });

            const lb = new LeaderboardService();
            const fs = new FirestoreRestService();

            // Fetch data in parallel
            const [globalTop, topics] = await Promise.all([
                lb.listGlobalTotals(10),
                fs.listTopics()
            ]);

            const summary = {
                globalTop: globalTop.slice(0, 3), // Top 3 for landing
                globalTotals: globalTop,
                hotTopics: topics.slice(0, 6), // Top 6 topics
                popular: topics.slice(0, 10),
                top3: globalTop.slice(0, 3)
            };

            // Cache for 5 minutes
            cache.set('landing_summary', summary, 300);

            res.json({ ok: true, ...summary });
        } catch (e) {
            Logger.error('[Landing] Summary error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch summary' });
        }
    }
}
