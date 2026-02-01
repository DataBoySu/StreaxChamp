import type { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { UserService } from '../services/UserService';
import { Logger } from '../Logger';
import { generateUnifiedContent, validateGeminiKey } from '../services/GeminiService';
import { CacheService } from '../services/CacheService';
import { reddit, redis } from '@devvit/web/server';

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
            const gen = await generateUnifiedContent('Ultra Obscure Interdisciplinary Trivia');
            const q = gen.quiz?.questions?.[0];

            if (!q) return res.json(null);

            const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
            const correctIdx = Number(q.correctAnswer) || 0;

            if ((q.question || '').trim() && opts.length === 4) {
                await fs.saveDailyBonusQuestion(date, {
                    question: q.question,
                    options: opts,
                    correctAnswer: correctIdx,
                    difficulty: 'extreme'
                });

                return res.json({
                    question: q.question,
                    options: opts,
                    correctIndex: Math.min(Math.max(correctIdx, 0), 3)
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
    static async getDailyQuiz(req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const fs = new FirestoreRestService();
            const cache = CacheService.getInstance();
            const todayStr = new Date().toISOString().slice(0, 10);

            // 0. Check for Context (Post ID specific quiz)
            // @ts-ignore
            const contextPostId = req.headers['x-devvit-post-id'] as string;
            if (contextPostId) {
                Logger.info(`[DailyQuiz] Context Mode detected: PostID=${contextPostId}`);
                const rawMapping = await redis.get(`post_quiz:${contextPostId}`);
                let mappedQuizId: string | null = null;

                if (rawMapping) {
                    try {
                        const mapping = JSON.parse(rawMapping);
                        if (mapping && mapping.quizId) {
                            mappedQuizId = mapping.quizId;
                        }
                    } catch {
                        // Legacy fallback
                        mappedQuizId = rawMapping;
                    }
                }

                if (mappedQuizId) {
                    Logger.info(`[DailyQuiz] Resolved Post Context -> QuizID=${mappedQuizId}`);
                    // Fetch that user quiz directly
                    const userQuiz = await fs.getUserQuiz(mappedQuizId);
                    if (userQuiz) {
                        return res.status(200).json(userQuiz);
                    }
                }
            }

            // 1. Resolve User & Check Stickiness
            const { userId } = await import('../context/userContext').then(m => m.getDevvitUserId(req));
            let forceQuizId: string | null = null;

            if (userId) {
                const stats = await fs.getUserTopicStats(userId, 'daily-quizzes');
                if (stats) {
                    // Logic: If previous attempt exists, wasn't today, and wasn't completed -> FORCE IT
                    const isNewDay = stats.lastAttemptDate !== todayStr;
                    if (isNewDay && !stats.isCompleted && stats.lastQuizId) {
                        forceQuizId = stats.lastQuizId;
                        Logger.info('[Daily] Forcing sticky incomplete quiz', { userId, quizId: forceQuizId });
                    }
                }
            }

            // 2. Fetch Quiz Content (Forced or Today's)
            let quizData: any = null;

            if (forceQuizId) {
                // Fetch specific past quiz (no cache for optimization yet, safe fallthrough)
                quizData = await fs.getTopicQuiz('daily-quizzes', forceQuizId);
                // Fallback: If deleted/missing, we just continue to today's quiz
            }

            if (!quizData) {
                // Standard Daily Flow - Check Cache First
                const cacheKey = `daily_quiz_${todayStr}`;
                const cached = await cache.get(cacheKey);

                if (cached) {
                    quizData = cached;
                } else {
                    // Cache Miss: DB or Gen
                    const existing = await fs.getTodaysQuiz();
                    if (existing) {
                        quizData = existing;
                        await cache.set(cacheKey, existing, 1800); // 30 mins
                        void fs.incrementTopicPlayCount?.('daily-quizzes');
                    } else {
                        // Generation (same as before)
                        Logger.db('[DailyQuiz] Cache Miss - Initiating AI generation...', { date: todayStr });
                        const generated = await generateUnifiedContent('General Knowledge');
                        // ... mapping logic ...
                        const questions = generated.quiz.questions.map((q: any) => ({
                            id: `q${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            question: q.question,
                            options: q.options,
                            correctAnswer: Number(q.correctAnswer) || 0,
                            difficulty: String(q.difficulty || 'medium'),
                            category: String(q.category || 'General'),
                            explanation: q.explanation,
                            createdAt: new Date().toISOString()
                        }));

                        const payload = {
                            questions,
                            metadata: {
                                generatedAt: new Date().toISOString(),
                                sourceWikis: generated.topic.sources,
                                version: 'v4-unified',
                                model: generated.model,
                                generator: 'gemini',
                                topic: 'General Knowledge',
                                difficulty: 'mixed'
                            }
                        };

                        await fs.saveTodaysQuiz(payload);
                        quizData = { id: todayStr, ...payload };
                        await cache.set(cacheKey, quizData, 1800);
                        Logger.ai('[DailyQuiz] AI Generation Successful');
                    }
                }
            }

            // 3. Update User Stats (Mark as Started)
            if (userId && quizData) {
                await fs.updateUserTopicStats(userId, 'daily-quizzes', {
                    lastQuizId: quizData.id || todayStr,
                    lastAttemptDate: todayStr,
                    isCompleted: false
                });
            }

            return res.status(200).json(quizData);

        } catch (error) {
            Logger.error('Error fetching/generating daily quiz:', error);
            res.status(500).json({ error: 'System Unavailable: Failed to load daily quiz.' });
        }
    }

    /**
     * Retrieves or generates a quiz for a specific topic.
     * Uses query.username or devvit userId as identity.
     */
    static async getTopicQuiz(req: Request, res: Response) {
        try {
            const rawSlug = req.params.slug;
            if (!rawSlug || typeof rawSlug !== 'string') return res.status(400).json({ error: 'Slug required' });
            const slug: string = rawSlug;
            const fs = new FirestoreRestService();
            const todayStr = new Date().toISOString().split('T')[0] || '';
            // USE USERNAME as the Primary Key (Devvit nickname)
            const queryUser = (req.query.username as string || '').trim();
            const us = new UserService();
            const realUser = queryUser ? await us.getUser(queryUser) : null;

            const effectiveUserId = queryUser || (realUser ? realUser.userId : null);
            const effectiveNickname = queryUser || (realUser ? realUser.nickname : 'Player');

            Logger.info(`[TopicQuiz] Request received for slug="${slug}"`, { userId: effectiveUserId, nickname: effectiveNickname }, 'API');

            // 2. Simplified "Global Latest with Personal Trigger" Logic
            const latest = await fs.getLatestTopicQuiz(slug);
            let quizToServe = latest;
            let shouldGenerate = false;

            if (!latest) {
                shouldGenerate = true;
            } else if (latest.date) {
                const isDifferentDay = latest.date !== todayStr;

                // Rule: "Day 2 is only generated if User has already played previous one AND its a new day"
                if (isDifferentDay) {
                    // Check if this specific user completed the current latest quiz
                    let userFinishedLatest = false;
                    if (effectiveUserId) {
                        const stats = await fs.getUserTopicStats(effectiveUserId, slug);
                        if (stats && stats.isCompleted && stats.lastQuizId === latest.id) {
                            userFinishedLatest = true;
                        }
                    }

                    if (userFinishedLatest) {
                        shouldGenerate = true;
                        Logger.info('[QuizPolicy] User finished latest content, triggering NEW generation', { userId: effectiveUserId });
                    }
                }
            }

            // Serve logic
            if (!shouldGenerate && quizToServe) {
                Logger.info(`[TopicQuiz] Serving latest quiz (${quizToServe.date})`, { userId: effectiveUserId });
                if (effectiveUserId) {
                    await fs.updateUserTopicStats(effectiveUserId, slug, {
                        lastQuizId: quizToServe.id,
                        lastAttemptDate: todayStr,
                        isCompleted: false
                    });
                }
                return res.json({ id: quizToServe.id, date: quizToServe.date, topicSlug: slug, ...quizToServe });
            }

            // Generation logic
            const topicBase = await fs.getTopic(slug);
            if (!topicBase) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });

            const generated = await generateUnifiedContent(String(topicBase.title || 'General Knowledge'));

            const questions = generated.quiz.questions.map((q: any) => ({
                id: `q${Date.now()}`,
                question: q.question,
                options: q.options,
                correctAnswer: Number(q.correctAnswer) || 0,
                difficulty: String(q.difficulty || 'medium'),
                category: String(q.category || topicBase.title || 'General'),
                explanation: q.explanation,
                createdAt: new Date().toISOString()
            }));

            const quizPayload = {
                questions: questions,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    sourceWikis: generated.topic.sources,
                    version: 'v4-unified',
                    model: generated.model,
                    generator: 'gemini'
                }
            };

            const successStatus = await fs.saveTopicQuiz(slug, todayStr, quizPayload);
            if (!successStatus) {
                Logger.error('[QuizSaveFail]', { slug, today: todayStr });
            } else {
                await fs.patchTopic(slug, { hasQuiz: true, lastGenerated: todayStr });
            }

            // Update user stats
            if (effectiveUserId) {
                await fs.updateUserTopicStats(effectiveUserId, slug, {
                    lastQuizId: todayStr,
                    lastAttemptDate: todayStr,
                    isCompleted: false
                });
            }

            res.json({ id: todayStr, date: todayStr, topicSlug: slug, ...quizPayload });
        } catch (e) {
            Logger.error('[TopicQuizGen] error', e);
            res.status(500).json({ error: 'QUIZ_GEN_FAILED' });
        }
    }
    /**
     * Creates a new user-generated quiz.
     */
    static async createUserQuiz(req: Request, res: Response) {
        try {
            const { username, topic, quiz } = req.body;
            Logger.info('[CreateUserQuiz] Request:', { username, topic, hasQuiz: !!quiz });

            if (!username || !topic || !quiz) {
                Logger.error('[CreateUserQuiz] Missing fields:', { username, topic, hasQuiz: !!quiz });
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const fs = new FirestoreRestService();
            const identifier = `${username}_${topic}`;

            // Augment quiz with stats shell
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const quizWithStats = {
                ...(quiz as any),
                stats: {
                    totalPlays: 0,
                    perfectPlays: 0,
                    lastUpdatedAt: new Date().toISOString()
                }
            };

            const success = await fs.saveUserQuiz(identifier, username, topic, quizWithStats);

            if (success) {
                // Tracking: Increment global quizzes created for milestones
                void fs.incrementUserQuizzesCreated(username);
                return res.status(200).json({ success: true, id: identifier });
            } else {
                return res.status(500).json({ error: 'Failed to save quiz' });
            }
        } catch (e) {
            Logger.error('[CreateUserQuiz] Error', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Retrieves created quizzes for a specific user.
     */
    static async getUserCreatedQuizzes(req: Request, res: Response) {
        try {
            const username = String(req.params.username || '');
            if (!username) return res.status(400).json({ error: 'Username required' });

            const fs = new FirestoreRestService();
            const quizzes = await fs.getUserCreatedQuizzes(username);
            res.json(quizzes);
        } catch (e) {
            Logger.error('[GetUserCreatedQuizzes] Error', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
 * Get a specific user-created quiz by ID
 */
    static async getQuiz(req: Request, res: Response) {
        try {
            const quizId = req.params.quizId as string;
            if (!quizId) {
                return res.status(400).json({ error: 'Quiz ID is required' });
            }

            const fs = new FirestoreRestService();
            const quiz = await fs.getUserQuiz(quizId);
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            res.json(quiz);
        } catch (e) {
            Logger.error('[QuizController.getQuiz] error', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Posts a user-created quiz to the subreddit.
     */
    static async postUserQuiz(req: Request, res: Response) {
        try {
            const { title, quizId, username } = req.body;
            Logger.info(`[PostUserQuiz] Received Request: Title="${title}", QuizID=${quizId}, User=${username}`);

            if (!title || !quizId) {
                Logger.error('[PostUserQuiz] Missing required fields', { title, quizId });
                return res.status(400).json({ error: 'Title and Quiz ID are required' });
            }

            const subreddit = await reddit.getCurrentSubreddit();
            Logger.info(`[PostUserQuiz] Targeting Subreddit: ${subreddit.name}`);

            // Submit a CUSTOM post that launches the app directly on click
            Logger.info('[PostUserQuiz] Submitting Custom Post to Reddit...');
            const post = await reddit.submitCustomPost({
                title: `🧠 Streax Quiz: ${title}`,
                subredditName: subreddit.name,
                entry: 'default'
            });
            Logger.info(`[PostUserQuiz] Post Created Successfully! ID=${post.id}, URL=${post.url}`);

            if (quizId) {
                Logger.info(`[PostUserQuiz] Linking PostID=${post.id} to QuizID=${quizId} in Redis`);

                // SATISFIES STEP 3: Store detailed mapping
                // SATISFIES STEP 3: Store detailed mapping
                const mappingPayload = {
                    postId: post.id,
                    quizId: quizId,
                    creatorId: username, // 'username' from request body is the creator
                    topic: title, // Using title as topic name
                    createdAt: new Date().toISOString()
                };

                // SATISFIES STEP 1: Explicit Creation Marker (Option B: Redis Allowlist)
                await redis.set(`custom_post_allowlist:${post.id}`, 'true');
                Logger.info(`[PostUserQuiz] ✅ Set Allowlist Gate for PostID=${post.id}`);

                await redis.set(`post_quiz:${post.id}`, JSON.stringify(mappingPayload));
            }

            res.json({ success: true, url: post.url });
        } catch (e: any) {
            Logger.error('[PostUserQuiz] CRITICAL FAILURE', e);
            if (e?.message) Logger.error('[PostUserQuiz] Error Message:', e.message);
            res.status(500).json({ error: e.message || 'Post failed' });
        }
    }
}
