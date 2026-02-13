import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { TopicLeaderboardService } from '../services/TopicLeaderboardService';
import { LeaderboardService } from '../services/LeaderboardService';

export class InMemoryLeaderboardController {

    static async submitScore(req: Request, res: Response): Promise<void> {
        const { slug } = req.params;
        const safeSlug = String(slug); // Ensure string
        const { userKey, nickname, score, timeTakenMs } = req.body;

        if (!safeSlug || !nickname) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // DAILY BRANCH: Daily quizzes have their own submission path in QuizController
        if (safeSlug.startsWith('daily:')) {
            res.status(400).json({ error: 'Daily scores must be submitted via /api/quiz/daily/submit' });
            return;
        }

        try {
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(safeSlug);

            if (topic && topic.activeQuizId) {
                // TOPIC BRANCH: Use TopicLeaderboardService
                const topicSvc = new TopicLeaderboardService();
                const result = await topicSvc.submitScore({
                    slug: safeSlug,
                    quizId: topic.activeQuizId,
                    userId: String(userKey || nickname),
                    nickname,
                    score: Number(score || 0),
                    submittedAt: new Date().toISOString()
                });
                res.json({ ok: result.accepted, reason: result.reason });
                return;
            }

            // FALLBACK / CUSTOM BRANCH: Use persistent LeaderboardService
            const svc = new LeaderboardService();
            if (safeSlug.startsWith('post:')) {
                const postId = safeSlug.replace('post:', '');
                await svc.submitRolling(postId, {
                    userKey: String(userKey || nickname),
                    nickname,
                    score: Number(score || 0),
                    timeTakenMs: Number(timeTakenMs || 0)
                });
            } else {
                await svc.submit(safeSlug, {
                    userKey: String(userKey || nickname),
                    nickname,
                    score: Number(score || 0),
                    timeTakenMs: Number(timeTakenMs || 0)
                });
            }
            res.json({ ok: true });
        } catch (e) {
            console.error('[InMemoryLeaderboard] Submit failed', e);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    }

    static async getLeaderboard(req: Request, res: Response): Promise<void> {
        const { slug } = req.params;
        const safeSlug = String(slug);

        // DAILY BRANCH: Read from persistent daily leaderboard
        if (safeSlug.startsWith('daily:')) {
            try {
                const fs = new FirestoreRestService();
                const date = safeSlug.replace('daily:', '');
                const raw = await fs.getQuizLeaderboard(date, 10);
                const entries = raw.map((e: any) => ({
                    username: e.nickname,
                    score: e.score,
                    timestamp: new Date(e.completedAt).getTime(),
                    timeTakenMs: 0,
                    userKey: e.userKey
                }));
                res.json({ entries });
                return;
            } catch (e) {
                console.error('[InMemoryLeaderboard] Daily fetch failed', e);
                res.status(500).json({ error: 'Failed to fetch daily leaderboard' });
                return;
            }
        }

        try {
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(safeSlug);

            if (topic && topic.activeQuizId) {
                // TOPIC BRANCH: Use TopicLeaderboardService
                const topicSvc = new TopicLeaderboardService();
                const raw = await topicSvc.getLeaderboard(safeSlug, topic.activeQuizId, 10);
                const entries = raw.map((e: any) => ({
                    username: e.nickname,
                    score: e.score,
                    timestamp: new Date(e.submittedAt).getTime(),
                    timeTakenMs: 0,
                    userKey: e.userId
                }));
                res.json({ entries });
                return;
            }

            // FALLBACK / CUSTOM BRANCH: Use persistent LeaderboardService
            const svc = new LeaderboardService();
            let raw: any[] = [];
            if (safeSlug.startsWith('post:')) {
                const postId = safeSlug.replace('post:', '');
                raw = await svc.listRolling(postId);
            } else {
                raw = await svc.list(safeSlug);
            }

            const entries = raw.map(e => ({
                username: e.nickname,
                score: e.score,
                timestamp: new Date(e.submittedAt).getTime(),
                timeTakenMs: e.timeTakenMs || 0,
                userKey: e.userKey
            }));

            res.json({ entries });
        } catch (e) {
            console.error('[InMemoryLeaderboard] Fetch failed', e);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }
}
