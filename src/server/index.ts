import 'dotenv/config';
import { Devvit, SettingScope } from '@devvit/public-api';
import express from 'express';
import { createServer, getServerPort } from '@devvit/server';
import { Logger } from './Logger';
import { createPost } from './core/post';
import { CONFIG } from '../shared/constants';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes/api';
import { hydrateGeminiKeyFromSettings } from './services/GeminiService';

// App-level secret for Gemini key; configured via Devvit settings
Devvit.addSettings({
    type: 'string',
    name: 'gemini-api-key',
    label: 'Gemini API Key',
    scope: SettingScope.App,
    isSecret: true,
});

// Configure Devvit for HTTP access and media
Devvit.configure({
    http: true,
    redditAPI: true,
    redis: false,
    media: true,
});

// Programmatic moderator menu: Create Daily Quiz Post
try {
    Devvit.addMenuItem({
        label: 'Create Daily Quiz Post',
        location: 'subreddit',
        forUserType: 'moderator',
        onPress: async (_event: unknown, _ctx: unknown) => {
            try {
                const ctx = _ctx as unknown;
                const ctxRec = ctx as Record<string, unknown> | undefined;
                const subredditName = ctxRec && typeof ctxRec === 'object'
                    ? String(((ctxRec.subreddit as Record<string, unknown> | undefined)?.name as string) || (ctxRec.subredditName as string) || process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT)
                    : (process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT);
                const post = await createPost(subredditName);
                try {
                    type UIShape = { showToast?: (m: string) => void } | undefined;
                    const ui = ctxRec && typeof ctxRec === 'object' && typeof ctxRec['ui'] === 'object' ? (ctxRec['ui'] as UIShape) : undefined;
                    ui?.showToast?.(`Post created: ${post?.id ?? 'unknown'}`);
                } catch {/* ignore UI errors */ }
                console.info('[MenuCreate] post created', post?.id);
            } catch (err) {
                try {
                    const c = _ctx as Record<string, unknown> | undefined;
                    type UIShape = { showToast?: (m: string) => void } | undefined;
                    const ui = c && typeof c['ui'] === 'object' ? (c['ui'] as UIShape) : undefined;
                    ui?.showToast?.('Failed to create post');
                } catch {/* ignore */ }
                console.error('[MenuCreate] createPost failed', err);
            }
        }
    });
} catch (e) {
    // Non-fatal: addMenuItem may not be available in some runtimes
    Logger.info('[DevvitMenu] addMenuItem unavailable or failed to register', e);
}

// Try to load secrets from Devvit settings at startup (non-blocking)
hydrateGeminiKeyFromSettings();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Mount API Routes
app.use('/api', apiRouter);

// 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const server = createServer(app);
const port = getServerPort();
server.listen(port, () => {
    console.log(`Server started on port: ${port}`);
    console.log('Environment:', CONFIG.INTERNAL.BUILD_ENV);
});
