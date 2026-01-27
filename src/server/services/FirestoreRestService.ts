/**
 * Firestore REST API service for Devvit server-side operations.
 * Uses HTTP fetch to interact with the Firestore REST endpoint, ensuring
 * compatibility with Devvit's non-standard Node environment.
 */
import { CONFIG } from '../../shared/constants';
import { Logger } from '../Logger';

export interface QuizData {
  id: string;
  questions: Array<{
    question: string;
    answers: string[];
    correctAnswer: string;
  }>;
  metadata: {
    generatedAt: string;
    topic: string;
    difficulty: string;
    source: string;
  };
}

export class FirestoreRestService {
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || CONFIG.FIREBASE.PROJECT_ID)) {
    this.projectId = projectId;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }

  // --- Circuit Breaker State (Global) ---
  public static dbCircuitOpen = false;
  public static dbRequestsSinceTrip = 0;
  public static dbHealingAttempted = false;
  public static readonly CIRCUIT_RETRY_THRESHOLD = 5;

  static async checkHealth(): Promise<boolean> {
    return true;
  }

  static async attemptHealing(): Promise<{ healed: boolean; final: boolean }> {
    if (!this.dbCircuitOpen) return { healed: true, final: false };
    this.dbRequestsSinceTrip++;

    if (this.dbRequestsSinceTrip >= this.CIRCUIT_RETRY_THRESHOLD) {
      this.dbCircuitOpen = false;
      this.dbRequestsSinceTrip = 0;
      this.dbHealingAttempted = false;
      return { healed: true, final: false };
    }

    if (this.dbHealingAttempted) return { healed: false, final: true };
    return { healed: false, final: false };
  }

  /**
   * Safe accessor for the constructed base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get today's quiz from Firestore using REST API
   */
  async getTodaysQuiz(): Promise<QuizData | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const documentPath = `daily-quizzes/${today}`;
      const url = `${this.baseUrl}/${documentPath}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        if (response.status === 401 || response.status === 403) return null;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseFirestoreDocument(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save today's quiz to Firestore at daily-quizzes/{date}
   */
  async saveTodaysQuiz(quiz: { questions: any[]; metadata: Record<string, any> }): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const documentPath = `daily-quizzes/${today}`;
      const url = `${this.baseUrl}/${documentPath}`;
      const nowIso = new Date().toISOString();

      const questionsValues = quiz.questions.map((q, idx) => ({
        mapValue: {
          fields: {
            id: { stringValue: q.id || `q${idx + 1}` },
            question: { stringValue: q.question },
            options: { arrayValue: { values: q.options.map((o: string) => ({ stringValue: o })) } },
            correctAnswer: { integerValue: String(q.correctAnswer ?? 0) },
            difficulty: { stringValue: q.difficulty || 'medium' },
            category: { stringValue: q.category || 'General' },
            ...(q.explanation ? { explanation: { stringValue: q.explanation } } : {}),
            createdAt: { stringValue: q.createdAt || nowIso },
          },
        },
      }));

      const body = {
        fields: {
          id: { stringValue: today },
          questions: { arrayValue: { values: questionsValues } },
          metadata: {
            mapValue: {
              fields: {
                generatedAt: { stringValue: quiz.metadata.generatedAt || nowIso },
                sourceWikis: { arrayValue: { values: (quiz.metadata.sourceWikis || []).map((s: string) => ({ stringValue: s })) } },
                version: { stringValue: quiz.metadata.version || 'v1' },
                model: { stringValue: quiz.metadata.model || 'gemini' },
                generator: { stringValue: quiz.metadata.generator || 'system' },
                topic: { stringValue: quiz.metadata.topic || 'General Knowledge' },
                difficulty: { stringValue: quiz.metadata.difficulty || 'mixed' },
                source: { stringValue: 'system' }
              },
            },
          },
          updatedAt: { stringValue: nowIso },
        },
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse Firestore document format to our QuizData format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseFirestoreDocument(doc: any): QuizData {
    const fields = doc.fields;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = fields.questions.arrayValue.values.map((questionDoc: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qFields = questionDoc.mapValue.fields as any;
      const options = qFields.options.arrayValue.values.map(
        (opt: { stringValue?: string }) => opt.stringValue || ''
      );
      const correctAnswerIndex = Number(qFields.correctAnswer?.integerValue ?? 0);

      return {
        question: String(qFields.question.stringValue),
        answers: options,
        correctAnswer: options[correctAnswerIndex],
      };
    });

    const metadataFields = fields.metadata.mapValue.fields;
    const metadata = {
      generatedAt: metadataFields.generatedAt.stringValue,
      topic: 'General Knowledge',
      difficulty: 'mixed',
      source: metadataFields.sourceWikis?.arrayValue?.values?.[0]?.stringValue || 'Wiki',
    };

    return {
      id: fields.id.stringValue,
      questions,
      metadata,
    };
  }

  /**
   * Save subreddit configuration to Firestore
   */
  async saveSubredditConfig(subredditName: string, wikiUrl: string): Promise<boolean> {
    try {
      const documentPath = `subreddit_configs/${subredditName}`;
      const url = `${this.baseUrl}/${documentPath}`;

      const body = {
        fields: {
          wikiUrl: { stringValue: wikiUrl },
          configuredAt: { stringValue: new Date().toISOString() },
          subredditName: { stringValue: subredditName },
        },
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test connection to Firestore
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test-connection`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentication required' };
      }

      return { success: response.status === 404 || response.ok };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save a topic document under topics/{slug}
   */
  async saveTopic(topic: { title: string; slug: string; sources: string[]; model?: string; genLatencyMs?: number }): Promise<boolean> {
    try {
      const documentPath = `topics/${topic.slug}`;
      const url = `${this.baseUrl}/${documentPath}`;

      const body = {
        fields: {
          id: { stringValue: topic.slug },
          title: { stringValue: topic.title },
          name: { stringValue: topic.title },
          slug: { stringValue: topic.slug },
          sources: { arrayValue: { values: topic.sources.map((s) => ({ stringValue: s })) } },
          status: { stringValue: 'ready' },
          lastGenerated: { stringValue: new Date().toISOString() },
          createdAt: { stringValue: new Date().toISOString() },
          hasQuiz: { booleanValue: false },
          ...(topic.model ? { model: { stringValue: topic.model } } : {}),
          ...(topic.genLatencyMs ? { genLatencyMs: { integerValue: String(Math.round(topic.genLatencyMs)) } } : {}),
        },
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List topics under topics/
   */
  async listTopics(): Promise<Array<{ title: string; slug: string; sources?: string[] }>> {
    try {
      const url = `${this.baseUrl}/topics`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      const data: any = await res.json();
      if (!data.documents) return [];
      return data.documents.map((d: any) => {
        const f = d.fields || {};
        const title = f.title?.stringValue || f.id?.stringValue || 'Unknown';
        const slug = f.slug?.stringValue || f.id?.stringValue || title.toLowerCase().replace(/\s+/g, '-');
        const sources = f.sources?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
        return { title, slug, sources };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get a single topic document by slug
   */
  async getTopic(slug: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const f = data.fields || {};
      let title = f.title?.stringValue || f.id?.stringValue || '';
      const sources = f.sources?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
      const status = f.status?.stringValue || null;
      const lastGenerated = f.lastGenerated?.stringValue || null;
      const generationPhase = f.generationPhase?.stringValue || null;
      if (!title) {
        title = slug.split('-').map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');
      }
      const recoveredSlug = f.slug?.stringValue || slug;
      let questions: any[] = [];
      if (f.questions?.arrayValue?.values) {
        questions = f.questions.arrayValue.values.map((q: any) => {
          const qf = q.mapValue.fields || {};
          const options = qf.options?.arrayValue?.values?.map((o: any) => o.stringValue) || [];
          const correctIdx = Number(qf.correctAnswer?.integerValue ?? 0);
          return {
            question: qf.question?.stringValue || '',
            options,
            correctAnswer: options[correctIdx] || options[0] || '',
          };
        });
      }
      const playCount = f.playCount?.integerValue ? Number(f.playCount.integerValue) : 0;
      return { title, slug: recoveredSlug, sources, status, lastGenerated, generationPhase, questions, playCount };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get a per-topic quiz document for a given date (YYYY-MM-DD)
   */
  async getTopicQuiz(slug: string, date: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/topics/${slug}/quizzes/${date}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const f = data.fields || {};
      const questions = (f.questions?.arrayValue?.values || []).map((q: any, idx: number) => {
        const qf = q.mapValue.fields || {};
        const options = (qf.options?.arrayValue?.values || []).map((o: any) => o.stringValue || '');
        const correctAnswer = Number(qf.correctAnswer?.integerValue ?? 0);
        return {
          id: qf.id?.stringValue || `q${idx + 1}`,
          question: qf.question?.stringValue || '',
          options,
          correctAnswer,
          difficulty: qf.difficulty?.stringValue || 'medium',
          category: qf.category?.stringValue || 'General',
          explanation: qf.explanation?.stringValue || '',
        };
      });
      return {
        id: f.id?.stringValue || date,
        date: f.date?.stringValue || date,
        topicSlug: f.topicSlug?.stringValue || slug,
        questions,
        metadata: (() => {
          const mf = f.metadata?.mapValue?.fields || {};
          return {
            generatedAt: mf.generatedAt?.stringValue || '',
            sourceWikis: (mf.sourceWikis?.arrayValue?.values || []).map((v: any) => v.stringValue || ''),
            version: mf.version?.stringValue || 'v1',
            model: mf.model?.stringValue || undefined,
            generator: mf.generator?.stringValue || undefined,
          };
        })(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the most recent quiz for a topic, regardless of date.
   * Useful for avoiding redundant generation.
   */
  async getLatestTopicQuiz(slug: string): Promise<any | null> {
    try {
      // Fetch without orderBy to avoid index requirement
      const url = `${this.baseUrl}/topics/${slug}/quizzes?pageSize=50`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data.documents || data.documents.length === 0) return null;

      // Sort documents by date (extracted from path) in-memory
      const sorted = data.documents.sort((a: any, b: any) => {
        const dateA = a.name.split('/').pop() || '';
        const dateB = b.name.split('/').pop() || '';
        return dateB.localeCompare(dateA); // Descending order
      });

      const latestDoc = sorted[0];
      const date = latestDoc.name.split('/').pop();
      return this.getTopicQuiz(slug, date);
    } catch (e) {
      Logger.error('[Firestore] getLatestTopicQuiz error', e);
      return null;
    }
  }

  /**
   * Save a per-topic quiz document
   */
  async saveTopicQuiz(slug: string, date: string, quiz: { questions: any[]; metadata: Record<string, any> }): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/topics/${slug}/quizzes/${date}`;
      const nowIso = new Date().toISOString();
      const questionsValues = quiz.questions.map((q, idx) => ({
        mapValue: {
          fields: {
            id: { stringValue: q.id || `q${idx + 1}` },
            question: { stringValue: q.question },
            options: { arrayValue: { values: q.options.map((o: string) => ({ stringValue: o })) } },
            correctAnswer: { integerValue: String(q.correctAnswer ?? 0) },
            difficulty: { stringValue: q.difficulty || 'medium' },
            category: { stringValue: q.category || 'General' },
            ...(q.explanation ? { explanation: { stringValue: q.explanation } } : {}),
            createdAt: { stringValue: q.createdAt || nowIso },
          },
        },
      }));
      const body = {
        fields: {
          id: { stringValue: date },
          date: { stringValue: date },
          topicSlug: { stringValue: slug },
          questions: { arrayValue: { values: questionsValues } },
          metadata: {
            mapValue: {
              fields: {
                generatedAt: { stringValue: quiz.metadata.generatedAt || nowIso },
                sourceWikis: { arrayValue: { values: (quiz.metadata.sourceWikis || []).map((s: string) => ({ stringValue: s })) } },
                version: { stringValue: quiz.metadata.version || 'v1' },
                model: { stringValue: quiz.metadata.model || 'gemini' },
                generator: { stringValue: quiz.metadata.generator || 'system' },
              },
            },
          },
        },
      };
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Patch topic fields
   */
  async patchTopic(slug: string, patch: Record<string, any>): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const fields: Record<string, any> = {};
      const updateMask: string[] = [];
      Object.entries(patch).forEach(([k, v]) => {
        if (typeof v === 'string') { fields[k] = { stringValue: v }; updateMask.push(k); }
        else if (typeof v === 'number') { fields[k] = { integerValue: String(v) }; updateMask.push(k); }
        else if (typeof v === 'boolean') { fields[k] = { booleanValue: v }; updateMask.push(k); }
      });
      fields.updatedAt = { stringValue: new Date().toISOString() };
      updateMask.push('updatedAt');
      const maskParams = updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      const res = await fetch(`${url}?${maskParams}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Increment a topic's playCount field
   */
  async incrementTopicPlayCount(slug: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const getRes = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!getRes.ok) return;
      const data: any = await getRes.json();
      const current = parseInt(data.fields?.playCount?.integerValue || '0', 10) || 0;
      const body = { fields: { playCount: { integerValue: String(current + 1) }, updatedAt: { stringValue: new Date().toISOString() } } };
      await fetch(`${url} ? updateMask.fieldPaths = playCount & updateMask.fieldPaths=updatedAt`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch { }
  }

  /**
   * Get the globally stored daily bonus question
   */
  async getDailyBonusQuestion(date: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl} /dailyBonus/${date} `;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const f = data.fields || {};
      return {
        id: date,
        question: f.question?.stringValue || '',
        options: (f.options?.arrayValue?.values || []).map((v: any) => v.stringValue || '').slice(0, 4),
        correctAnswer: Number(f.correctAnswer?.integerValue ?? 0),
        difficulty: f.difficulty?.stringValue || 'hard',
        generatedAt: f.generatedAt?.stringValue || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get user topic stats: last quiz attempted, completion status.
   */
  async getUserTopicStats(userId: string, topicSlug: string): Promise<{ lastQuizId: string | null; lastAttemptDate: string | null; isCompleted: boolean } | null> {
    try {
      const url = `${this.baseUrl}/user_stats/${userId}/topics/${topicSlug}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const f = data.fields || {};
      return {
        lastQuizId: f.lastQuizId?.stringValue || null,
        lastAttemptDate: f.lastAttemptDate?.stringValue || null,
        isCompleted: f.isCompleted?.booleanValue || false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update user topic stats.
   * Creates the document path if it doesn't exist (using nested map structures where needed if using deep patch, 
   * but here we use a flat subcollection pattern `user_stats/{uid}/topics/{slug}`).
   */
  async updateUserTopicStats(userId: string, topicSlug: string, stats: { lastQuizId?: string; lastAttemptDate?: string; isCompleted?: boolean }): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/user_stats/${userId}/topics/${topicSlug}`;
      const fields: Record<string, any> = {
        updatedAt: { stringValue: new Date().toISOString() },
      };
      const updateMask: string[] = ['updatedAt'];

      if (stats.lastQuizId !== undefined) {
        fields.lastQuizId = { stringValue: stats.lastQuizId };
        updateMask.push('lastQuizId');
      }
      if (stats.lastAttemptDate !== undefined) {
        fields.lastAttemptDate = { stringValue: stats.lastAttemptDate };
        updateMask.push('lastAttemptDate');
      }
      if (stats.isCompleted !== undefined) {
        fields.isCompleted = { booleanValue: stats.isCompleted };
        updateMask.push('isCompleted');
      }

      // If document doesn't exist, we likely need to create it. 
      // PATCH with updateMask only updates fields, but will 404 if doc doesn't exist unless we do a set or check exist.
      // However, Firestore REST 'patch' creates if missing if no 'currentDocument' precondition is set, 
      // BUT we need to ensure the parent documents exist or just use this flat structure. 
      // The current simpler approach: just PATCH. If it fails due to missing parent, we might care, 
      // but standard Firestore REST usually autos-allocates ID-based collections.

      const maskParams = updateMask.map(f => `updateMask.fieldPaths=${f}`).join('&');
      const res = await fetch(`${url}?${maskParams}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch (e) {
      Logger.error('[Firestore] updateUserTopicStats fail', e);
      return false;
    }
  }

  /**
   * Save the daily bonus question.
   */
  async saveDailyBonusQuestion(date: string, payload: { question: string; options: string[]; correctAnswer: number; difficulty?: string }): Promise<boolean> {
    try {
      const url = `${this.baseUrl} /dailyBonus/${date} `;
      const body = {
        fields: {
          id: { stringValue: date },
          question: { stringValue: payload.question },
          options: { arrayValue: { values: payload.options.slice(0, 4).map(o => ({ stringValue: o })) } },
          correctAnswer: { integerValue: String(payload.correctAnswer ?? 0) },
          difficulty: { stringValue: payload.difficulty || 'extreme' },
          generatedAt: { stringValue: new Date().toISOString() },
        },
      };
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get daily robot dialogues
   */
  async getRobotDialogues(date: string): Promise<string[] | null> {
    try {
      const url = `${this.baseUrl} /robotDialogues/${date} `;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const lines = (data.fields?.lines?.arrayValue?.values || []).map((v: any) => v.stringValue || '').filter((s: string) => s && s.trim());
      return lines.length ? lines.slice(0, 50) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save daily robot dialogues
   */
  async saveRobotDialogues(date: string, lines: string[]): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/robotDialogues/${date}`;
      const body = {
        fields: {
          id: { stringValue: date },
          lines: { arrayValue: { values: lines.slice(0, 50).map((s) => ({ stringValue: String(s) })) } },
          generatedAt: { stringValue: new Date().toISOString() },
          count: { integerValue: String(Math.min(lines.length, 50)) },
        },
      };
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Save a play history entry
   */
  async savePlayHistory(entry: {
    username: string;
    nickname: string;
    topicSlug: string;
    topicTitle: string;
    timestamp: number;
    quizDate: string;
  }): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/play_history`;
      const body = {
        fields: {
          username: { stringValue: entry.username },
          nickname: { stringValue: entry.nickname },
          topicSlug: { stringValue: entry.topicSlug },
          topicTitle: { stringValue: entry.topicTitle },
          timestamp: { integerValue: String(entry.timestamp) },
          quizDate: { stringValue: entry.quizDate },
        },
      };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch (e) {
      Logger.error('[FirestoreRest.savePlayHistory] error', e);
      return false;
    }
  }

  /**
   * Get global play history (latest N)
   */
  async getGlobalPlayHistory(limit = 15): Promise<Array<{
    username: string;
    nickname: string;
    topicSlug: string;
    topicTitle: string;
    timestamp: number;
  }>> {
    try {
      // Fetch all documents, sort client-side by timestamp
      const url = `${this.baseUrl}/play_history`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const docs = data?.documents || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = docs.map((d: any) => {
        const f = d.fields || {};
        return {
          username: f.username?.stringValue || '',
          nickname: f.nickname?.stringValue || '',
          topicSlug: f.topicSlug?.stringValue || '',
          topicTitle: f.topicTitle?.stringValue || 'Unknown Topic',
          timestamp: f.timestamp?.integerValue ? parseInt(f.timestamp.integerValue, 10) : 0,
        };
      });

      // Sort by timestamp descending (newest first)
      entries.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp);

      return entries.slice(0, limit);
    } catch (e) {
      Logger.error('[FirestoreRest.getGlobalPlayHistory] error', e);
      return [];
    }
  }
}
