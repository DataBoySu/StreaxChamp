import { Router } from 'express';
import { reddit, context } from '@devvit/web/server';
import { JOB_GENERATE_DAILY, JOB_SYNC_LEADERBOARD } from '../jobs/DailyScheduler';
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

// Endpoint to Start Scheduled Jobs (One-time setup)
router.post('/menu/start-scheduler', async (_req, res) => {
    Logger.info('[Menu] Start Scheduler Triggered');
    try {
        const scheduler = (context as any).scheduler;
        await scheduler.runJob({
            name: JOB_GENERATE_DAILY,
            cron: "5 0 * * *" // 00:05 UTC Daily
        });

        await scheduler.runJob({
            name: JOB_SYNC_LEADERBOARD,
            cron: "0 */3 * * *" // Every 3 hours
        });

        res.json({ showToast: 'Daily & Sync Schedules Started!' });
    } catch (e: any) {
        Logger.error('[Menu] Scheduler Start Failed', e);
        res.status(500).json({ error: e?.message || 'Scheduler Start Failed' });
    }
});

export const internalRouter = router;
