import { FirestoreRestService } from './FirestoreRestService';
import { Logger } from '../Logger';
import { User } from '../../shared/types/user';

// Collections design:
// users/{userId} => { userId, nickname, createdAt, quizCount, interests }
// nicknames/{nicknameLower} => { userId, nickname }

export class UserService {
  private fs: FirestoreRestService;
  constructor() { this.fs = new FirestoreRestService(); }

  async getUser(userId: string): Promise<User | null> {
    try {
      // FirestoreRestService doesn't yet expose generic doc getter; reuse topic pattern via base URL fetch
      // Access underlying base URL indirectly (not exposed), fallback to dedicated helper if added later.
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
      // Build extended object with optionals
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

  async isNicknameTaken(nickname: string): Promise<boolean> {
    try {
      const url = `${this.fs.getBaseUrl()}/nicknames/${nickname.toLowerCase()}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      return res.ok;
    } catch { return false; }
  }

  async createUser(userId: string, nickname: string): Promise<User | null> {
    // Race-y: attempt to create nickname doc first; if exists, fail.
    const ts = new Date().toISOString();
  const nickUrl = `${this.fs.getBaseUrl()}/nicknames/${nickname.toLowerCase()}`;
  const userUrl = `${this.fs.getBaseUrl()}/users/${userId}`;
    // Check again existence
    if (await this.isNicknameTaken(nickname)) return null;
    const nickBody = { fields: { nickname: { stringValue: nickname }, userId: { stringValue: userId }, createdAt: { stringValue: ts } } };
    const userBody = { fields: { userId: { stringValue: userId }, nickname: { stringValue: nickname }, createdAt: { stringValue: ts } } };
    // Create nickname doc
    const nickRes = await fetch(nickUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nickBody) });
    if (!nickRes.ok) {
      Logger.info('Nickname create failed (conflict?)');
      return null;
    }
    const userRes = await fetch(userUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userBody) });
    if (!userRes.ok) {
      Logger.error('User doc create failed, rolling back nickname');
      try { await fetch(nickUrl, { method: 'DELETE' }); } catch (err) { Logger.error('Rollback delete failed', err); }
      return null;
    }
    return { userId, nickname, createdAt: ts };
  }
}
