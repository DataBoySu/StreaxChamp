import { useCallback, useEffect, useState } from 'react';

export interface LeaderboardEntry {
  userKey: string;
  nickname: string;
  score: number;
  timeTakenMs: number;
  submittedAt: string;
  rank?: number;
}

interface UseLeaderboardOptions {
  slug?: string | null;
  limit?: number;
  enabled?: boolean;
}

const CACHE_TTL = 60 * 1000; // 60 seconds aggressive cache

export function useLeaderboard({ slug, limit = 25, enabled = true }: UseLeaderboardOptions) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = (leaderboardSlug: string) => `streax:leaderboard:${leaderboardSlug}`;



  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    if (!slug || !enabled) return;

    // Check cache first
    if (!forceRefresh) {
      const raw = localStorage.getItem(getCacheKey(slug));
      if (raw) {
        try {
          const { ts, data } = JSON.parse(raw);
          if (data) {
            setEntries(data);
            // If cache is fresh, stop here. If stale (>TTL), continue to fetch in background.
            if (Date.now() - ts < CACHE_TTL) return;
          }
        } catch { /* ignore */ }
      }
    }

    if (entries.length === 0) setLoading(true); // Only set loading if we have no data
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(slug)}?limit=${limit}`);
      const data = await res.json();
      if (res.ok && data.entries) {
        const mapped: LeaderboardEntry[] = data.entries.map((e: any, idx: number) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          userKey: e.userKey || '',
          nickname: e.nickname || '',
          score: e.score || 0,
          timeTakenMs: e.timeTakenMs || 0,
          submittedAt: e.submittedAt || '',
          rank: idx + 1,
        }));
        setEntries(mapped);
        // Cache with timestamp
        localStorage.setItem(getCacheKey(slug), JSON.stringify({ ts: Date.now(), data: mapped }));
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [slug, limit, enabled]);

  useEffect(() => { void fetchLeaderboard(); }, [fetchLeaderboard]);

  // Window focus revalidation
  useEffect(() => {
    const onFocus = () => void fetchLeaderboard();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchLeaderboard]);

  const submitScore = useCallback(async (slugParam: string, payload: { userKey: string; nickname: string; score: number; timeTakenMs: number; quizId?: string }) => {
    try {
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(slugParam)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Invalidate cache and force refresh
        localStorage.removeItem(getCacheKey(slugParam));
        setTimeout(() => { void fetchLeaderboard(true); }, 400);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchLeaderboard]);

  return { entries, loading, error, refresh: () => fetchLeaderboard(true), submitScore };
}
