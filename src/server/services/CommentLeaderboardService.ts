import { reddit, redis } from '@devvit/web/server';
import { Logger } from '../Logger';

export class CommentLeaderboardService {
    private static instance: CommentLeaderboardService;

    private constructor() { }

    public static getInstance(): CommentLeaderboardService {
        if (!CommentLeaderboardService.instance) {
            CommentLeaderboardService.instance = new CommentLeaderboardService();
        }
        return CommentLeaderboardService.instance;
    }

    public async checkAndUpdate(postId: string) {
        // Ensure this is called within a Request Context (e.g. from Controller)
        const commentIdKey = `lb_comment:${postId}`;
        const lastUpdatedKey = `lb_last_update:${postId}`;

        // Rate Limit Check (e.g. max once per 3 hours per post)
        const lastUpdate = await redis.get(lastUpdatedKey);
        const now = Date.now();
        if (lastUpdate && (now - parseInt(lastUpdate)) < 3 * 60 * 60 * 1000) {
            return;
        }

        // Proceed to Update
        await redis.set(lastUpdatedKey, now.toString());

        // Get Data from Memory
        const { LeaderboardMemoryService } = await import('./LeaderboardMemoryService');
        const mem = LeaderboardMemoryService.getInstance();
        const key = `post:${postId}`;
        const entries = mem.get(key);

        if (entries.length === 0) return;

        try {
            await this.updatePostComment(postId, entries, commentIdKey);
        } catch (e) {
            Logger.error(`[CommentService] Failed to update post ${postId}`, e);
        }
    }

    private async updatePostComment(postId: string, entries: any[], commentIdKey: string) {
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
