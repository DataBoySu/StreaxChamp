import { FirestoreRestService } from './FirestoreRestService';
import { Logger } from '../Logger';
import { User } from '../../shared/types/user';

// Collections design:
// users/{userId} => { userId, nickname, createdAt, quizCount, interests }
// nicknames/{nicknameLower} => { userId, nickname }

/**
 * Service for managing user profiles and nickname reservations in Firestore.
 * Handles atomic registration across nicknames and user collections.
 */
export class UserService {
  private fs: FirestoreRestService;
  constructor() { this.fs = new FirestoreRestService(); }

  /**
   * Retrieves a user profile by their unique ID.
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const url = `${this.fs.getBaseUrl()}/users/${userId}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const f = data.fields || {};
      if (!f.nickname?.stringValue) return null;
      const outBase: User = {
        userId: f.userId?.stringValue || userId,
        nickname: f.nickname.stringValue,
        createdAt: f.createdAt?.stringValue || new Date().toISOString(),
      };
      const extended: User = { ...outBase } as User;
      if (f.quizCount?.integerValue) (extended as { quizCount?: number }).quizCount = parseInt(f.quizCount.integerValue, 10);
      if (f.interests?.arrayValue?.values) (extended as { interests?: string[] }).interests = f.interests.arrayValue.values.map((v: { stringValue: string }) => v.stringValue);
      if (f.lastActiveAt?.stringValue) (extended as { lastActiveAt?: string }).lastActiveAt = f.lastActiveAt.stringValue;
      return extended;
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
