import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { generateUnifiedContent, GeneratedQuizQuestion } from '../services/GeminiService';
import { slugify, toTitleCase } from '../utils/textUtils';
import { AppError } from '../utils/AppError';
import { CacheService } from '../services/CacheService';

/**
 * Controller for managing topics, including listing, status checks, and AI-driven generation.
 */
export class TopicController {
    /**
     * Lists all available topics from Firestore.
     */
    static async listTopics(_req: Request, res: Response) {
        try {
            const cache = CacheService.getInstance();
            const cached = await cache.get('topics_list');
            if (cached) {
                return res.json(cached);
            }

            const fs = new FirestoreRestService();
            const list = await fs.listTopics();

            // Cache for 10 minutes (topics don't change THAT often)
            await cache.set('topics_list', list, 600);

            res.json(list);
        } catch (e) {
            Logger.error('[TopicsList] error', e);
            res.status(500).json({ error: 'FAILED_TO_LIST' });
        }
    }

    /**
     * Retrieves metadata for a specific topic by its slug.
     */
    static async getTopic(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug || '');
            if (!slug) return res.status(400).json({ error: 'Slug required' });

            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(slug);

            if (!topic) return res.status(404).json({ error: 'NOT_FOUND' });
            res.json(topic);
        } catch (e) {
            res.status(500).json({ error: 'FETCH_ERROR' });
        }
    }

    /**
     * Gets the current status of a topic, including whether a daily quiz is ready.
     */
    static async getTopicStatus(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug || '');
            if (!slug) return res.status(400).json({ error: 'Slug required' });

            const fs = new FirestoreRestService();
            const topic = await fs.getTopic(slug);

            if (!topic) {
                return res.json({ exists: false, hasQuiz: false });
            }

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

    /**
     * Triggers the Unified Generation Pipeline to create a new topic and its first quiz.
     */
    static async generateTopic(req: Request, res: Response) {
        try {
            const { topic, userKey } = req.body || {};
            if (!topic || typeof topic !== 'string') {
                return res.status(400).json({ error: 'Topic is required' });
            }

            const fs = new FirestoreRestService();
            Logger.info('[Generate] starting atomic pipeline', { input: topic });

            // ═══════════════════════════════════════════════════════════════
            // PHASE 1: GENERATE & VALIDATE (100% IN-MEMORY, NO API CALLS)
            // ═══════════════════════════════════════════════════════════════

            let topicData: any, quizData: any, model: string, latencyMs: number;
            try {
                const generated = await generateUnifiedContent(topic);
                topicData = generated.topic;
                quizData = generated.quiz;
                model = generated.model;
                latencyMs = generated.latencyMs;
                Logger.info('[Generate] ✓ AI generation & validation passed', {
                    questionCount: quizData.questions.length
                });
            } catch (aiError: any) {
                Logger.error('[Generate] AI generation/validation failed', {
                    error: aiError.message,
                    code: aiError.code || 'UNKNOWN'
                });
                throw aiError; // Exit early - nothing persisted
            }

            // Extract and prepare topic metadata
            const title = toTitleCase(topicData.title);
            const slug = topicData.slug || slugify(title);
            const sources = topicData.sources;
            const today = new Date().toISOString().slice(0, 10);

            // Prepare quiz payload with correctAnswer normalization
            const questions: GeneratedQuizQuestion[] = quizData.questions.map((q: any, idx: number) => {
                const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                let correctIdx: number;

                if (typeof q.correctAnswer === 'string') {
                    // Try letter mapping first
                    const letterIdx = answerMap[q.correctAnswer.toUpperCase()];
                    if (letterIdx !== undefined) {
                        correctIdx = letterIdx;
                    } else {
                        // Try exact match in options
                        correctIdx = q.options.findIndex((opt: string) =>
                            opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                        );
                        if (correctIdx === -1) {
                            Logger.warn(`[Generate] Q${idx + 1}: correctAnswer "${q.correctAnswer}" not found, defaulting to 0`);
                            correctIdx = 0;
                        }
                    }
                } else {
                    correctIdx = Number(q.correctAnswer) || 0;
                }

                return {
                    id: `q${Date.now()}-${idx}`,
                    question: String(q.question),
                    options: q.options ? q.options.map(String) : [],
                    correctAnswer: correctIdx,
                    difficulty: String(q.difficulty || 'medium'),
                    category: String(q.category || title),
                    explanation: q.explanation ? String(q.explanation) : undefined
                };
            });

            const quizPayload: any = {
                topicId: slug,
                topicSlug: slug,
                date: today,
                questions,
                totalQuestions: questions.length,
                createdAt: new Date().toISOString()
            };

            const topicPayload: any = {
                title,
                slug,
                sources,
                model,
                genLatencyMs: latencyMs,
                requestedBy: userKey,
                hasQuiz: false, // Will be set to true after quiz save succeeds
                status: 'ready',
                lastQuizDate: today,
                generationPhase: 'unified_complete'
            };

            Logger.info('[Generate] ✓ All data validated in memory', {
                slug,
                questionCount: questions.length
            });

            // ═══════════════════════════════════════════════════════════════
            // PHASE 2: PERSIST TO FIRESTORE (ONLY AFTER IN-MEMORY VALIDATION)
            // ═══════════════════════════════════════════════════════════════

            // Save topic (hasQuiz=false initially)
            let savedTopic: boolean;
            try {
                savedTopic = await fs.saveTopic(topicPayload);
                Logger.db(`[Generate] ✓ Topic saved: "${title}"`, { saved: !!savedTopic });
            } catch (topicError: any) {
                Logger.error('[Generate] Topic save failed', { error: topicError.message });
                throw AppError.dbFailure('Failed to save topic metadata');
            }

            if (!savedTopic) {
                Logger.error('[Generate] Topic save returned false', { slug });
                throw AppError.dbFailure('Topic save verification failed');
            }

            // Save quiz (since we validated everything, this should succeed)
            let savedQuiz: boolean;
            try {
                savedQuiz = await fs.saveTopicQuiz(slug, today, quizPayload);
                Logger.db(`[Generate] ✓ Quiz saved for "${title}"`, { saved: !!savedQuiz });
            } catch (quizError: any) {
                Logger.error('[Generate] Quiz save failed - DATA WAS VALIDATED', {
                    error: quizError.message,
                    slug,
                    note: 'This indicates a Firestore issue, not data quality issue'
                });
                throw AppError.dbFailure('Quiz save failed despite validation - check Firestore connection');
            }

            if (!savedQuiz) {
                Logger.error('[Generate] Quiz save returned false - DATA WAS VALIDATED', {
                    slug,
                    note: 'This indicates a Firestore issue, not data quality issue'
                });
                throw AppError.dbFailure('Quiz save verification failed - check Firestore connection');
            }

            // Update hasQuiz flag to true (quiz is confirmed saved)
            try {
                await fs.patchTopic(slug, { hasQuiz: true });
                Logger.db('[Generate] ✓ hasQuiz=true patched successfully', { slug });
            } catch (patchError: any) {
                Logger.error('[Generate] Failed to patch hasQuiz flag', {
                    error: patchError.message,
                    slug,
                    note: 'Quiz exists but flag is wrong - not critical'
                });
                // Don't throw - quiz exists, just flag is inconsistent
            }

            Logger.info('[Generate] ✅ Pipeline complete', { slug, title });

            res.status(200).json({
                title,
                slug,
                sources,
                saved: !!savedTopic,
                hasQuiz: !!savedQuiz, // Client relies on this for strictly validated UI state
                provider: 'unified',
                model,
                latencyMs
            });

        } catch (error: any) {
            Logger.error('[Generate] Error in topic generation pipeline', {
                error: error.message,
                code: error.code || 'UNKNOWN',
                stack: error.stack
            });

            // Return structured error with user-friendly messages
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(error.toJSON());
            }

            // Handle unexpected errors with fallback
            const unknownError = new AppError(
                error.message || 'Unexpected error during topic generation',
                500,
                'UNKNOWN_ERROR'
            );
            return res.status(500).json(unknownError.toJSON());
        }
    }
}
