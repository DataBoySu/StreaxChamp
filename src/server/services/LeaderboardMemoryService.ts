import { Logger } from '../Logger';

export interface MemoryLeaderboardEntry {
    username: string;
    score: number;
    timestamp: number;
}

export class LeaderboardMemoryService {
    private static instance: LeaderboardMemoryService;
    private leaderboards: Map<string, MemoryLeaderboardEntry[]> = new Map();
    private readonly MAX_ENTRIES = 10;

    private constructor() { }

    public static getInstance(): LeaderboardMemoryService {
        if (!LeaderboardMemoryService.instance) {
            LeaderboardMemoryService.instance = new LeaderboardMemoryService();
        }
        return LeaderboardMemoryService.instance;
    }

    /**
     * Submit a score to the in-memory leaderboard.
     * Retains only top 10 unique users, sorted by score (desc) then timestamp (asc).
     */
    public submit(key: string, username: string, score: number): void {
        const currentEntries = this.leaderboards.get(key) || [];

        // Check if user exists
        const existingIndex = currentEntries.findIndex(e => e.username === username);
        const newEntry: MemoryLeaderboardEntry = { username, score, timestamp: Date.now() };

        if (existingIndex > -1) {
            // Update only if score is better (or equal, could update timestamp?)
            // Let's assume High Score logic: Update if new score is higher.
            const currentEntry = currentEntries[existingIndex];
            if (currentEntry && score > currentEntry.score) {
                currentEntries[existingIndex] = newEntry;
            } else {
                // If score is same, maybe we don't update? Or update timestamp? 
                // Let's keep the earlier timestamp as tie-breaker usually favors early bird.
                // So do nothing if score is <= existing.
                return;
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
        // Logger.info(`[LeaderboardMemory] Updated key=${key}, top=${currentEntries[0]?.username}:${currentEntries[0]?.score}`);
    }

    public get(key: string): MemoryLeaderboardEntry[] {
        return this.leaderboards.get(key) || [];
    }

    /**
     * Get all keys that have been updated since a given timestamp directly? 
     * Or maybe just iterate all keys for the Comment Service.
     */
    public getAllKeys(): string[] {
        return Array.from(this.leaderboards.keys());
    }
}
