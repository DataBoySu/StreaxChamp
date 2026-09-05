import { afterEach, expect, vi } from 'vitest';
import { test } from '../test';
import { FirestoreRestService } from './FirestoreRestService';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('creates a daily leaderboard entry with an atomic create request', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  const service = new FirestoreRestService('test-project');
  const created = await service.saveQuizLeaderboardEntry({
    date: '2026-09-05',
    userKey: 'testuser',
    nickname: 'Test User',
    score: 4,
    completedAt: '2026-09-05T10:00:00.000Z',
  });

  expect(created).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/daily-quizzes/2026-09-05/leaderboard?documentId=testuser'
  );
  expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
});

test('reports an existing leaderboard entry as a replay', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 409 })));

  const service = new FirestoreRestService('test-project');
  const created = await service.saveQuizLeaderboardEntry({
    date: '2026-09-05',
    userKey: 'testuser',
    nickname: 'Test User',
    score: 4,
    completedAt: '2026-09-05T10:00:00.000Z',
  });

  expect(created).toBe(false);
});

test('throws when Firestore rejects a leaderboard write', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status: 403 })));

  const service = new FirestoreRestService('test-project');

  await expect(
    service.saveQuizLeaderboardEntry({
      date: '2026-09-05',
      userKey: 'testuser',
      nickname: 'Test User',
      score: 4,
      completedAt: '2026-09-05T10:00:00.000Z',
    })
  ).rejects.toThrow('Firestore leaderboard write failed: 403');
});
