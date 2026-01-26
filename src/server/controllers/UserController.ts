import { Request, Response } from 'express';
import { getDevvitUserId } from '../context/userContext';
import { Logger } from '../Logger';
import { UserService } from '../services/UserService';
import { reddit } from '@devvit/web/server';

/**
 * Controller for managing user identity, registration, and context resolution.
 */
export class UserController {
    /**
     * Resolves the current Devvit user identity from the request context.
     */
    static async resolveContextUser(req: Request, res: Response) {
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
    }

    /**
     * Fetches a user profile from Firestore by their user ID.
     */
    static async resolveUser(req: Request, res: Response) {
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
    }

    /**
     * Registers a new user or returns the existing profile if already registered.
     */
    static async signup(req: Request, res: Response) {
        const { userId, nickname } = req.body || {};
        if (!userId || typeof userId !== 'string') return res.status(400).json({ ok: false, error: 'userId required' });
        if (!nickname || typeof nickname !== 'string') return res.status(400).json({ ok: false, error: 'nickname required' });

        const trimmedNick = nickname.trim();
        if (trimmedNick.length < 1 || trimmedNick.length > 40) {
            return res.status(400).json({ ok: false, error: 'nickname length 1-40' });
        }

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
    }

    /**
     * (Legacy) Gets the simplified current user info from the Reddit API.
     */
    static async getCurrentUser(_req: Request, res: Response) {
        try {
            const username = await reddit.getCurrentUsername();
            if (username) {
                return res.json({ userId: username, username, displayName: username, isLoggedIn: true });
            }
            return res.json({ userId: null, username: null, displayName: null, isLoggedIn: false });
        } catch (e) {
            return res.status(200).json({ userId: null, username: null, displayName: null, isLoggedIn: false });
        }
    }
}
