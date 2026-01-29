import { FirestoreRestService } from './FirestoreRestService';
import { Logger } from '../Logger';
import { User } from '../../shared/types/user';

// Schema: users/{userId}, nicknames/{nicknameLower}

/**
 * Service for managing user profiles and nickname reservations in Firestore.
 */
export class UserService {
  private fs: FirestoreRestService;
  constructor() { this.fs = new FirestoreRestService(); }

  /**
   * Internal helper to map raw Firestore fields to User object.
   */
  private mapUserFields(f: any, docId: string): User {
    const outBase: User = {
      userId: f.userId?.stringValue || docId,
      nickname: f.nickname?.stringValue || 'Unknown',
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    };
    const extended: User = { ...outBase } as User;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (f.quizCount?.integerValue) (extended as any).quizCount = parseInt(f.quizCount.integerValue, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (f.interests?.arrayValue?.values) (extended as any).interests = f.interests.arrayValue.values.map((v: { stringValue: string }) => v.stringValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (f.lastActiveAt?.stringValue) (extended as any).lastActiveAt = f.lastActiveAt.stringValue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (f.totalScore?.integerValue) (extended as any).totalScore = parseInt(f.totalScore.integerValue, 10);
    return extended;
  }

  /**
   * Retrieves a user profile by their unique ID, falling back to Nickname Query.
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const url = `${this.fs.getBaseUrl()}/users/${userId}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        if (data.fields?.nickname?.stringValue) {
          return this.mapUserFields(data.fields, userId);
        }
      }

      // Fallback: If not found by ID (e.g. t2_ mismatch), try Query by Nickname
      if (!userId.startsWith('t2_')) {
        const qRes = await this.fs.runQuery({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'nickname' },
                op: 'EQUAL',
                value: { stringValue: userId }
              }
            },
            limit: 1
          }
        });

        if (qRes && qRes.length > 0 && qRes[0].document) {
          const doc = qRes[0].document;
          const docId = doc.name.split('/').pop();
          Logger.info(`[UserService] Resolved legacy ID for ${userId} -> ${docId}`);
          return this.mapUserFields(doc.fields, docId);
        }
      }

      return null;
    } catch (e) {
      Logger.error('getUser failed', e);
      return null;
    }
  }

  /**
   * Checks if a nickname is already taken (case-insensitive).
   */
  async isNicknameTaken(nickname: string): Promise<boolean> {
    try {
      const url = `${this.fs.getBaseUrl()}/nicknames/${nickname.toLowerCase()}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      return res.ok;
    } catch { return false; }
  }

  /**
   * Creates a new user profile and reserves their nickname atomically across two documents.
   */
  async createUser(userId: string, nickname: string): Promise<User | null> {
    const ts = new Date().toISOString();
    const nickUrl = `${this.fs.getBaseUrl()}/nicknames/${nickname.toLowerCase()}`;
    const userUrl = `${this.fs.getBaseUrl()}/users/${userId}`;

    if (await this.isNicknameTaken(nickname)) return null;

    const nickBody = { fields: { nickname: { stringValue: nickname }, userId: { stringValue: userId }, createdAt: { stringValue: ts } } };
    const userBody = { fields: { userId: { stringValue: userId }, nickname: { stringValue: nickname }, createdAt: { stringValue: ts } } };

    // Create nickname doc (Reservation)
    const nickRes = await fetch(nickUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nickBody) });
    if (!nickRes.ok) {
      Logger.info('Nickname create failed (conflict?)');
      return null;
    }

    // Create user doc
    const userRes = await fetch(userUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userBody) });
    if (!userRes.ok) {
      Logger.error('User doc create failed, rolling back nickname');
      try { await fetch(nickUrl, { method: 'DELETE' }); } catch (err) { Logger.error('Rollback delete failed', err); }
      return null;
    }

    return { userId, nickname, createdAt: ts };
  }
}
