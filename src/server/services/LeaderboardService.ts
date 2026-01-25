import { Logger } from '../Logger';

export interface LeaderboardEntryInput {
  userKey: string; // t2_xxx or anon_...
  nickname: string;
  score: number;
  timeTakenMs: number;
}

export interface LeaderboardEntry extends LeaderboardEntryInput {
  submittedAt: string; // ISO
}

interface FirestoreDocFields { [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Lightweight Firestore REST wrapper specifically for leaderboard and stats operations.
 * Keeps it separate from FirestoreRestService to avoid bloating that class.
 */
export class LeaderboardService {
  private readonly baseUrl: string;
  constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'streax-bot-local')) {
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  private dateString(): string {
    const iso = new Date().toISOString();
    const part = iso.split('T')[0];
    return part || iso.substring(0, 10);
  }

  private leaderboardCollection(slug: string, date: string) {
    return `topics/${slug}/leaderboards/${date}/entries`;
  }

  private statsDocPath(slug: string, date: string) {
    return `topics/${slug}/stats/${date}`;
  }

  // Rolling leaderboard (persistent, top scores regardless of day)
  private rollingCollection(slug: string) {
    // Collection path only; individual docs keyed by userKey
    return `topics/${slug}/leaderboardRolling`;
  }

  // Global totals leaderboard (sum of scores across all topics)
  private globalTotalsCollection() {
    return `leaderboardGlobal`;
  }

  /** Add to global totals (sum of best daily submissions across topics). */
  async addToGlobalTotals(entry: LeaderboardEntryInput): Promise<void> {
    try {
      const coll = this.globalTotalsCollection();
      const docPath = `${coll}/${entry.userKey}`;
      const url = `${this.baseUrl}/${docPath}`;
      // Read existing
      let existing: { totalScore: number; nickname: string } | null = null;
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const data: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
          const f: FirestoreDocFields = data?.fields || {};
          existing = {
            totalScore: f.totalScore?.integerValue ? parseInt(f.totalScore.integerValue, 10) : 0,
            nickname: f.nickname?.stringValue || entry.nickname,
          };
        }
      } catch {/* none */}
      const newTotal = (existing?.totalScore || 0) + entry.score;
      const body = {
        fields: {
          userKey: { stringValue: entry.userKey },
          nickname: { stringValue: entry.nickname },
          totalScore: { integerValue: String(newTotal) },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      };
      await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
      Logger.error('[LeaderboardService.addToGlobalTotals] error', e);
    }
  }

