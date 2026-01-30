import { useEffect, useState } from 'react';
import type { InitResponse } from '../../shared/types/api';

export const useUsername = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        if (data.type !== 'init') throw new Error('Unexpected response');
        setUsername(data.username);
        setPostId(data.postId || null);
      } catch (err) {
        console.error('Failed to fetch username', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchUsername();
  }, []);

  return { username, postId, loading };
};
