import { redis } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';
import { Logger } from '../Logger';

export class RateLimitService {

    /**
     * Checks if the user or global system has reached the generation limit.
     * Returns true if allowed, false if blocked.
     */
    static async checkLimit(userId: string): Promise<{ allowed: boolean; reason?: 'user' | 'global' }> {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const userKey = `limit:gen:user:${userId}:${today}`;
        const globalKey = `limit:gen:global:${today}`;

        try {
            // 1. Check Global Limit
            const globalCount = await redis.get(globalKey);
            const globalUsed = parseInt(globalCount || '0');
            if (globalUsed >= CONFIG.LIMITS.dailyGlobalGen) {
                Logger.warn(`[Limit] Global cap hit (${globalUsed}/${CONFIG.LIMITS.dailyGlobalGen})`);
                return { allowed: false, reason: 'global' };
            }

            // 2. Check User Limit
            const userCount = await redis.get(userKey);
            const userUsed = parseInt(userCount || '0');
            if (userUsed >= CONFIG.LIMITS.dailyUserGen) {
                Logger.warn(`[Limit] User cap hit for ${userId} (${userUsed}/${CONFIG.LIMITS.dailyUserGen})`);
                return { allowed: false, reason: 'user' };
            }

            return { allowed: true };

        } catch (error) {
            Logger.error('[RateLimit] Check failed', error);
            // Fail open (allow) if Redis errors to avoid blocking users during outages? 
            // Or fail closed? For a hackathon/demo, failing open is usually safer UX unless strict cost control needed.
            // Let's fail open but log it.
            return { allowed: true };
        }
    }

    /**
     * Increments the generation counters for user and global.
     * Should be called ONLY after a successful generation.
     */
    static async increment(userId: string): Promise<void> {
        const today = new Date().toISOString().slice(0, 10);
        const userKey = `limit:gen:user:${userId}:${today}`;
        const globalKey = `limit:gen:global:${today}`;
        const ttlSeconds = 86400; // 24 hours

        try {
            // Increment User
            await redis.incrBy(userKey, 1);
            await redis.expire(userKey, ttlSeconds);

            // Increment Global
            await redis.incrBy(globalKey, 1);
            await redis.expire(globalKey, ttlSeconds);

            Logger.info(`[Limit] Incremented stats for ${userId}`);
        } catch (error) {
            Logger.error('[RateLimit] Increment failed', error);
        }
    }

    /**
     * Get current usage stats for UI display
     */
    static async getStats(userId: string): Promise<{ userUsed: number; globalUsed: number }> {
        const today = new Date().toISOString().slice(0, 10);
        const userKey = `limit:gen:user:${userId}:${today}`;
        const globalKey = `limit:gen:global:${today}`;

        try {
            const [u, g] = await Promise.all([
                redis.get(userKey),
                redis.get(globalKey)
            ]);

            return {
                userUsed: u ? parseInt(u) : 0,
                globalUsed: g ? parseInt(g) : 0
            };
        } catch (e) {
            return { userUsed: 0, globalUsed: 0 };
        }
    }
}
