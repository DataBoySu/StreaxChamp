import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { generateUnifiedContent, GeneratedQuizPayload, GeneratedQuizQuestion } from '../services/GeminiService';
import { slugify, toTitleCase } from '../utils/textUtils';
import { AppError } from '../utils/AppError';

export class TopicController {
    static async listTopics(req: Request, res: Response) {
        try {
            const fs = new FirestoreRestService();
            const list = await fs.listTopics();
            res.json(list);
        } catch (e) {
            Logger.error('[TopicsList] error', e);
            res.status(500).json({ error: 'FAILED_TO_LIST' });
        }
    }

    static async getTopic(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            if (!slug) return res.status(400).json({ error: 'Slug required' });
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(slug);
            if (!topic) return res.status(404).json({ error: 'NOT_FOUND' });
            res.json(topic);
        } catch (e) {
            res.status(500).json({ error: 'FETCH_ERROR' });
        }
    }

    static async getTopicStatus(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            if (!slug) return res.status(400).json({ error: 'Slug required' });
            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(slug);

            if (!topic) {
                return res.json({ exists: false, hasQuiz: false });
            }

            // Check if quiz exists
            const today = new Date().toISOString().slice(0, 10);
            const quiz = await fs.getTopicQuiz(slug, today);

            res.json({
                exists: true,
                title: topic.title,
                slug: topic.slug,
                hasQuiz: !!quiz && quiz.questions?.length >= 5,
                questionCount: quiz?.questions?.length || 0,
                lastGenerated: topic.lastGenerated || null,
                lastQuizDate: topic.lastQuizDate || null,
                generationPhase: topic.generationPhase || null,
            });
        } catch (e) {
            Logger.error('Error in topic status endpoint', e);
            res.status(500).json({ error: 'Failed to get status' });
        }
    }

    static async generateTopic(req: Request, res: Response) {
        try {
            const { topic, userKey } = req.body || {};
            if (!topic || typeof topic !== 'string') return res.status(400).json({ error: 'Topic is required' });

            const fs = new FirestoreRestService();

            // 1. Call Unified Generator
            Logger.info('[Generate] starting atomic pipeline', { input: topic });
            const { topic: topicData, quiz: quizData, model, latencyMs } = await generateUnifiedContent(topic);

            const title = toTitleCase(topicData.title); // Ensure case consistency
            const slug = topicData.slug || slugify(title);
            const sources = topicData.sources;

            // 2. Save Topic (Atomic)
            const topicPayload: any = {
                title,
                slug,
                sources,
                model,
                genLatencyMs: latencyMs,
                requestedBy: userKey,
                hasQuiz: true, // Pre-generated!
                status: 'ready',
                lastQuizDate: new Date().toISOString().slice(0, 10),
                generationPhase: 'unified_complete'
            };

            const savedTopic = await fs.saveTopic(topicPayload);
            Logger.db(`[Generate] Saved Topic: "${title}"`, { saved: !!savedTopic });

            // 3. Save Quiz (Atomic - immediately after topic)
            const today = new Date().toISOString().slice(0, 10);
            const questions: GeneratedQuizQuestion[] = quizData.questions.map((q: any, idx: number) => {
                const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                const correctIdx = typeof q.correctAnswer === 'string'
                    ? (answerMap[q.correctAnswer.toUpperCase()] ?? 0)
                    : (Number(q.correctAnswer) || 0);

                return {
                    id: `q${Date.now()}-${idx}`,
                    question: String(q.question),
                    options: q.options ? q.options.map(String) : [],
                    correctAnswer: correctIdx,
                    difficulty: String(q.difficulty || 'medium'),
                    category: String(q.category || title),
                    explanation: String(q.explanation || ''),
                    createdAt: new Date().toISOString()
                };
            });

            const quizPayload: GeneratedQuizPayload = {
                questions: questions.slice(0, 5),
                metadata: {
                    generatedAt: new Date().toISOString(),
                    sourceWikis: sources.slice(0, 2),
                    version: 'v4-unified',
                    model,
                    generator: 'gemini'
                }
            };

            const savedQuiz = await fs.saveTopicQuiz(slug, today, quizPayload);
            Logger.db(`[Generate] Saved Quiz for "${title}"`, { saved: !!savedQuiz });

            res.status(200).json({ title, slug, sources, saved: !!savedTopic, provider: 'unified', model, latencyMs });

        } catch (error: any) {
            Logger.error('Error in /api/topics/generate:', error);
            const code = error instanceof AppError ? error.statusCode : 500;
            res.status(code).json({ error: error.message || 'Failed to generate topic' });
        }
    }
}
