// REST-only topic service for Devvit environment (no Firebase SDK usage).
// Provides a minimal subset used by TopicSelector.

export interface TopicDoc {
  id: string;
  name: string;
  createdAt: number;
  slug?: string;
  urls?: Record<string, string | string[]>; // key:value mapping of named sources to url or urls
  hasQuiz?: boolean;
  lastQuizDate?: string | null;
  status?: 'ready' | 'generating' | 'stale' | 'error';
  playCount?: number | undefined; // optional metric for highlighting popular topics
}

/** Fetch topics once via REST. */
async function fetchTopicsOnce(): Promise<TopicDoc[]> {
  try {
    const res = await fetch('/api/topics', { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`/api/topics failed: ${res.status}`);
    const list = (await res.json()) as Array<{ title: string; slug: string; sources?: string[]; playCount?: number }>;
    const mapped: TopicDoc[] = list.map((t) => ({
      id: t.slug,
      name: t.title,
      createdAt: Date.now(),
      slug: t.slug,
      urls: (t.sources || []).reduce<Record<string, string>>((acc, url, i) => { acc[`src${i + 1}`] = url; return acc; }, {}),
      hasQuiz: false,
      status: 'ready',
      playCount: typeof t.playCount === 'number' ? t.playCount : undefined,
    }));
    console.log('[FirebaseTopics] fetched topics count=', mapped.length);
    return mapped;
  } catch (e) {
    console.error('[FirebaseTopics] fetch failed', e);
    return [];
  }
}

/** Subscribe (one-shot now) to topics; returns unsubscribe (no-op). */
export function subscribeTopics(
  onUpdate: (topics: TopicDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  void fetchTopicsOnce().then(onUpdate).catch((e) => { if (onError) onError(e as Error); });
  return () => {};
}

/** Create a topic through backend generation endpoint (Gemini + save). */
export async function createTopic(name: string, _urls: Record<string, string | string[]> = {}) {
  const formatted = name.trim();
  if (!formatted) throw new Error('Name required');
  const resp = await fetch('/api/topics/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: formatted })
  });
  if (!resp.ok) throw new Error('Generate failed: ' + resp.status);
  const data = await resp.json();
  console.log('[FirebaseTopics] created topic', data.slug);
  return data;
}

export default {
  subscribeTopics,
  createTopic,
};
