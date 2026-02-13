import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
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
            const cached = await cache.get('lb_global');
            if (cached) return res.json(cached);

            // Switch to using FirestoreRestService.getTopUsers (Total Scores)
            const fs = new FirestoreRestService();
            const list = await fs.getTopUsers(50);

            await cache.set('lb_global', list, 300); // Cache for 5 mins
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
            const { userKey, nickname, score, slug: bodySlug } = req.body || {};
            const slug = req.params.slug || bodySlug; // Prioritize URL param

            if (!userKey || !nickname || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid submission payload' });
            }

            // Block anonymous "Player" users from submitting scores
            if (userKey === 'Player' || nickname === 'Player') {
                return res.status(403).json({ error: 'Anonymous users cannot submit scores' });
            }

            const svc = new LeaderboardService();

            // Persist across all relevant leaderboard partitions (IN-MEMORY - Phase 3)
            // const topicRes = await svc.submit(slug || 'global', entry);

            // Submit to Memory
            try {
                const { LeaderboardMemoryService } = await import('../services/LeaderboardMemoryService');
                const mem = LeaderboardMemoryService.getInstance();

                // If we have a specific PostID (Custom Quiz), use that key
                // Otherwise use topic slug
                const postId = req.body.postId;
                const key = postId ? `post:${postId}` : `topic:${slug || 'global'}`;

                mem.submit(key, nickname, score);

                // NEW: Trigger Comment Leaderboard Update (Fire & Forget, but await for context safety)
                if (postId) {
                    const { CommentLeaderboardService } = await import('../services/CommentLeaderboardService');
                    await CommentLeaderboardService.getInstance().checkAndUpdate(postId);
                }
            } catch (memErr) {
                Logger.error('[SubmitScore] Memory/Comment Fail', memErr);
            }

            if (slug && !req.body.postId) { // Only update topic stats if it's a topic quiz? Keep existing logic for now
                // await svc.submitRolling(slug, entry);

                // NEW: Mark this quiz as completed (stays, this is progression)
                // We resolve the user ID from headers (userKey is often just username in client payload, 
                // but for security/consistency we try to use the auth header if present, or fallback to userKey)
                // In Devvit, userKey IS the username. 
                const fs = new FirestoreRestService();
                await fs.updateUserTopicStats(userKey, slug, { isCompleted: true });

                // TRIGGER STATS AGGREGATION (Background)
                void svc.updateQuizStats_FORCE(slug, score, 5).catch(e => Logger.error('[Leaderboard] Stats trigger fail', e));
            }

            // Removed addToGlobalTotals – we now query 'users' directly for total scores
            res.json({ ok: true });
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
            const cached = await cache.get(cacheKey);
            if (cached) return res.json(cached);

            // const svc = new LeaderboardService();
            // const dateParam = typeof req.params.date === 'string' ? req.params.date : undefined;
            // const list = await svc.list(slug, dateParam); // OLD

            // NEW: Read from Memory
            const { LeaderboardMemoryService } = await import('../services/LeaderboardMemoryService');
            const mem = LeaderboardMemoryService.getInstance();
            // Key format: topic:slug
            const key = `topic:${slug}`;
            const raw = mem.get(key);

            const list = raw.map(e => ({
                nickname: e.username,
                score: e.score,
                submittedAt: new Date(e.timestamp).toISOString(),
                userKey: e.username,
                timeTakenMs: 0
            }));

            await cache.set(cacheKey, list, 10); // Cache for 10s
            res.json(list);
        } catch (e) {
            Logger.error('[Leaderboard] List topic error', e);
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * Retrieves aggregated stats for a specific quiz (Custom).
     */
    static async getQuizStats(req: Request, res: Response) {
        try {
            const quizId = String(req.params.quizId || '');
            if (!quizId) return res.status(400).json({ error: 'Quiz ID required' });

            const svc = new LeaderboardService();
            const stats = await svc.getQuizStats(quizId);

            // If missing, return null or empty (client handles)
            res.json(stats || {});
        } catch (e) {
            Logger.error('[Leaderboard] Get Stats Error', e);
            res.status(500).json({ error: 'Failed' });
        }
    }
}
