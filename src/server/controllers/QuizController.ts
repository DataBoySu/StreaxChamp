import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { generateQuizWithGemini } from '../services/GeminiService';
import { validateGeminiKey } from '../services/GeminiService';

export class QuizController {
    static async getDailyBonus(_req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const fs = new FirestoreRestService();
            const date = new Date().toISOString().slice(0, 10);

            // 1. Try Fetch
            const existing = await fs.getDailyBonusQuestion(date);
            if (existing && Array.isArray(existing.options) && existing.options.length === 4) {
                return res.json({
                    question: existing.question,
                    options: existing.options,
                    correctIndex: Math.min(Math.max(existing.correctAnswer, 0), 3)
                });
            }

            // 2. Generate (If missing)
            // Use existing generator but grab just one question
            const gen = await generateQuizWithGemini('Ultra Obscure Interdisciplinary Trivia', ['https://en.wikipedia.org/wiki/Knowledge'], undefined);
            const q = gen.questions && gen.questions.length ? gen.questions[0] : undefined;

            if (!q) return res.json(null); // Failed to gen

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

    static async getDailyQuiz(_req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const firestoreService = new FirestoreRestService();

            // 1. Try fetching today's quiz from DB
            const quiz = await firestoreService.getTodaysQuiz();
            if (quiz) {
                // Increment a generic daily quiz play counter
                void firestoreService.incrementTopicPlayCount?.('daily-quizzes');
                return res.status(200).json(quiz);
            }

            // 2. Not found? Generate FRESH via Gemini (Strict Mode)
            Logger.db('[DailyQuiz] Cache Miss - No quiz found for today. Initiating AI generation...', { date: new Date().toISOString().slice(0, 10) });

            const generated = await generateQuizWithGemini('General Knowledge', ['https://en.wikipedia.org/wiki/General_knowledge']);

            // 3. Save to Firestore
            const saved = await firestoreService.saveTodaysQuiz({
                questions: generated.questions,
                metadata: {
                    ...generated.metadata,
                    topic: 'General Knowledge',
                    difficulty: 'mixed'
                }
            });

            if (!saved) {
                throw new Error('Failed to save generated daily quiz to Firestore');
            }

            Logger.ai('[DailyQuiz] AI Generation Successful', { topic: 'General Knowledge', questionCount: generated.questions.length });
            Logger.db('[DailyQuiz] Saving generated quiz to Firestore', { persistence: 'daily-collection' });

            // 4. Return the new quiz
            const today = new Date().toISOString().slice(0, 10);
            return res.status(200).json({
                id: today,
                questions: generated.questions,
                metadata: generated.metadata
            });

        } catch (error) {
            Logger.error('Error fetching/generating daily quiz:', error);
            res.status(500).json({ error: 'System Unavailable: Failed to load daily quiz.' });
        }
    }

    static async getTopicQuiz(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug || '');
            if (!slug) return res.status(400).json({ error: 'Slug required' });
            const fs = new FirestoreRestService();
            const today = new Date().toISOString().split('T')[0];

            // 1. Check if quiz already exists for today
            const existing = await fs.getTopicQuiz(slug, today);
            if (existing) return res.json(existing);

            // 2. Fetch topic metadata to get sources
            const topic = await fs.getTopic(slug);
            if (!topic) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });

            // 3. Generate quiz
            const generated = await generateQuizWithGemini(topic.title, topic.sources);

            // 4. Save quiz
            const success = await fs.saveTopicQuiz(slug, today, generated);
            if (!success) Logger.error('[QuizSaveFail]', { slug, today });

            res.json({ id: today, date: today, topicSlug: slug, ...generated });
        } catch (e) {
            Logger.error('[TopicQuizGen] error', e);
            res.status(500).json({ error: 'QUIZ_GEN_FAILED' });
        }
    }
}
