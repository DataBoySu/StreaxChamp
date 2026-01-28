import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
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

            const lb = new LeaderboardService();
            const fs = new FirestoreRestService();

            // Fetch data in parallel
            const [globalTotalsRaw, topics] = await Promise.all([
                lb.listGlobalTotals(50),
                fs.listTopics()
            ]);

            // Map totalScore to score and deduplicate by nickname (taking highest score)
            const uniqueMap = new Map<string, typeof globalTotalsRaw[0]>();

            globalTotalsRaw.forEach(entry => {
                const existing = uniqueMap.get(entry.nickname);
                if (!existing || entry.totalScore > existing.totalScore) {
                    uniqueMap.set(entry.nickname, entry);
                }
            });

            // Convert map back to array and sort
            const globalTop = Array.from(uniqueMap.values())
                .sort((a, b) => b.totalScore - a.totalScore)
                .map(entry => ({
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

            // Cache for 5 minutes
            await cache.set('landing_summary', summary, 300);

            res.json({ ok: true, ...summary });
        } catch (e) {
            Logger.error('[Landing] Summary error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch summary' });
        }
    }
}
