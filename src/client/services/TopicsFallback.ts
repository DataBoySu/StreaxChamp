// Fallback topics fetch via server REST endpoint to avoid Firestore SDK CSP violations.
export interface FallbackTopic {
  title: string;
  slug: string;
  sources?: string[];
}

export async function fetchTopicsFallback(): Promise<FallbackTopic[]> {
  try {
    const res = await fetch('/api/topics', { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as FallbackTopic[];
  } catch (e) {
    return [];
  }
}
