import { Logger } from '../Logger';
import { FirestoreRestService } from './FirestoreRestService';
import { CommentLeaderboardService } from './CommentLeaderboardService';
import { reddit } from '@devvit/web/server';

export interface MemoryLeaderboardEntry {
    username: string;
    score: number;
    timestamp: number;
    timeTakenMs?: number;
    userKey?: string;
}

export class LeaderboardMemoryService {
    private static instance: LeaderboardMemoryService;
    private leaderboards: Map<string, MemoryLeaderboardEntry[]> = new Map();
    private created: Map<string, number> = new Map(); // Track creation time for flush
    private lastRedditUpdate: Map<string, number> = new Map(); // [NEW] Track 3-hour Reddit update cycle
    private readonly MAX_ENTRIES = 10;
    private readonly FLUSH_THRESHOLD_MS = 3 * 60 * 60 * 1000; // [REFINED] 3 Hours for ALL
    private readonly REDDIT_UPDATE_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 Hours
    private readonly CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minutes
    private fs: FirestoreRestService;
    private commentService: CommentLeaderboardService;
    private constructor() {
        this.fs = new FirestoreRestService();
        this.commentService = new CommentLeaderboardService();
        setInterval(() => this.checkCycles(), this.CHECK_INTERVAL_MS);
    }

    public static getInstance(): LeaderboardMemoryService {
        if (!LeaderboardMemoryService.instance) {
            LeaderboardMemoryService.instance = new LeaderboardMemoryService();
        }
        return LeaderboardMemoryService.instance;
    }

    /**
     * Check if a user has attempted a leaderboard in the current memory buffer.
     */
    public hasAttempted(key: string, username: string): boolean {
        const entries = this.leaderboards.get(key);
        if (!entries) return false;
        return entries.some(e => e.username === username);
    }

    /**
     * Submit a score to the in-memory leaderboard.
     * Retains only top 10 unique users, sorted by score (desc) then timestamp (asc).
     */
    public submit(key: string, username: string, score: number, metadata?: { timeTakenMs?: number; userKey?: string }): void {
        // Block anonymous "Player" users from leaderboard
        if (username === 'Player') {
            Logger.info(`[LeaderboardMemory] Rejected submission from anonymous 'Player' user`);
            return;
        }

        // Initialize creation timestamp for this key if new
        if (!this.created.has(key)) {
            this.created.set(key, Date.now());
        }

        const currentEntries = this.leaderboards.get(key) || [];

        // Check if user exists
        const existingIndex = currentEntries.findIndex(e => e.username === username);
        const newEntry: MemoryLeaderboardEntry = {
            username,
            score,
            timestamp: Date.now(),
            ...(metadata?.timeTakenMs !== undefined && { timeTakenMs: metadata.timeTakenMs }),
            ...(metadata?.userKey !== undefined && { userKey: metadata.userKey })
        };

        if (existingIndex > -1) {
            // Update only if score is better (High Score logic)
            const currentEntry = currentEntries[existingIndex];
            if (currentEntry && score > currentEntry.score) {
                currentEntries[existingIndex] = newEntry;
            } else {
                return; // No update needed
            }
        } else {
            currentEntries.push(newEntry);
        }

        // Sort: Score Descending, Timestamp Ascending (Early bird gets rank)
        currentEntries.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timestamp - b.timestamp;
        });

        // Trim to Top 10
        if (currentEntries.length > this.MAX_ENTRIES) {
            currentEntries.length = this.MAX_ENTRIES; // Truncate
        }

        this.leaderboards.set(key, currentEntries);
    }

    public get(key: string): MemoryLeaderboardEntry[] {
        return this.leaderboards.get(key) || [];
    }

    public getAllKeys(): string[] {
        return Array.from(this.leaderboards.keys());
    }

    private async checkCycles() {
        const now = Date.now();

        // 1. Standard Persistence Flush (3 Hours for ALL)
        for (const [key, createdAt] of this.created.entries()) {
            if (now - createdAt >= this.FLUSH_THRESHOLD_MS) {
                await this.flush(key);
            }
        }

        // 2. [NEW] Reddit Comment Update (3 Hours)
        // Only for keys starting with 'daily:'
        for (const key of this.leaderboards.keys()) {
            if (key.startsWith('daily:')) {
                const lastUpdate = this.lastRedditUpdate.get(key) || 0;
                if (now - lastUpdate >= this.REDDIT_UPDATE_INTERVAL_MS) {
                    await this.updateRedditComment(key);
                }
            }
        }
    }

    private async updateRedditComment(key: string) {
        try {
            const date = key.split(':')[1];
            if (!date) return;

            // 1. Get Reddit/Post Info from Firestore Metadata (Comment ID is stored there)
            const meta = await this.fs.getDailyQuizMetadata(date);
            if (!meta || !meta.leaderboardCommentId) {
                Logger.info(`[LeaderboardMemory] No leaderboardCommentId for ${date}, skipping auto-update`);
                return;
            }

            // 2. Fetch latest absolute scores from Firestore (Persistent DB)
            // We fetch from Firestore because the memory buffer might have been flushed,
            // or we want the most complete top 10 from the whole day.
            const rawEntries = await this.fs.getQuizLeaderboard(date, 10);
            const entries = rawEntries.map(e => ({
                username: e.nickname || e.userKey,
                score: e.score,
                timestamp: e.completedAt ? new Date(e.completedAt).getTime() : Date.now()
            }));

            // 3. Update the comment using the CommentLeaderboardService
            // It will handle the tabular formatting.
            await this.commentService.updateLeaderboardComment(reddit, meta.leaderboardCommentId, entries, date);

            // 4. Mark update time
            this.lastRedditUpdate.set(key, Date.now());
            Logger.info(`[LeaderboardMemory] Successfully updated Reddit comment for ${key} (Entries: ${entries.length})`);

        } catch (e) {
            Logger.error(`[LeaderboardMemory] updateRedditComment failed for ${key}`, e);
        }
    }

    private async flush(key: string) {
        const entries = this.leaderboards.get(key);
        if (entries && entries.length > 0) {
            Logger.info(`[LeaderboardMemory] Flushing key=${key} to Firestore after 3 hours.`);
            const success = await this.fs.saveLeaderboard(key, entries);
            if (success) {
                // [NEW] Persist user-specific stats upon flush to avoid heavy immediate writes
                for (const entry of entries) {
                    try {
                        const userKey = entry.userKey || entry.username;
                        if (key.startsWith('topic:')) {
                            const slug = key.replace('topic:', '');
                            await this.fs.updateUserTopicStats(userKey, slug, { isCompleted: true });
                        }
                        await this.fs.incrementUserTotalScore(userKey, entry.score);
                    } catch (err) {
                        Logger.error(`[LeaderboardMemory] User stats persist failed for ${entry.username}`, err);
                    }
                }

                this.leaderboards.delete(key);
                this.created.delete(key);
            } else {
                Logger.error(`[LeaderboardMemory] Failed to flush key=${key}. Retrying next cycle.`);
            }
        } else {
            // Empty leaderboard, just cleanup
            this.leaderboards.delete(key);
            this.created.delete(key);
        }
    }
}
