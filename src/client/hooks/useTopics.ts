import { useEffect, useState } from 'react';
import { firebaseQuizService } from '../services/FirebaseQuizService';

export function useTopics() {
  const [topics, setTopics] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // load cached topics from localStorage first
    const raw = localStorage.getItem('streax:topics');
    if (raw) {
      try {
        setTopics(JSON.parse(raw));
        setLoading(false);
      } catch { }
    }
    // then refresh from Firestore
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
