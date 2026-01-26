/**
 * Firestore REST API service for Devvit server-side operations
 * Uses HTTP fetch instead of Firebase SDK to work within Devvit's constraints
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

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

export class FirestoreRestService {
  // @ts-expect-error - projectId is used in baseUrl construction
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || CONFIG.FIREBASE.PROJECT_ID)) {
    this.projectId = projectId;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  /**
   * Safe accessor for the constructed base URL.
   * Use this instead of reaching into the instance via casts.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  public async fetchWithQuotaCheck(url: string, options: RequestInit): Promise<Response> {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      Logger.info(`[Firestore] FAILED: status=${res.status} url=${url} body=${text.slice(0, 200)}`);

      if (res.status === 429 || text.toLowerCase().includes('quota') || text.toLowerCase().includes('rate limit')) {
        Logger.error(`[Firestore] QUOTA DETECTED! status=${res.status}`);
        throw new QuotaError(`Firestore Quota Exceeded (${res.status}): ${text.slice(0, 500)}`);
      }

      // Re-wrap the body so subsequent callers can read it if needed
      // (Though usually they won't if we don't return it)
      return new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
    }
    return res;
  }

  /**
   * Get today's quiz from Firestore using REST API
   */
  async getTodaysQuiz(): Promise<QuizData | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const documentPath = `daily-quizzes/${today}`;
      const url = `${this.baseUrl}/${documentPath}`;

      const response = await this.fetchWithQuotaCheck(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No quiz found for today
          return null;
        }
        if (response.status === 401 || response.status === 403) {
          // Authentication required for Firestore REST API
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse Firestore document format
      return this.parseFirestoreDocument(data);
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      // Error fetching quiz

      // Be more specific about why the connection failed
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - domain might not be allowlisted
      }

      return null;
    }
  }

  /**
   * Parse Firestore document format to our QuizData format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseFirestoreDocument(doc: any): QuizData {
    const fields = doc.fields;

    // Parse questions array - handling the actual format from our quiz generator
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
        correctAnswer: options[correctAnswerIndex], // Convert index to actual answer
      } as QuizData['questions'][0];
    });

    // Parse metadata - handling the actual format from our quiz generator
    const metadataFields = fields.metadata.mapValue.fields;
    const metadata = {
      generatedAt: metadataFields.generatedAt.stringValue,
      topic: 'Gaming', // Default topic
      difficulty: 'mixed', // Since we have multiple difficulties
      source: metadataFields.sourceWikis?.arrayValue?.values?.[0]?.stringValue || 'Gaming Wiki',
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

      // Saving config for subreddit

      const body = {
        fields: {
          wikiUrl: {
            stringValue: wikiUrl,
          },
          configuredAt: {
            stringValue: new Date().toISOString(),
          },
          subredditName: {
            stringValue: subredditName,
          },
        },
      };

      const response = await this.fetchWithQuotaCheck(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Config save response received

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Authentication required for config save
          return false;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      // Successfully saved config
      return true;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      // Error saving subreddit config
      return false;
    }
  }

  /**
   * Test connection to Firestore
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Testing connection to Firestore

      // Try a simple list operation to test connectivity
      const response = await this.fetchWithQuotaCheck(`${this.baseUrl}/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Test response received

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Authentication required - Firestore project requires authentication',
        };
      }

      if (response.status === 404) {
        // 404 is expected for non-existent documents, means connection is working
        return { success: true };
      }

      if (response.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      // Connection test error
      if (error instanceof QuotaError) {
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error - domain might not be allowlisted or network unavailable',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
          ...(typeof topic.genLatencyMs === 'number' ? { genLatencyMs: { integerValue: String(Math.round(topic.genLatencyMs)) } } : {}),
        },
      };

      const response = await this.fetchWithQuotaCheck(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return false;
    }
  }

  /**
   * List topics under topics/ by doing a naive list (REST API may require structured query)
   * For v1 we attempt to read the topics collection using documents:list
   */
  async listTopics(): Promise<Array<{ title: string; slug: string; sources?: string[] }>> {
    try {
      // Firestore REST API does not have a straightforward collection list via documents path in all cases,
      // but we attempt a list using the collection's documents endpoint.
      const url = `${this.baseUrl}/topics`;
      const res = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (error instanceof QuotaError) throw error;
      return [];
    }
  }

  /**
   * Get a single topic document by slug
   */
  async getTopic(slug: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const res = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data.fields || {};
      // Recover title/slug if earlier patch calls erased them
      let title = f.title?.stringValue || f.id?.stringValue || '';
      const sources = f.sources?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
      const status = f.status?.stringValue || null;
      const lastGenerated = f.lastGenerated?.stringValue || null;
      const generationPhase = f.generationPhase?.stringValue || null;
      // If title is missing, reconstruct from slug (capitalize words)
      if (!title) {
        title = slug
          .split('-')
          .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ''))
          .join(' ');
      }
      const recoveredSlug = f.slug?.stringValue || slug;
      // parse questions if present
      let questions: any[] = [];
      if (f.questions && f.questions.arrayValue && f.questions.arrayValue.values) {
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
      if (error instanceof QuotaError) throw error;
      return null;
    }
  }

  /**
   * Get a per-topic quiz document for a given date (YYYY-MM-DD)
   */
  async getTopicQuiz(slug: string, date: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/topics/${slug}/quizzes/${date}`;
      const res = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data.fields || {};
      // parse questions
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
    } catch (error) {
      if (error instanceof QuotaError) throw error;
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
                ...(quiz.metadata.model ? { model: { stringValue: quiz.metadata.model } } : {}),
                ...(quiz.metadata.generator ? { generator: { stringValue: quiz.metadata.generator } } : {}),
                topicSlug: { stringValue: slug },
              },
            },
          },
          uploadedAt: { stringValue: nowIso },
          integrity: {
            mapValue: {
              fields: {
                questionCount: { integerValue: String(quiz.questions.length) },
              },
            },
          },
        },
      };
      const res = await this.fetchWithQuotaCheck(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return false;
    }
  }

  /**
   * Patch topic fields (for updating status, hasQuiz, etc.)
   */
  async patchTopic(slug: string, patch: Record<string, any>): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const fields: Record<string, any> = {};
      const updateMask: string[] = [];
      // Fetch existing to preserve baseline if doc missing some core fields
      let existing: any = null;
      try {
        const existingRes = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (existingRes.ok) existing = await existingRes.json();
      } catch { }
      const existingFields = existing?.fields || {};
      const ensure = (key: string, val: any) => {
        if (!existingFields[key] && !(key in fields)) {
          if (typeof val === 'string') fields[key] = { stringValue: val }, updateMask.push(key);
          else if (typeof val === 'boolean') fields[key] = { booleanValue: val }, updateMask.push(key);
        }
      };
      Object.entries(patch).forEach(([k, v]) => {
        if (typeof v === 'string') { fields[k] = { stringValue: v }; updateMask.push(k); }
        else if (typeof v === 'number') { fields[k] = { integerValue: String(v) }; updateMask.push(k); }
        else if (typeof v === 'boolean') { fields[k] = { booleanValue: v }; updateMask.push(k); }
      });
      // Baseline invariants
      ensure('id', slug);
      // Reconstruct title/name if absent
      const readable = slug.split('-').map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
      ensure('title', readable);
      ensure('name', readable);
      ensure('slug', slug);
      // Always update updatedAt
      fields.updatedAt = { stringValue: new Date().toISOString() };
      updateMask.push('updatedAt');
      const maskParams = updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      const patchUrl = `${url}?${maskParams}`;
      const body = { fields };
      const res = await this.fetchWithQuotaCheck(patchUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return false;
    }
  }

  /**
   * Increment a topic's playCount field (creating it if absent) without altering other fields.
   * Firestore REST API lacks atomic increment here without auth; we perform a read-modify-write.
   * Best-effort; race conditions are acceptable for lightweight leaderboard highlighting.
   */
  async incrementTopicPlayCount(slug: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/topics/${slug}`;
      const getRes = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!getRes.ok) return; // Topic missing; do nothing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await getRes.json();
      const f = data.fields || {};
      const current = parseInt(f.playCount?.integerValue || '0', 10) || 0;
      const newVal = current + 1;
      // Build minimal patch
      const patchUrl = `${url}?updateMask.fieldPaths=playCount&updateMask.fieldPaths=updatedAt`;
      const body = {
        fields: {
          playCount: { integerValue: String(newVal) },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      };
      await this.fetchWithQuotaCheck(patchUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      // Silent failure acceptable for non-critical metric
    }
  }

  /**
   * Get the globally stored daily bonus question (one ultra-hard off-topic question) for a given date.
   * Path: dailyBonus/{date}
   */
  async getDailyBonusQuestion(date: string): Promise<{ id: string; question: string; options: string[]; correctAnswer: number; difficulty: string; generatedAt: string } | null> {
    try {
      const url = `${this.baseUrl}/dailyBonus/${date}`;
      const res = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data.fields || {};
      const question = f.question?.stringValue || '';
      const options = (f.options?.arrayValue?.values || []).map((v: { stringValue?: string }) => v.stringValue || '').slice(0, 4);
      const correctAnswer = Number(f.correctAnswer?.integerValue ?? 0);
      const difficulty = f.difficulty?.stringValue || 'hard';
      const generatedAt = f.generatedAt?.stringValue || new Date().toISOString();
      return { id: date, question, options, correctAnswer, difficulty, generatedAt };
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return null;
    }
  }

  /**
   * Save the daily bonus question.
   */
  async saveDailyBonusQuestion(date: string, payload: { question: string; options: string[]; correctAnswer: number; difficulty?: string }): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/dailyBonus/${date}`;
      const nowIso = new Date().toISOString();
      const body = {
        fields: {
          id: { stringValue: date },
          question: { stringValue: payload.question },
          options: { arrayValue: { values: payload.options.slice(0, 4).map(o => ({ stringValue: o })) } },
          correctAnswer: { integerValue: String(payload.correctAnswer ?? 0) },
          difficulty: { stringValue: payload.difficulty || 'extreme' },
          generatedAt: { stringValue: nowIso },
        },
      };
      const res = await this.fetchWithQuotaCheck(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return false;
    }
  }

  /**
   * Get daily robot dialogues from Firestore. Path: robotDialogues/{date}
   */
  async getRobotDialogues(date: string): Promise<string[] | null> {
    try {
      const url = `${this.baseUrl}/robotDialogues/${date}`;
      const res = await this.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data.fields || {};
      const lines = (f.lines?.arrayValue?.values || []).map((v: { stringValue?: string }) => v.stringValue || '').filter((s: string) => s && s.trim());
      return lines.length ? lines.slice(0, 50) : null;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return null;
    }
  }

  /**
   * Save daily robot dialogues (array of short strings) at robotDialogues/{date}
   */
  async saveRobotDialogues(date: string, lines: string[]): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/robotDialogues/${date}`;
      const nowIso = new Date().toISOString();
      const body = {
        fields: {
          id: { stringValue: date },
          lines: { arrayValue: { values: lines.slice(0, 50).map((s) => ({ stringValue: String(s) })) } },
          generatedAt: { stringValue: nowIso },
          count: { integerValue: String(Math.min(lines.length, 50)) },
        },
      };
      const res = await this.fetchWithQuotaCheck(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      return false;
    }
  }
}
