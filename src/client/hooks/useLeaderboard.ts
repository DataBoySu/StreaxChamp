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

const CACHE_TTL = 180000; // 3 minutes in ms

export function useLeaderboard({ slug, limit = 25, enabled = true }: UseLeaderboardOptions) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = (leaderboardSlug: string) => `streax:leaderboard:${leaderboardSlug}`;

  const getCachedLeaderboard = (leaderboardSlug: string): LeaderboardEntry[] | null => {
    try {
      const raw = localStorage.getItem(getCacheKey(leaderboardSlug));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.ts || !parsed.data) return null;

      // Check if expired
      if (Date.now() - parsed.ts > CACHE_TTL) {
        localStorage.removeItem(getCacheKey(leaderboardSlug));
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  };

  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    if (!slug || !enabled) return;

    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = getCachedLeaderboard(slug);
      if (cached) {
        setEntries(cached);
        return;
      }
    }

    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(slug)}/today?limit=${limit}`);
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
