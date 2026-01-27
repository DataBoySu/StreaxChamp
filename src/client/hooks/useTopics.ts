import { useEffect, useState } from 'react';
import { firebaseQuizService } from '../services/FirebaseQuizService';

const CACHE_KEY = 'streax:topics';
const CACHE_TTL = 600000; // 10 minutes in ms

export function useTopics() {
  const [topics, setTopics] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedTopics();
    if (cached) {
      // Cache hit - use it immediately
      setTopics(cached.data);
      setLoading(false);
      return; // Don't call API
    }

    // Cache miss - fetch from API
    refresh();
  }, []);

  function getCachedTopics(): { data: any[]; ts: number } | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.ts || !parsed.data) return null;

      // Check if expired (TTL)
      if (Date.now() - parsed.ts > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async function refresh() {
    try {
      const serverTopics = await firebaseQuizService.getTopics?.();
      if (serverTopics && serverTopics.length) {
        setTopics(serverTopics);
        // Cache with timestamp
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: serverTopics }));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function generateTopic(name: string) {
    // call server endpoint to request generation
    const resp = await firebaseQuizService.requestTopicGeneration?.(name);
    // return server response but do not mutate topics list yet; the TopicSelector will poll for readiness
    return resp;
  }

  return { topics, loading, refresh, generateTopic };
}

export default useTopics;
