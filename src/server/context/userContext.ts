import { Logger } from '../Logger';
import type { Request } from 'express';

/**
 * Attempt to extract the Devvit user id using (future) runtime context.
 * For now this relies on headers/env/query until true useContext integration is wired.
 * In a deployed Devvit app (frame, menu item, etc.) you would access the context via
 * the handler invocation rather than Express. This helper centralizes logic until then.
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
