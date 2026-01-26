import { Logger } from '../Logger';
import type { Request } from 'express';

/**
 * Extracts the Reddit user ID from request headers, environment variables, or query parameters.
 */
export function getDevvitUserId(req: Request): { userId: string | null; source: string } {
  try {
    // Priority order: header -> env -> query
    const headerId = String(req.header('x-devvit-user-id') || '').trim();
    if (headerId) return { userId: headerId, source: 'header' };
    const envId = (process.env.DEVVIT_TEST_USER_ID || '').trim();
    if (envId) return { userId: envId, source: 'env' };
    const queryId = String(req.query.userId || '').trim();
    if (queryId) return { userId: queryId, source: 'query' };
    return { userId: null, source: 'none' };
  } catch (e) {
    Logger.error('[getDevvitUserId] failed', e);
    return { userId: null, source: 'error' };
  }
}
