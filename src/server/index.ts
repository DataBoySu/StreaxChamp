import 'dotenv/config';
import { Devvit, SettingScope } from '@devvit/public-api';
import express from 'express';
import { createServer, getServerPort } from '@devvit/server';
import { createPost } from './core/post';
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
Devvit.addMenuItem({
    label: 'Create Daily Quiz Post',
    location: 'subreddit',
    forUserType: 'moderator',
    onPress: async (_event, context) => {
        try {
            const subreddit = await context.reddit.getCurrentSubreddit();
            const post = await createPost(context.reddit, subreddit.name);
            context.ui.showToast(`Post created: ${post.id}`);
            console.info('[MenuCreate] post created', post.id);
        } catch (err) {
            context.ui.showToast('Failed to create post');
            console.error('[MenuCreate] createPost failed', err);
        }
    }
});

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
    // Server started - no logging needed in Devvit context
});
