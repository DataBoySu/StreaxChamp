import { useEffect, useState } from 'react';
import { firebaseQuizService } from '../services/FirebaseQuizService';

import { CONFIG } from '../../shared/constants';

export function useTopics() {
  const [topics, setTopics] = useState<Array<any>>(() => {
    // 1. Try local cache
    try {
      const raw = localStorage.getItem('streax:topics');
      if (raw) return JSON.parse(raw);
    } catch { }

    // 2. Fallback to constant defaults
    return CONFIG.GAME.PREDEFINED_TOPICS.map(t => ({
      title: t,
      slug: t.toLowerCase().replace(/\s+/g, '-')
    }));
  });
  const [loading, setLoading] = useState(false); // Assume loaded since we have defaults

  useEffect(() => {
    // Background refresh
    refresh();
  }, []);

  async function refresh() {
    try {
      const serverTopics = await firebaseQuizService.getTopics?.();
      if (serverTopics && serverTopics.length) {
        setTopics(serverTopics);
        localStorage.setItem('streax:topics', JSON.stringify(serverTopics));
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
