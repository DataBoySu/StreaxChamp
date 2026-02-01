import { Logger } from '../Logger';
import { CONFIG } from '../../shared/constants';

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
  constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || CONFIG.FIREBASE.PROJECT_ID)) {
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
      } catch {/* treat as none */ }
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

  /**
   * Fetch aggregated stats from the Custom Quiz document itself.
   */
  async getQuizStats(quizId: string): Promise<{ totalPlays: number; perfectScores: number } | null> {
    try {
      // Path: user_quizzes/{quizId}
      // Note: "Custom Quizzes" are user quizzes. Hardcoded Daily Quizzes are in 'daily-quizzes' but handled differently.
      // We assume quizId passed here is a user-quiz identifier.
      const url = `${this.baseUrl}/user_quizzes/${quizId}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data?.fields || {};
      const s = f.stats?.mapValue?.fields || {};

      const totalPlays = s.totalPlays?.integerValue ? parseInt(s.totalPlays.integerValue, 10) : 0;
      const perfectScores = s.perfectPlays?.integerValue ? parseInt(s.perfectPlays.integerValue, 10) : 0;

      return { totalPlays, perfectScores };
    } catch (e) {
      Logger.error('[LeaderboardService.getQuizStats] error', e);
      return null;
    }
  }

  /**
   * Trigger an aggregation of quiz stats inside the Quiz Document.
   * Respects the AGGREGATION_INTERVAL to prevent write hotspots.
   */
  async updateQuizStats(quizId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/user_quizzes/${quizId}`;

      // 1. Read existing QUIZ doc to checking timestamp + stats
      let lastLastUpdatedAt = 0;

      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingDoc: any = await res.json();
        const f = existingDoc?.fields || {};
        const s = f.stats?.mapValue?.fields || {};

        if (s.lastUpdatedAt?.stringValue) {
          lastLastUpdatedAt = new Date(s.lastUpdatedAt.stringValue).getTime();
        }
      } else {
        // If quiz doc fails to load, we can't update it
        return;
      }

      const now = Date.now();
      const interval = CONFIG.STATS.AGGREGATION_INTERVAL_MS;

      // 2. Throttle Check
      if (now - lastLastUpdatedAt < interval) {
        return;
      }

      // 3. Source of Truth: Rolling Leaderboard
      const entries = await this.listRolling(quizId);

      const realTotalPlays = entries.length;

      // Only write if we meet the minimum plays threshold
      if (realTotalPlays < CONFIG.STATS.MIN_PLAYS) {
        return;
      }

      const realPerfectPlays = entries.filter(e => e.score === 5).length;

      // 4. Update the Quiz Document via Patch
      const body = {
        fields: {
          stats: {
            mapValue: {
              fields: {
                totalPlays: { integerValue: String(realTotalPlays) },
                perfectPlays: { integerValue: String(realPerfectPlays) },
                lastUpdatedAt: { stringValue: new Date(now).toISOString() }
              }
            }
          }
        }
      };

      await fetch(url + '?updateMask.fieldPaths=stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

    } catch (e) {
      Logger.error('[LeaderboardService.updateQuizStats] error', e);
    }
  }

  /** Increment playsCompleted in stats doc */
  async incrementCompletion(slug: string, date = this.dateString()): Promise<void> {
    try {
      const path = this.statsDocPath(slug, date);
      const url = `${this.baseUrl}/${path}`;
      // Read existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let existing: any = null;
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
  async updateQuizStats_FORCE(quizId: string, score: number, totalQuestions: number): Promise<void> {
    console.log("[STATS] FORCE update START", quizId);
    try {
      const url = `${this.baseUrl}/user_quizzes/${quizId}`;

      // 1. Read existing
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        console.error("[STATS] Failed to load quiz for stats update", res.status);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = await res.json();
      console.log("[STATS] Loaded quiz", quizId);

      const f = doc.fields || {};
      const s = f.stats?.mapValue?.fields || {};

      const prevTotal = s.totalPlays?.integerValue ? parseInt(s.totalPlays.integerValue, 10) : 0;
      const prevPerfect = s.perfectPlays?.integerValue ? parseInt(s.perfectPlays.integerValue, 10) : 0;

      const newTotal = prevTotal + 1;
      const newPerfect = prevPerfect + (score === totalQuestions ? 1 : 0);
      const nowFn = new Date().toISOString();

      const nextStats = {
        totalPlays: newTotal,
        perfectPlays: newPerfect,
        lastUpdatedAt: nowFn
      };

      console.log("[STATS] Writing stats", nextStats);

      const body = {
        fields: {
          stats: {
            mapValue: {
              fields: {
                totalPlays: { integerValue: String(newTotal) },
                perfectPlays: { integerValue: String(newPerfect) },
                lastUpdatedAt: { timestampValue: nowFn }
              }
            }
          }
        }
      };

      const writeRes = await fetch(url + '?updateMask.fieldPaths=stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log("[STATS] Firestore write response status:", writeRes.status);
      if (!writeRes.ok) {
        console.error("[STATS] Firestore write failed", await writeRes.text());
      } else {
        const json = await writeRes.json();
        console.log("[STATS] Firestore write response body:", JSON.stringify(json));
      }

    } catch (e) {
      console.error('[STATS] FORCE update error', e);
    }
  }
}
