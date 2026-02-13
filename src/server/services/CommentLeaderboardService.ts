import { FirestoreRestService } from './FirestoreRestService';
import { Logger } from '../Logger';

export interface CommentLeaderboardEntry {
    username: string;
    score: number;
    timestamp: number;
}

export class CommentLeaderboardService {
    private fs: FirestoreRestService;
    private static instance: CommentLeaderboardService;

    constructor() {
        this.fs = new FirestoreRestService();
    }

    public static getInstance(): CommentLeaderboardService {
        if (!CommentLeaderboardService.instance) {
            CommentLeaderboardService.instance = new CommentLeaderboardService();
        }
        return CommentLeaderboardService.instance;
    }


    /**
     * Ensures a leaderboard comment exists on the daily quiz post.
     * Returns the comment ID.
     */
    async ensureComment(reddit: any, postId: string, date: string): Promise<string | null> {
        try {
            // Check Firestore for existing commentId
            const meta = await this.fs.getDailyQuizMetadata(date);
            if (meta && meta.leaderboardCommentId) {
                return meta.leaderboardCommentId;
            }

            // Create new comment if missing
            const comment = await reddit.submitComment({
                id: postId,
                text: this.formatLeaderboard([], date)
            });

            // Save commentId to Firestore
            await this.fs.saveDailyQuizMetadata(date, { leaderboardCommentId: comment.id });
            Logger.info(`[CommentLeaderboard] Created new comment ${comment.id} for post ${postId}`);
            return comment.id;
        } catch (e) {
            Logger.error('[CommentLeaderboard] ensureComment failed', e);
            return null;
        }
    }

    /**
     * Updates the existing leaderboard comment with new scores.
     */
    async updateLeaderboardComment(reddit: any, commentId: string, entries: CommentLeaderboardEntry[], date: string): Promise<boolean> {
        try {
            const text = this.formatLeaderboard(entries, date);
            await reddit.editComment({
                id: commentId,
                text: text
            });
            Logger.info(`[CommentLeaderboard] Updated comment ${commentId} with ${entries.length} entries`);
            return true;
        } catch (e) {
            Logger.error('[CommentLeaderboard] updateLeaderboardComment failed', e);
            return false;
        }
    }

    private formatLeaderboard(entries: CommentLeaderboardEntry[], date: string): string {
        const header = `### 🏆 Daily Quiz Leaderboard: ${date}\n\n`;

        if (entries.length === 0) {
            return header + `Be the first to play and claim your spot!\n\n*Updated every 3 hours*`;
        }

        let table = `| Rank | Player | Score | Time |\n`;
        table += `|:---:|:---|:---:|:---:|\n`;

        const rows = entries.slice(0, 10).map((e, i) => {
            const rank = i + 1;
            const timeStr = new Date(e.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            // Bold Top 3
            const name = rank <= 3 ? `**u/${e.username}**` : `u/${e.username}`;
            const score = rank <= 3 ? `**${e.score}**` : `${e.score}`;

            return `| ${rank} | ${name} | ${score} | ${timeStr} |`;
        });

        return header + table + rows.join('\n') + `\n\n*Updated every 3 hours. Only your first shared score counts.*`;
    }
}
