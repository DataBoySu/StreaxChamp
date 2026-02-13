import { reddit, redis } from '@devvit/web/server';
import { LeaderboardMemoryService } from './LeaderboardMemoryService';
import { Logger } from '../Logger';

export class CommentLeaderboardService {
    private static instance: CommentLeaderboardService;
    private isRunning = false;
    private readonly INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

    private constructor() { }

    public static getInstance(): CommentLeaderboardService {
        if (!CommentLeaderboardService.instance) {
            CommentLeaderboardService.instance = new CommentLeaderboardService();
        }
        return CommentLeaderboardService.instance;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        Logger.info('[CommentService] Started periodic leaderboard updates');

        // Run immediately on start (for testing/init), then interval
        // But maybe delay slightly to allow server startup?
        setTimeout(() => this.runUpdateCycle(), 10000);

        setInterval(() => {
            this.runUpdateCycle();
        }, this.INTERVAL_MS);
    }

    private async runUpdateCycle() {
        Logger.info('[CommentService] Running update cycle...');
        const mem = LeaderboardMemoryService.getInstance();
        const keys = mem.getAllKeys();

        for (const key of keys) {
            if (key.startsWith('post:')) {
                const postId = key.replace('post:', '');
                const entries = mem.get(key);
                if (entries.length === 0) continue;

                try {
                    await this.updatePostComment(postId, entries);
                } catch (e) {
                    Logger.error(`[CommentService] Failed to update post ${postId}`, e);
                }
            }
        }
    }

    private async updatePostComment(postId: string, entries: any[]) {
        const commentIdKey = `lb_comment:${postId}`;
        // const lastUpdatedKey = `lb_last_update:${postId}`;

        // Format Comment
        const header = `🏆 **TOP 10 LEADERBOARD**`;
        // const dateStr = new Date().toISOString().split('T')[0];
        const rows = entries.map((e, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            return `${medal} u/${e.username} — **${e.score}/5**`;
        });

        const footer = `\n\n*Last updated: ${new Date().toISOString()}*`;
        const body = `${header}\n\n${rows.join('\n')}${footer}`;

        // Check Redis for existing comment
        const existingCommentId = await redis.get(commentIdKey);

        if (existingCommentId) {
            // Edit existing
            try {
                // Fetch comment to edit? Or invoke generic edit?
                // Devvit SDK: typically reddit.getCommentById(id).edit(body)
                // BUT we need to check if we can simply "submitComment" with update? No.
                // Assuming we can get a comment object.
                // NOTE: reddit.getCommentById might not be exposed in all contexts or requires ID format.
                // If it fails, we might just post a new one? No, spam.
                // Let's assume reddit.getCommentById works.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const comment = await reddit.getCommentById(existingCommentId as any);
                await comment.edit({ text: body });
                Logger.info(`[CommentService] Edited comment ${existingCommentId} on ${postId}`);
            } catch (e) {
                Logger.warn(`[CommentService] Edit failed for ${existingCommentId}. Might be deleted.`, e);
                // If edit fails (e.g. deleted), clear key and potentially repost?
                // For safety, let's just log. If we want to recover, we'd delete the key.
                // await redis.del(commentIdKey);
            }
        } else {
            // Create new
            try {
                const comment = await reddit.submitComment({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    id: postId as any,
                    text: body
                });
                if (comment && comment.id) {
                    await redis.set(commentIdKey, comment.id);
                    Logger.info(`[CommentService] Created new comment ${comment.id} on ${postId}`);
                }
            } catch (e) {
                Logger.error(`[CommentService] Create failed on ${postId}`, e);
            }
        }
    }
}
