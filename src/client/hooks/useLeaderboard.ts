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

export function useLeaderboard({ slug, limit = 25, enabled = true }: UseLeaderboardOptions) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!slug || !enabled) return;
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
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [slug, limit, enabled]);

  useEffect(() => { void fetchLeaderboard(); }, [fetchLeaderboard]);

  const submitScore = useCallback(async (slugParam: string, payload: { userKey: string; nickname: string; score: number; timeTakenMs: number }) => {
    try {
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(slugParam)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Refresh after short delay
        setTimeout(() => { void fetchLeaderboard(); }, 400);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchLeaderboard]);

  return { entries, loading, error, refresh: fetchLeaderboard, submitScore };
}
