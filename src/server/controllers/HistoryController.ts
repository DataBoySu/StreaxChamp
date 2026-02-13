import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { UserService } from '../services/UserService';
import { Logger } from '../Logger';

interface PlayHistoryEntry {
    username: string;
    nickname: string;
    topicSlug: string;
    topicTitle: string;
    timestamp: number;
    quizDate: string;
}

/**
 * Controller for managing play history
 */
export class HistoryController {
    /**
     * Save a play history record
     */
    static async savePlay(req: Request, res: Response) {
        try {
            const { username, nickname, topicSlug, topicTitle, quizDate, score } = req.body;

            if (!username || !topicSlug || !topicTitle) {
                return res.status(400).json({ ok: false, error: 'Missing required fields' });
            }

            // Block persistence for guest "Player" users
            if (username === 'Player' || nickname === 'Player') {
                Logger.info(`[History] Skipping save for anonymous 'Player'`);
                return res.json({ ok: true });
            }

            const fs = new FirestoreRestService();
            const us = new UserService();

            const targetId = username; // User wants everything identified by username
            const realUser = await us.getUser(targetId);
            const effectiveNickname = realUser ? realUser.nickname : (nickname || username);

            const entry: PlayHistoryEntry = {
                username: targetId,
                nickname: effectiveNickname,
                topicSlug,
                topicTitle,
                timestamp: Date.now(),
                quizDate: quizDate || new Date().toISOString().split('T')[0]
            };

            // Always save to play history
            await fs.savePlayHistory(entry);

            // Fetch current stats for the username doc
            const stats = await fs.getUserTopicStats(targetId, topicSlug);
            const today = quizDate || new Date().toISOString().split('T')[0];

            // ALWAYS update user stats (lastAttemptDate, etc.)
            await fs.updateUserTopicStats(targetId, topicSlug, {
                lastAttemptDate: today,
                isCompleted: true
            });

            // ONLY increment score if not already played today
            if (!stats || stats.lastAttemptDate !== today) {
                if (typeof score === 'number' && score > 0) {
                    await fs.incrementUserTotalScore(targetId, score, effectiveNickname);
                }
            } else {
                Logger.info(`[History] Score skipped for ${targetId} (already played today)`);
            }

            // Increment topic play count
            try { await fs.incrementTopicPlayCount(topicSlug); } catch (e) { /* ignore */ }

            // Invalidate landing summary caches so leaderboard and topics update immediately
            try {
                const cache = (await import('../services/CacheService')).CacheService.getInstance();
                await cache.del('landing_leaderboard');
                await cache.del('hot_topics_data');
            } catch (e) { /* ignore */ }

            return res.json({ ok: true });
        } catch (e) {
            Logger.error('[History] Save error', e);
            res.status(500).json({ ok: false, error: 'Failed to save play history' });
        }
    }

    /**
     * Get global play history (latest 15)
     */
    static async getGlobalHistory(_req: Request, res: Response) {
        try {
            const fs = new FirestoreRestService();
            const history = await fs.getGlobalPlayHistory(15);
            res.json({ ok: true, history });
        } catch (e) {
            Logger.error('[History] Fetch error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch history' });
        }
    }
}
