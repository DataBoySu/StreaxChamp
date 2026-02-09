import { Request, Response } from 'express';
import { RateLimitService } from '../services/RateLimitService';
import { reddit } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

export class LimitController {
    /**
     * Get current limit status for the authenticated user and global system.
     */
    static async getLimits(_req: Request, res: Response) {
        try {
            // Resolve username
            let username = 'anon';
            try {
                const curr = await reddit.getCurrentUsername();
                if (curr) username = curr;
            } catch { /* ignore */ }

            const stats = await RateLimitService.getStats(username);
            const check = await RateLimitService.checkLimit(username);

            const response = {
                user: {
                    used: stats.userUsed,
                    limit: CONFIG.LIMITS.dailyUserGen,
                    remaining: Math.max(0, CONFIG.LIMITS.dailyUserGen - stats.userUsed)
                },
                global: {
                    used: stats.globalUsed,
                    limit: CONFIG.LIMITS.dailyGlobalGen,
                    remaining: Math.max(0, CONFIG.LIMITS.dailyGlobalGen - stats.globalUsed)
                },
                allowed: check.allowed,
                reason: check.reason
            };

            console.log(`[LimitController] Response for ${username}:`, JSON.stringify(response));
            res.json(response);

        } catch (error) {
            console.error('[LimitController] Failed to fetch limits', error);
            res.status(500).json({ error: 'Failed to fetch limit status' });
        }
    }
}