  /** List global totals leaderboard (top users by totalScore). */
  async listGlobalTotals(limit = 50): Promise<Array<{ userKey: string; nickname: string; totalScore: number }>> {
    try {
      const url = `${this.baseUrl}/${this.globalTotalsCollection()}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      const data: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
      const docs = data?.documents || [];
      const out = docs.map((d: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const f: FirestoreDocFields = d.fields || {};
        return {
          userKey: f.userKey?.stringValue || '',
          nickname: f.nickname?.stringValue || '',
          totalScore: f.totalScore?.integerValue ? parseInt(f.totalScore.integerValue, 10) : 0,
        };
      });
  out.sort((a: { totalScore: number }, b: { totalScore: number }) => b.totalScore - a.totalScore);
      return out.slice(0, limit);
    } catch (e) {
      Logger.error('[LeaderboardService.listGlobalTotals] error', e);
      return [];
    }
  }

  /** Submit to rolling leaderboard (upsert if better). Reuses same logic as daily without date partition */
  async submitRolling(slug: string, entry: LeaderboardEntryInput): Promise<{ ok: boolean; updated: boolean; previous?: LeaderboardEntry | null }> {
    try {
      const coll = this.rollingCollection(slug);
      const docPath = `${coll}/${entry.userKey}`; // topics/{slug}/leaderboardRolling/{userKey}
      const url = `${this.baseUrl}/${docPath}`;
      let existing: LeaderboardEntry | null = null;
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = await res.json();
          const f: FirestoreDocFields = data?.fields || {};
          existing = {
            userKey: f.userKey?.stringValue || entry.userKey,
            nickname: f.nickname?.stringValue || '',
            score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
            timeTakenMs: f.timeTakenMs?.integerValue ? parseInt(f.timeTakenMs.integerValue, 10) : 0,
            submittedAt: f.submittedAt?.stringValue || '',
          };
        }
      } catch {/* treat as none */}
      const better = !existing || (entry.score > existing.score) || (entry.score === existing.score && entry.timeTakenMs < existing.timeTakenMs);
      if (!better) return { ok: true, updated: false, previous: existing };
      const now = new Date().toISOString();
      const body = {
        fields: {
          userKey: { stringValue: entry.userKey },
            nickname: { stringValue: entry.nickname },
            score: { integerValue: String(entry.score) },
            timeTakenMs: { integerValue: String(entry.timeTakenMs) },
            submittedAt: { stringValue: now },
        },
      };
      const writeRes = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!writeRes.ok) return { ok: false, updated: false, previous: existing };
      return { ok: true, updated: true, previous: existing };
    } catch (e) {
      Logger.error('[LeaderboardService.submitRolling] error', e);
      return { ok: false, updated: false };
    }
  }

  /** List rolling leaderboard entries */
  async listRolling(slug: string): Promise<LeaderboardEntry[]> {
    try {
      const coll = this.rollingCollection(slug);
      const url = `${this.baseUrl}/${coll}`; // List collection documents
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const docs = data?.documents || [];
      const out: LeaderboardEntry[] = docs.map((d: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const f: FirestoreDocFields = d.fields || {};
        return {
          userKey: f.userKey?.stringValue || '',
          nickname: f.nickname?.stringValue || '',
          score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
          timeTakenMs: f.timeTakenMs?.integerValue ? parseInt(f.timeTakenMs.integerValue, 10) : 0,
          submittedAt: f.submittedAt?.stringValue || '',
        };
      });
      out.sort((a, b) => b.score - a.score || a.timeTakenMs - b.timeTakenMs || a.submittedAt.localeCompare(b.submittedAt));
      return out;
    } catch (e) {
      Logger.error('[LeaderboardService.listRolling] error', e);
      return [];
    }
  }

  /** Upsert leaderboard entry if better */
  async submit(slug: string, entry: LeaderboardEntryInput, date = this.dateString()): Promise<{ ok: boolean; updated: boolean; previous?: LeaderboardEntry | null }> {
    try {
      const coll = this.leaderboardCollection(slug, date);
      const docPath = `${coll}/${entry.userKey}`;
      const url = `${this.baseUrl}/${docPath}`;
      // Fetch existing
      let existing: LeaderboardEntry | null = null;
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = await res.json();
          const f: FirestoreDocFields = data?.fields || {};
          existing = {
            userKey: f.userKey?.stringValue || entry.userKey,
            nickname: f.nickname?.stringValue || '',
            score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
            timeTakenMs: f.timeTakenMs?.integerValue ? parseInt(f.timeTakenMs.integerValue, 10) : 0,
            submittedAt: f.submittedAt?.stringValue || '',
          };
        }
      } catch (e) {
        // swallow fetch errors silently; treated as no existing doc
        Logger.info('[LeaderboardService.submit] no existing doc or fetch error');
      }

      const better = !existing || (entry.score > existing.score) || (entry.score === existing.score && entry.timeTakenMs < existing.timeTakenMs);
      if (!better) {
        return { ok: true, updated: false, previous: existing };
      }
      const now = new Date().toISOString();
      const body = {
        fields: {
          userKey: { stringValue: entry.userKey },
          nickname: { stringValue: entry.nickname },
          score: { integerValue: String(entry.score) },
          timeTakenMs: { integerValue: String(entry.timeTakenMs) },
          submittedAt: { stringValue: now },
        },
      };
      const writeRes = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!writeRes.ok) return { ok: false, updated: false, previous: existing };
      return { ok: true, updated: true, previous: existing };
    } catch (e) {
      Logger.error('[LeaderboardService.submit] error', e);
      return { ok: false, updated: false };
    }
  }

  /** List leaderboard entries (sorted client-side after fetch) */
  async list(slug: string, date = this.dateString()): Promise<LeaderboardEntry[]> {
    try {
      const coll = this.leaderboardCollection(slug, date);
      const url = `${this.baseUrl}/${coll}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const docs = data?.documents || [];
      const out: LeaderboardEntry[] = docs.map((d: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const f: FirestoreDocFields = d.fields || {};
        return {
          userKey: f.userKey?.stringValue || '',
          nickname: f.nickname?.stringValue || '',
            score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
            timeTakenMs: f.timeTakenMs?.integerValue ? parseInt(f.timeTakenMs.integerValue, 10) : 0,
            submittedAt: f.submittedAt?.stringValue || '',
        };
      });
      // sort: score desc, timeTakenMs asc, submittedAt asc
      out.sort((a, b) => b.score - a.score || a.timeTakenMs - b.timeTakenMs || a.submittedAt.localeCompare(b.submittedAt));
      return out;
    } catch (e) {
      Logger.error('[LeaderboardService.list] error', e);
      return [];
    }
  }

  /** Increment playsCompleted in stats doc */
  async incrementCompletion(slug: string, date = this.dateString()): Promise<void> {
    try {
      const path = this.statsDocPath(slug, date);
      const url = `${this.baseUrl}/${path}`;
      // Read existing
      let existing: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) existing = await res.json();
      } catch (e) {
        Logger.info('[LeaderboardService.incrementCompletion] read miss');
      }
      const f = existing?.fields || {};
      const current = f.playsCompleted?.integerValue ? parseInt(f.playsCompleted.integerValue, 10) : 0;
      const body = {
        fields: {
          date: { stringValue: date },
          playsCompleted: { integerValue: String(current + 1) },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      };
      await fetch(url + '?updateMask.fieldPaths=playsCompleted&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=date', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      Logger.error('[LeaderboardService.incrementCompletion] error', e);
    }
  }
}
