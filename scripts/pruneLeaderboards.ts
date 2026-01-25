// @ts-nocheck
/**
 * Prune leaderboards older than N days.
 * NOTE: Firestore REST API cannot list subcollections directly nor perform recursive delete.
 * In production you would:
 *  1. Use Firebase Admin SDK (Node environment with service account) OR
 *  2. Maintain an index collection recording created leaderboard dates per topic.
 *
 * This stub outlines the approach and logs what WOULD be deleted.
 */
import 'dotenv/config';
import { CONFIG } from '../src/shared/constants';
// Minimal Node globals declarations for lint context if @types/node absent
declare const process: any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface LeaderboardRef { topic: string; date: string; path: string }

const DAYS_DEFAULT = 3;

async function listTopics(projectId: string): Promise<string[]> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  try {
    const res = await fetch(`${baseUrl}/topics`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (data.documents || []).map((d: any) => d.name.split('/').pop()).filter(Boolean);
  } catch { return []; }
}

// WITHOUT an index of leaderboard dates, we cannot enumerate `leaderboards` subcollections via REST.
// Strategy suggestion: maintain a document `topics/{slug}/leaderboards_index` with array of date strings.
// This stub will read that index if present, then decide which ones are stale.
async function getLeaderboardIndex(projectId: string, slug: string): Promise<string[]> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  try {
    const res = await fetch(`${baseUrl}/topics/${slug}/leaderboards_index`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const arr = data.fields?.dates?.arrayValue?.values || [];
    return arr.map((v: any) => v.stringValue).filter((s: string) => !!s);
  } catch { return []; }
}

function olderThan(dateStr: string, cutoff: Date): boolean {
  return new Date(dateStr) < cutoff;
}

async function main() {
  const projectId = process.env.FIRESTORE_PROJECT_ID || CONFIG.FIREBASE.PROJECT_ID;
  const days = parseInt(process.env.PRUNE_DAYS || '', 10) || DAYS_DEFAULT;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const topics = await listTopics(projectId);
  const deletions: LeaderboardRef[] = [];
  for (const slug of topics) {
    const dates = await getLeaderboardIndex(projectId, slug);
    for (const d of dates) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && olderThan(d, cutoff)) {
        deletions.push({ topic: slug, date: d, path: `topics/${slug}/leaderboards/${d}` });
      }
    }
  }
  // Print plan only. Real deletion would require Admin SDK (recursive delete) or manual entry deletion.
  console.log(JSON.stringify({ projectId, cutoff: cutoff.toISOString(), candidateDeletions: deletions }, null, 2));
}

main().catch((e) => { console.error('Prune script failed', e); process.exit(1); });
