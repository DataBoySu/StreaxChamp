import { useCallback, useEffect, useState } from 'react';

export interface LeaderboardEntry {
    userKey: string;
    nickname: string;
    score: number;
    timeTakenMs: number;
    submittedAt: string;
    rank?: number;
}

export function useDailyLeaderboard(date: string | undefined, enabled = true) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        if (!date || !enabled) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/quiz/daily/leaderboard?date=${date}`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.entries)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapped = data.entries.map((e: any, idx: number) => ({
                    userKey: e.userKey,
                    nickname: e.nickname,
                    score: e.score,
                    timeTakenMs: 0, // Daily quiz currently doesn't store duration in leaderboard
                    submittedAt: e.submittedAt, // Correctly map submittedAt from server
                    rank: idx + 1
                }));
                setEntries(mapped);
            } else {
                setEntries([]);
            }
        } catch (e) {
            console.error('[useDailyLeaderboard] Failed to fetch', e);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [date, enabled]);

    useEffect(() => {
        void fetchLeaderboard();
    }, [fetchLeaderboard]);

    return {
        entries,
        loading,
        refresh: fetchLeaderboard
    };
}
