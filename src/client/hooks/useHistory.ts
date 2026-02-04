import { useState, useEffect, useCallback } from 'react';

interface PlayHistoryEntry {
    username: string;
    nickname: string;
    topicSlug: string;
    topicTitle: string;
    timestamp: number;
}

interface UseHistoryReturn {
    history: PlayHistoryEntry[];
    loading: boolean;
    savePlay: (username: string, nickname: string, topicSlug: string, topicTitle: string, score: number) => Promise<void>;
    hasPlayed: (topicSlug: string, username?: string) => boolean;
    refresh: () => Promise<void>;
}

const CACHE_KEY = 'play_history_cache';
const CACHE_TTL = 120 * 1000; // 2 minutes cache

export const useHistory = (enabled = true, pollingEnabled = true): UseHistoryReturn => {
    const [history, setHistory] = useState<PlayHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = useCallback(async (force = false) => {
        if (!enabled) return;

        // Check cache first
        if (!force) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    // Use cache if fresh enough and we have data
                    if (Date.now() - timestamp < CACHE_TTL && data.length > 0) {
                        setHistory(data);
                        // Skip background refresh - let polling handle it
                        return;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        if (!history.length) setLoading(true); // Only show loading if empty
        try {
            const res = await fetch('/api/history/global');
            if (res.ok) {
                const json = await res.json();
                const historyData = json.history || [];
                setHistory(historyData);
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: historyData,
                    timestamp: Date.now()
                }));
            }
        } catch (e) {
            console.error('[useHistory] fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [enabled, history.length]);

    // Initial fetch
    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    // Auto-refresh interval (5 minutes)
    useEffect(() => {
        if (!enabled || !pollingEnabled) return;
        const interval = setInterval(() => void fetchHistory(true), 300000); // 5 minutes
        return () => clearInterval(interval);
    }, [enabled, pollingEnabled, fetchHistory]);

    // Window focus removed - caused too many requests

    const savePlay = useCallback(async (username: string, nickname: string, topicSlug: string, topicTitle: string, score: number) => {
        try {
            const quizDate = new Date().toISOString().split('T')[0];
            await fetch('/api/history/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    nickname,
                    topicSlug,
                    topicTitle,
                    quizDate,
                    score // NEW
                })
            });

            // Invalidate cache and refresh
            localStorage.removeItem(CACHE_KEY);
            await fetchHistory();
        } catch (e) {
            console.error('[useHistory] save error', e);
        }
    }, [fetchHistory]);

    const hasPlayed = useCallback((topicSlug: string, username?: string) => {
        return history.some(entry => entry.topicSlug === topicSlug && (!username || entry.username === username));
    }, [history]);

    const refresh = useCallback(async () => {
        localStorage.removeItem(CACHE_KEY);
        await fetchHistory();
    }, [fetchHistory]);

    return {
        history,
        loading,
        savePlay,
        hasPlayed,
        refresh
    };
};
