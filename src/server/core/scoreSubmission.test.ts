import { expect } from 'vitest';
import { test } from '../test';
import { calculateQuizScore, parseQuizSubmission, parseShareRequest } from './scoreSubmission';

test('calculates a score from canonical answer indexes', () => {
  const result = calculateQuizScore(
    [
      { correctAnswer: 2 },
      { correctAnswer: 0 },
      { correctAnswer: 1 },
    ],
    [2, null, 3]
  );

  expect(result).toEqual({ score: 1, totalQuestions: 3 });
});

test('calculates a score from canonical answer text', () => {
  const result = calculateQuizScore(
    [
      { answers: ['A', 'B', 'C', 'D'], correctAnswer: 'C' },
      { answers: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    ],
    [2, 1]
  );

  expect(result).toEqual({ score: 1, totalQuestions: 2 });
});

test('rejects a client-supplied score field', () => {
  const result = parseQuizSubmission({
    quizId: '2026-09-05',
    answers: [0, 1, 2],
    score: 999,
    timeTakenMs: 1200,
  });

  expect(result.success).toBe(false);
});

test('rejects incomplete and out-of-range answer indexes', () => {
  const incomplete = parseQuizSubmission({ quizId: '2026-09-05', answers: [0, 1] });
  const outOfRange = parseQuizSubmission({
    quizId: '2026-09-05',
    answers: [0, 1, 2, 3, 4],
  });

  expect(incomplete.success).toBe(false);
  expect(outOfRange.success).toBe(false);
});

test('rejects an oversized share comment', () => {
  const result = parseShareRequest({
    postId: 't3_example',
    quizId: '2026-09-05',
    text: 'x'.repeat(501),
  });

  expect(result.success).toBe(false);
});
