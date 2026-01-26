import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { generateQuizWithGemini } from '../services/GeminiService';
import { validateGeminiKey } from '../services/GeminiService';

/**
 * Controller for managing quizzes, including daily bonus questions and full daily/topic quizzes.
 */
export class QuizController {
    /**
     * Retrieves the daily bonus question (Extreme difficulty).
     * Attempts to fetch from Firestore first, falling back to Gemini generation.
     */
    static async getDailyBonus(_req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const fs = new FirestoreRestService();
            const date = new Date().toISOString().slice(0, 10);

            // Fetch from cache
            const existing = await fs.getDailyBonusQuestion(date);
            if (existing && Array.isArray(existing.options) && existing.options.length === 4) {
                return res.json({
                    question: existing.question,
                    options: existing.options,
                    correctIndex: Math.min(Math.max(existing.correctAnswer, 0), 3)
                });
            }

            // Generate if missing
            const gen = await generateQuizWithGemini('Ultra Obscure Interdisciplinary Trivia', ['https://en.wikipedia.org/wiki/Knowledge'], undefined);
            const q = gen.questions && gen.questions.length ? gen.questions[0] : undefined;

            if (!q) return res.json(null);

            const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
            if ((q.question || '').trim() && opts.length === 4) {
                await fs.saveDailyBonusQuestion(date, {
                    question: q.question,
                    options: opts,
                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                    difficulty: 'extreme'
                });

                return res.json({
                    question: q.question,
                    options: opts,
                    correctIndex: Math.min(Math.max(q.correctAnswer, 0), 3)
                });
            }
            return res.json(null);
        } catch (e) {
            Logger.error('[QuizBonus] Failed', e);
            res.status(500).json({ error: 'BONUS_FAIL' });
        }
    }

    /**
     * Retrieves the official daily quiz.
     * Generates a fresh set of questions via AI if none exists for today.
     */
    static async getDailyQuiz(_req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const firestoreService = new FirestoreRestService();

            const quiz = await firestoreService.getTodaysQuiz();
            if (quiz) {
                void firestoreService.incrementTopicPlayCount?.('daily-quizzes');
                return res.status(200).json(quiz);
            }

            // Cache Miss: Generate via AI
            Logger.db('[DailyQuiz] Cache Miss - Initiating AI generation...', { date: new Date().toISOString().slice(0, 10) });
            const generated = await generateQuizWithGemini('General Knowledge', ['https://en.wikipedia.org/wiki/General_knowledge']);

            const saved = await firestoreService.saveTodaysQuiz({
                questions: generated.questions,
                metadata: {
                    ...generated.metadata,
                    topic: 'General Knowledge',
                    difficulty: 'mixed'
                }
            });

            if (!saved) {
                throw new Error('Failed to save manual daily quiz');
            }

            Logger.ai('[DailyQuiz] AI Generation Successful', { topic: 'General Knowledge' });

            const todayResult = new Date().toISOString().slice(0, 10);
            return res.status(200).json({
                id: todayResult,
                questions: generated.questions,
                metadata: generated.metadata
            });

        } catch (error) {
            Logger.error('Error fetching/generating daily quiz:', error);
            res.status(500).json({ error: 'System Unavailable: Failed to load daily quiz.' });
        }
    }

    /**
     * Retrieves or generates a quiz for a specific topic.
     */
    static async getTopicQuiz(req: Request, res: Response) {
        try {
            const rawSlug = req.params.slug;
            if (!rawSlug || typeof rawSlug !== 'string') return res.status(400).json({ error: 'Slug required' });
            const slug: string = rawSlug;

            const fs = new FirestoreRestService();
            const today = new Date().toISOString().split('T')[0];

            const existing = await fs.getTopicQuiz(slug, today);
            if (existing) return res.json(existing);

            const topicBase = await fs.getTopic(slug);
            if (!topicBase) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });

            const generatedTopic = await generateQuizWithGemini(
                String(topicBase.title || 'General Knowledge'),
                Array.isArray(topicBase.sources) ? topicBase.sources : []
            );

            const successStatus = await fs.saveTopicQuiz(slug, today, generatedTopic);
            if (!successStatus) Logger.error('[QuizSaveFail]', { slug, today });

            res.json({ id: today, date: today, topicSlug: slug, ...generatedTopic });
        } catch (e) {
            Logger.error('[TopicQuizGen] error', e);
            res.status(500).json({ error: 'QUIZ_GEN_FAILED' });
        }
    }
}
