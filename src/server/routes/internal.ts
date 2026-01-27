import { Router } from 'express';
import { reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import { Logger } from '../Logger';

const router = Router();

// Endpoint for "Create Daily Quiz Post" menu item
// devvit.json: endpoint: "/internal/menu/create-post"
router.post('/menu/create-post', async (_req, res) => {
    Logger.info('[Menu] Create Daily Quiz Post triggered via Internal Route');

    try {
        const subreddit = await reddit.getCurrentSubreddit();
        Logger.info('[Menu] Resolved subreddit:', { name: subreddit.name });

        // Note: createPost helper uses redditClient.submitCustomPost
        const post = await createPost(reddit, subreddit.name);

        Logger.info('[Menu] Post created successfully:', { postId: post.id });

        // Devvit expects a specific UIResponse format for menu actions
        // Returning { showToast: string } is the standard pattern
        res.json({
            showToast: `Daily Quiz Post Created: ${post.id}`
        });

    } catch (e) {
        Logger.error('[Menu] Failed to create post', e);
        res.status(500).json({ error: 'Failed to create post. Check server logs.' });
    }
});

export const internalRouter = router;
