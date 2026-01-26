import { Router } from 'express';
import { Logger } from '../Logger';
import { UserService } from '../services/UserService';
import { getDevvitUserId } from '../context/userContext';
import { reddit, context } from '@devvit/web/server';
import type { InitResponse } from '../../shared/types/api';

const router = Router();

// Devvit user context proxy: attempts to derive a userId.
router.get('/context/user', async (req, res) => {
    try {
        const { userId, source } = getDevvitUserId(req);
        if (userId && /^t2_/.test(userId)) {
            Logger.info('[ContextUser] resolved', { userId, source });
            return res.json({ ok: true, userId, source });
        }
        Logger.error('[ContextUser] userId not found');
        return res.status(404).json({ ok: false, error: 'USER_ID_NOT_AVAILABLE' });
    } catch (e) {
        Logger.error('[ContextUser] error', e);
        return res.status(500).json({ ok: false, error: 'CONTEXT_ERROR' });
    }
});

router.get('/users/resolve', async (req, res) => {
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const us = new UserService();
    Logger.info('[Resolve] attempt', { userId });
    const user = await us.getUser(userId);
    if (!user) {
        Logger.info('[Resolve] not found', { userId });
        return res.json({ found: false });
    }
    Logger.info('[Resolve] success', { userId, nickname: user.nickname });
    res.json({ found: true, user });
});

router.post('/users/signup', async (req, res) => {
    const { userId, nickname } = req.body || {};
    if (!userId || typeof userId !== 'string') return res.status(400).json({ ok: false, error: 'userId required' });
    if (!nickname || typeof nickname !== 'string') return res.status(400).json({ ok: false, error: 'nickname required' });
    const trimmedNick = nickname.trim();
    if (trimmedNick.length < 1 || trimmedNick.length > 40) return res.status(400).json({ ok: false, error: 'nickname length 1-40' });
    const us = new UserService();
    Logger.info('[Signup] attempt', { userId, nickname: trimmedNick });
    const existing = await us.getUser(userId);
    if (existing) {
        Logger.info('[Signup] already-exists', { userId, nickname: existing.nickname });
        return res.status(200).json({ ok: true, user: existing, reason: 'ALREADY_EXISTS' });
    }
    const created = await us.createUser(userId, trimmedNick);
    if (!created) {
        Logger.error('Signup failed (taken/conflict)', { userId, nickname: trimmedNick });
        return res.status(409).json({ ok: false, error: 'nickname taken or create failed' });
    }
    Logger.info('[Signup] user created', { userId, nickname: trimmedNick });
    res.json({ ok: true, user: created });
});

// API endpoint to get user information (simplified)
router.get('/user', async (req, res) => {
    try {
        let username: string | null = null;

        // 1. Try Devvit Proxy
        try {
            username = await reddit.getCurrentUsername() || null;
        } catch (e) {
            Logger.warn('[api/user] reddit.getCurrentUsername failed, falling back to headers');
        }

        // 2. Try Headers Fallback
        if (!username) {
            const { userId } = getDevvitUserId(req);
            username = userId || (req.header('x-devvit-user-name') as string) || null;
        }

        if (username) {
            return res.json({ userId: username, username, displayName: username, isLoggedIn: true });
        }

        return res.json({ userId: null, username: null, displayName: null, isLoggedIn: false });
    } catch (e) {
        Logger.error('[api/user] error', e);
        return res.status(200).json({ userId: null, username: null, displayName: null, isLoggedIn: false });
    }
});

// Initialization endpoint: returns postId and username (Devvit context-aware)
// Note: Adjusted path to just '/init' since it will be mounted under /api
router.get('/init', async (req, res): Promise<void> => {
    let postId = (context as any)?.postId || (req.header('x-devvit-post-id'));

    if (!postId) {
        // Very last resort: if we're in playtest, we might have a hardcoded fallback or env
        postId = process.env.DEVVIT_POST_ID || 'local_post';
    }

    try {
        let username: string | null = null;

        try {
            username = await reddit.getCurrentUsername() || null;
        } catch (e) {
            // Fallback to headers
            username = (req.header('x-devvit-user-name') as string) || (req.header('x-devvit-user-id') as string) || null;
        }

        res.json({
            type: 'init',
            postId: postId,
            username: username,
        } as InitResponse);
    } catch (error) {
        Logger.error(`API Init Error:`, error);
        res.json({
            type: 'init',
            postId: postId,
            username: null,
        } as InitResponse);
    }
}
);

export default router;
