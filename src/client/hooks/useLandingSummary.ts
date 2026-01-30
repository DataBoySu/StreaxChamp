import { useState, useCallback, useRef, useEffect } from 'react';
import { useBackoffPolling } from './useBackoffPolling';

export interface LandingTopEntry {
  slug: string;
  title: string;
  topScore: number;
  nickname: string;
  timeTakenMs: number;
}
export interface LandingPopularEntry {
  slug: string;
  title: string;
  totalCompletions: number;
}
export interface LandingSummaryData {
  top3: LandingTopEntry[];
  popular: LandingPopularEntry[];
  globalTop: { userKey: string; nickname: string; score: number }[];
  hotTopics: { slug: string; title: string }[];
}


export const useLandingSummary = (enabled: boolean, pollingEnabled = true) => {
  const [data, setData] = useState<LandingSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/landing/summary', { signal: ac.signal });
      const json = await resp.json();
      if (!resp.ok || !json.ok) {
        setError(json.error || 'FAILED');
      } else {
        const summary: LandingSummaryData = {
          top3: json.top3 || [],
          popular: json.popular || [],
          globalTop: json.globalTop || [],
          hotTopics: json.hotTopics || []
        };
        setData(summary);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch (once) if polling is disabled/not starting immediately
  useEffect(() => {
    if (enabled) void fetchSummary();
  }, [enabled, fetchSummary]);

  // Use exponential backoff polling (gated by pollingEnabled)
  const { reset } = useBackoffPolling(fetchSummary, {
    enabled: enabled && pollingEnabled,
    initialInterval: 30000,
    maxInterval: 60000,
    backoffMultiplier: 1.5,
  });

  return { data, loading, error, refresh: reset };
};
