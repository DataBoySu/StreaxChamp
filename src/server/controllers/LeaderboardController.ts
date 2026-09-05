import { context, reddit, redis } from '@devvit/web/server';
import type { Request, Response } from 'express';
import { calculateQuizScore, parseQuizSubmission } from '../core/scoreSubmission';
import { Logger } from '../Logger';
import { CacheService } from '../services/CacheService';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { LeaderboardService } from '../services/LeaderboardService';
import { TopicLeaderboardService } from '../services/TopicLeaderboardService';

export class LeaderboardController {
  static async listGlobal(_req: Request, res: Response) {
    try {
      const cache = CacheService.getInstance();
      const cached = await cache.get('lb_global');
      if (cached) return res.json(cached);
      const fs = new FirestoreRestService();
      const list = await fs.getTopUsers(50);
      await cache.set('lb_global', list, 300);
      return res.json(list);
    } catch (error) {
      Logger.error('[Leaderboard] List global error', error);
      return res.status(500).json({ error: 'Failed' });
    }
  }

  static async submitScore(req: Request, res: Response) {
    try {
      const parsed = parseQuizSubmission(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'INVALID_SUBMISSION' });

      const username = await reddit.getCurrentUsername();
      if (!username) return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });

      const submission = parsed.data;
      const slugParam = req.params.slug;
      const slug = typeof slugParam === 'string' ? slugParam : undefined;
      const fs = new FirestoreRestService();

      if (submission.postId) {
        if (submission.postId !== context.postId) {
          return res.status(403).json({ error: 'POST_CONTEXT_MISMATCH' });
        }

        const allowed = await redis.get(`custom_post_allowlist:${submission.postId}`);
        const rawMapping = await redis.get(`post_quiz:${submission.postId}`);
        let mappedQuizId: string | null = null;
        if (rawMapping) {
          try {
            const mapping: unknown = JSON.parse(rawMapping);
            if (typeof mapping === 'object' && mapping !== null && 'quizId' in mapping && typeof mapping.quizId === 'string') {
              mappedQuizId = mapping.quizId;
            }
          } catch {
            mappedQuizId = rawMapping;
          }
        }
        if (allowed !== 'true' || mappedQuizId !== submission.quizId) {
          return res.status(403).json({ error: 'CUSTOM_QUIZ_CONTEXT_INVALID' });
        }

        const quiz = await fs.getUserQuiz(submission.quizId);
        if (!quiz) return res.status(404).json({ error: 'QUIZ_NOT_FOUND' });

        const { score, totalQuestions } = calculateQuizScore(quiz.questions, submission.answers);
        const service = new LeaderboardService();
        await service.submitRolling(submission.postId, {
          userKey: username,
          nickname: username,
          score,
          timeTakenMs: submission.timeTakenMs,
        });
        await service.updateQuizStats_FORCE(submission.postId, score, totalQuestions);
        return res.json({ ok: true, score, totalQuestions });
      }

      if (!slug || slug === 'global') return res.status(400).json({ error: 'TOPIC_REQUIRED' });
      const topic = await fs.getTopic(slug);
      if (!topic || topic.activeQuizId !== submission.quizId) {
        return res.status(409).json({ error: 'STALE_QUIZ_VERSION' });
      }

      const quiz = await fs.getTopicQuiz(slug, submission.quizId);
      if (!quiz) return res.status(404).json({ error: 'QUIZ_NOT_FOUND' });

      const { score, totalQuestions } = calculateQuizScore(quiz.questions, submission.answers);
      const topicService = new TopicLeaderboardService();
      const result = await topicService.submitScore({
        slug,
        quizId: submission.quizId,
        userId: username,
        nickname: username,
        score,
        submittedAt: new Date().toISOString(),
      });
      if (!result.accepted) {
        if (result.reason === 'already_played') return res.status(403).json({ error: 'ALREADY_PLAYED' });
        return res.status(409).json({ error: 'SUBMISSION_REJECTED', reason: result.reason });
      }

      return res.json({ ok: true, score, totalQuestions });
    } catch (error) {
      Logger.error('[Leaderboard] Submit Error', error);
      return res.status(500).json({ error: 'Failed to submit score' });
    }
  }

  static async listTopicLeaderboard(req: Request, res: Response) {
    try {
      const slug = String(req.params.slug || '');
      const date = req.params.date ? String(req.params.date) : 'today';
      if (!slug) return res.status(400).json({ error: 'Slug required' });

      const cacheKey = `lb_${slug}_${date}`;
      const cache = CacheService.getInstance();
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const fs = new FirestoreRestService();
      const topic = await fs.getTopic(slug);
      if (!topic || !topic.activeQuizId) return res.json([]);

      const topicService = new TopicLeaderboardService();
      const raw = await topicService.getLeaderboard(slug, topic.activeQuizId, 10);
      const list = raw.map((entry: { nickname: string; score: number; submittedAt: string; userId: string }) => ({
        nickname: entry.nickname,
        score: entry.score,
        submittedAt: entry.submittedAt,
        userKey: entry.userId,
        timeTakenMs: 0,
      }));
      await cache.set(cacheKey, list, 10);
      return res.json(list);
    } catch (error) {
      Logger.error('[Leaderboard] List topic error', error);
      return res.status(500).json({ error: 'Failed' });
    }
  }

  static async getQuizStats(req: Request, res: Response) {
    try {
      const quizId = String(req.params.quizId || '');
      if (!quizId) return res.status(400).json({ error: 'Quiz ID required' });
      const service = new LeaderboardService();
      const stats = await service.getQuizStats(quizId);
      return res.json(stats || {});
    } catch (error) {
      Logger.error('[Leaderboard] Get Stats Error', error);
      return res.status(500).json({ error: 'Failed' });
    }
  }
}
