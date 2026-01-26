import { useEffect, useState, useCallback, useRef } from 'react';

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
  globalTop: { slug: string; title: string; nickname: string; score: number; timeTakenMs: number }[];
  hotTopics: { slug: string; title: string }[];
  globalTotals?: { userKey: string; nickname: string; totalScore: number }[];
}

export const useLandingSummary = (enabled: boolean) => {
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
          hotTopics: json.hotTopics || [],
          globalTotals: json.globalTotals || []
        };
        setData(summary);
        // Cache hotTopics & timestamp (other fields optional) with 5 min TTL
        try {
          const cache = { ts: Date.now(), summary };
          localStorage.setItem('streax.landingSummary', JSON.stringify(cache));
        } catch {/* ignore */ }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // Immediate cached hotTopics if fresh (<5 min)
    try {
      const raw = localStorage.getItem('streax.landingSummary');
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; summary: LandingSummaryData };
        if (parsed && parsed.ts && Date.now() - parsed.ts < 5 * 60 * 1000) {
          setData(parsed.summary);
        }
      }
    } catch {/* ignore */ }
    void fetchSummary();
    const iv = setInterval(() => {
      void fetchSummary();
    }, 1500);
    return () => { abortRef.current?.abort(); clearInterval(iv); };
  }, [enabled, fetchSummary]);

  return { data, loading, error, refresh: fetchSummary };
};
