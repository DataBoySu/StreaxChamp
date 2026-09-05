import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';
import { generateUnifiedContent, GeneratedQuizQuestion } from '../services/GeminiService';
import { slugify, toTitleCase } from '../utils/textUtils';
import { AppError } from '../utils/AppError';
import { CacheService } from '../services/CacheService';
import { reddit } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

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
            const { topic } = req.body || {};
            if (!topic || typeof topic !== 'string') {
                return res.status(400).json({ error: 'Topic is required' });
            }

            // 0. CHECK RATE LIMITS
            const { RateLimitService } = await import('../services/RateLimitService');

            const username = await reddit.getCurrentUsername();
            if (!username) {
                return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
            }

            // Bypass for Developer
            const isDev = CONFIG.DEV.USERNAMES.includes(username);

            if (!isDev) {
                const limitCheck = await RateLimitService.checkLimit(username);

                if (!limitCheck.allowed) {
                    const isGlobal = limitCheck.reason === 'global';
                    const message = isGlobal ? CONFIG.ERRORS.LIMIT_REACHED.GLOBAL : CONFIG.ERRORS.LIMIT_REACHED.USER;

                    return res.status(429).json({
                        error: message,
                        limitReached: true,
                        reason: limitCheck.reason, // 'user' or 'global'
                        code: 'LIMIT_REACHED',
                        robotDialogue: "Rest now, adventurer. The forges need to cool down. You've forged enough today."
                    });
                }
            } else {
                Logger.info(`[Generate] 🛡️ Dev bypass active for ${username}`);
            }

            const fs = new FirestoreRestService();
            Logger.info('[Generate] starting atomic pipeline', { input: topic, username });

            // ═══════════════════════════════════════════════════════════════
            // PHASE 1: GENERATE & VALIDATE (100% IN-MEMORY, NO API CALLS)
            // ═══════════════════════════════════════════════════════════════

            let topicData: any, quizData: any, model: string, latencyMs: number;
            try {
                const generated = await generateUnifiedContent(topic, { isDev });
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
            const quizId = new Date().toISOString(); // Unique Quiz ID


            // Prepare quiz payload with correctAnswer validation
            const questions: GeneratedQuizQuestion[] = quizData.questions.map((q: any, idx: number) => {
                let correctIdx: number;

                // Gemini should now return a numeric index (0-3) directly
                if (typeof q.correctAnswer === 'number') {
                    correctIdx = q.correctAnswer;

                    // Validate range
                    if (correctIdx < 0 || correctIdx > 3) {
                        const errorMsg = `[Generate] Q${idx + 1}: correctAnswer index ${correctIdx} is out of bounds (must be 0-3)`;
                        Logger.error(errorMsg);
                        throw new Error(`Invalid quiz data: ${errorMsg}`);
                    }
                } else if (typeof q.correctAnswer === 'string') {
                    // Fallback: Legacy support for string-based answers (A/B/C/D or exact match)
                    // This can be removed after confirming all new quizzes use numeric format
                    const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    const letterIdx = answerMap[q.correctAnswer.toUpperCase()];

                    if (letterIdx !== undefined) {
                        correctIdx = letterIdx;
                        Logger.warn(`[Generate] Q${idx + 1}: Using legacy letter format. Update prompt to return numeric index.`);
                    } else {
                        // Try exact match in options
                        const normalize = (str: string) => str.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
                        correctIdx = q.options.findIndex((opt: string) =>
                            opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                        );

                        if (correctIdx === -1) {
                            const normalizedAnswer = normalize(q.correctAnswer);
                            correctIdx = q.options.findIndex((opt: string) =>
                                normalize(opt) === normalizedAnswer
                            );
                        }

                        if (correctIdx === -1) {
                            const errorMsg = `[Generate] Q${idx + 1}: correctAnswer "${q.correctAnswer}" not found in options: [${q.options.join(', ')}]`;
                            Logger.error(errorMsg);
                            throw new Error(`Invalid quiz data: ${errorMsg}`);
                        }

                        Logger.warn(`[Generate] Q${idx + 1}: Had to match string answer. Prompt should return numeric index.`);
                    }
                } else {
                    const errorMsg = `[Generate] Q${idx + 1}: correctAnswer has invalid type: ${typeof q.correctAnswer}`;
                    Logger.error(errorMsg);
                    throw new Error(`Invalid quiz data: ${errorMsg}`);
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
                quizId: quizId,

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
                requestedBy: username,
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
                savedQuiz = await fs.saveTopicQuiz(slug, quizId, quizPayload);
                Logger.db(`[Generate] ✓ Quiz saved for "${title}"`, { saved: !!savedQuiz, quizId });

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

            // Update activeQuizId and increment version
            try {
                await fs.promoteTopicQuiz(slug, quizId);
                Logger.db('[Generate] ✓ Topic promoted successfully', { slug, quizId });
            } catch (promoteError: any) {
                Logger.error('[Generate] Failed to promote topic', {
                    error: promoteError.message,
                    slug,
                    quizId
                });
            }


            Logger.info('[Generate] ✅ Pipeline complete', { slug, title });

            // Invalidate caches so new topic appears immediately
            const cache = CacheService.getInstance();
            await cache.del('topics_list');
            await cache.del('landing_summary');
            Logger.info('[Generate] ✓ Caches invalidated', { keys: ['topics_list', 'landing_summary'] });

            // Increment Rate Limit Counters (Only on success)
            if (!isDev) {
                const { RateLimitService } = await import('../services/RateLimitService');
                await RateLimitService.increment(username);
            }

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
