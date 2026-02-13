import type { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { UserService } from '../services/UserService';
import { Logger } from '../Logger';
import { generateUnifiedContent, validateGeminiKey } from '../services/GeminiService';
import { CacheService } from '../services/CacheService';
import { reddit, redis } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

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

            // Resolve username for dev bypass
            let username = 'anon';
            try {
                const curr = await reddit.getCurrentUsername();
                if (curr) username = curr;
            } catch { /* ignore */ }
            const isDev = CONFIG.DEV.USERNAMES.includes(username);

            // Generate if missing
            const gen = await generateUnifiedContent('Ultra Obscure Interdisciplinary Trivia', { isDev });
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
        } catch (e: any) {
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

            // 0. Resolve User
            const { userId } = await import('../context/userContext').then(m => m.getDevvitUserId(req));

            // 1. Determine Requested Date
            let reqDate = req.query.date as string;
            // Validate format YYYY-MM-DD
            if (reqDate && !/^\d{4}-\d{2}-\d{2}$/.test(reqDate)) {
                reqDate = ''; // invalid, fallback to today
            }
            // Use today if no date provided
            const targetDate = reqDate || todayStr;
            const isToday = targetDate === todayStr;

            // 2. Fetch Quiz Content (Cache logic allowed for CONTENT only)
            let quizData: any = null;
            const cacheKey = `daily_quiz_content_v2_${targetDate}`; // New key namespace with V2 to fix explanation

            // Try Cache
            const cached = await cache.get(cacheKey);
            if (cached) {
                quizData = cached;
            }

            // Try Firestore if no cache
            if (!quizData) {
                // Fetch content by date ID
                quizData = await fs.getDailyQuizByDate(targetDate);

                // Generation Logic (ONLY if it's Today and missing)
                if (!quizData && isToday) {
                    // DIVERSITY FIX: Rotate topics by day of week to avoid repetition
                    const dayOfWeek = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
                    const topicRotation = [
                        'Mixed General Knowledge', // Sunday - truly random
                        'Science & Technology',     // Monday
                        'History & Geography',      // Tuesday
                        'Arts & Literature',        // Wednesday
                        'Sports & Entertainment',   // Thursday
                        'Nature & Animals',         // Friday
                        'World Cultures & Traditions' // Saturday
                    ];
                    const dailyTopic = topicRotation[dayOfWeek];

                    // Resolve username for dev bypass
                    let username = 'anon';
                    try {
                        const curr = await reddit.getCurrentUsername();
                        if (curr) username = curr;
                    } catch { /* ignore */ }
                    const isDev = CONFIG.DEV.USERNAMES.includes(username);

                    Logger.db('[DailyQuiz] Generating new quiz for today', { date: todayStr, topic: dailyTopic, dayOfWeek });
                    const generated = await generateUnifiedContent(dailyTopic || 'General Knowledge', { isDev });
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
                            version: 'v6-diverse',
                            model: generated.model,
                            generator: 'gemini',
                            topic: dailyTopic, // Store the actual topic used
                            difficulty: 'mixed'
                        }
                    };

                    await fs.saveTodaysQuiz(payload);
                    quizData = { id: todayStr, ...payload };
                }

                // Cache if found
                if (quizData) {
                    await cache.set(cacheKey, quizData, 86400); // 24h
                }
            }

            if (!quizData) {
                return res.status(404).json({ error: 'Quiz not found for this date' });
            }

            // 3. Fetch Completion Status
            let hasCompleted = false;
            let userScore = 0;
            if (userId) {
                const history = await fs.getDailyPlayHistory(userId, quizData.id);
                if (history) {
                    hasCompleted = true;
                    userScore = history.score;
                }
            }

            return res.json({
                quiz: quizData,
                quizDate: quizData.id,
                hasCompleted,
                userScore
            });

        } catch (error) {
            Logger.error('Error fetching daily quiz:', error);
            res.status(500).json({ error: 'System Unavailable' });
        }
    }

    /**
     * Submit a score for a daily quiz.
     */
    static async submitDailyScore(req: Request, res: Response) {
        try {
            const { quizDate, score, totalQuestions, nickname, timeTakenMs, postId } = req.body;
            // 0. Resolve User
            const { userId } = await import('../context/userContext').then(m => m.getDevvitUserId(req));
            const effectiveUserId = userId; // username is not available from getDevvitUserId
            const effectiveNickname = nickname || 'Player';

            if (!effectiveUserId) return res.status(401).json({ error: 'User required' });

            // Block persistence for guest "Player" users
            if (effectiveNickname === 'Player') {
                Logger.info(`[Quiz] Skipping daily score submit for anonymous 'Player'`);
                return res.json({ ok: true, isReplay: false });
            }

            const fs = new FirestoreRestService();

            // 1. Replay Check (Authority)
            const existing = await fs.getDailyPlayHistory(effectiveUserId, quizDate);

            // Allow Write IF: History missing OR User not in leaderboard yet (Recover state)
            // We check leaderboard existence implicitly by letting saveQuizLeaderboardEntry safeguard itself.
            // But we still want to indicate "Replay" to client if history exists.

            // 2. Save History (New Record) - Upsert to ensure latest metadata
            // 2. Save History (New Record) - Upsert to ensure latest metadata
            await fs.saveDailyPlayHistory(effectiveUserId, quizDate, {
                score,
                totalQuestions,
                isPerfect: score === totalQuestions
            });

            // 3. Quiz-Specific Leaderboard (IN-MEMORY - Phase 3)
            const isReplay = existing && existing.completed;

            try {
                const { LeaderboardMemoryService } = await import('../services/LeaderboardMemoryService');
                const mem = LeaderboardMemoryService.getInstance();

                // [GATED] Only submit to competitive leaderboard if NOT a replay
                if (!isReplay) {
                    // [MEMORY SYNC] Submit to in-memory buffer ONLY. 
                    // Persistent save happens during 3-hour flush cycle.
                    mem.submit(`daily:${quizDate}`, effectiveNickname, score, {
                        timeTakenMs: Number(timeTakenMs || 0),
                        userKey: effectiveUserId
                    });

                    // Ensure Placeholder Comment exists for this post
                    if (postId) {
                        try {
                            const { CommentLeaderboardService } = await import('../services/CommentLeaderboardService');
                            const commentService = new CommentLeaderboardService();
                            await commentService.ensureComment(reddit, postId, quizDate);
                        } catch (commentErr) {
                            Logger.error('[SubmitDaily] ensureComment fail', commentErr);
                        }
                    }
                }
            } catch (memErr) {
                Logger.error('[SubmitDaily] Memory Leaderboard Fail', memErr);
            }

            if (isReplay) {
                Logger.info(`[DAILY QUIZ] Replay play processed`, { userId: effectiveUserId, date: quizDate });
                // Return replay: true so client shows badge, but we attempted recovery above
                return res.json({ success: true, replay: true });
            }

            // 4. Update Global XP (Only on first play)
            await fs.incrementUserTotalScore(effectiveUserId, score);

            // 5. [NEW] Bridge to Topic Leaderboard (IN-MEMORY - Phase 3)
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const quizContent: any = await fs.getDailyQuizByDate(quizDate);
                const topicTitle = quizContent?.metadata?.topic || quizContent?.topic;

                if (topicTitle && typeof topicTitle === 'string') {
                    // Simple slugify: lowercase, replace non-alphanum with hyphens, trim
                    const slug = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                    if (slug && slug !== 'mixed-general-knowledge' && slug !== 'general-knowledge') {
                        Logger.info(`[SubmitDaily] Mem-Bridging score to Topic: ${slug}`, { nickname: effectiveNickname, score });
                        const { LeaderboardMemoryService } = await import('../services/LeaderboardMemoryService');
                        const mem = LeaderboardMemoryService.getInstance();
                        const key = `topic:${slug}`;
                        mem.submit(key, effectiveNickname, score);
                    }
                }
            } catch (bridgeErr) {
                Logger.error('[SubmitDaily] Bridge Failed', bridgeErr);
            }

            return res.json({ success: true, replay: false });
        } catch (e) {
            Logger.error('[SubmitDaily] Error', e);
            res.status(500).json({ error: 'Submission failed' });
        }
    }

    /**
     * Get leaderboard for a specific daily quiz.
     */
    static async getDailyLeaderboard(req: Request, res: Response) {
        try {
            const date = req.query.date as string || new Date().toISOString().slice(0, 10);
            const limit = parseInt(req.query.limit as string || '25');

            // const fs = new FirestoreRestService();
            // const entries = await fs.getQuizLeaderboard(date, limit); // OLD

            // NEW: Read from Memory
            const { LeaderboardMemoryService } = await import('../services/LeaderboardMemoryService');
            const mem = LeaderboardMemoryService.getInstance();
            // detailed generic type? LeaderboardEntry[]
            const raw = mem.get(`daily:${date}`).slice(0, limit);

            // Map to client format
            const entries = raw.map(e => ({
                nickname: e.username,
                score: e.score,
                submittedAt: new Date(e.timestamp).toISOString(),
                userKey: e.username, // Approximation
                timeTakenMs: 0
            }));

            return res.json({ entries });
        } catch (e) {
            Logger.error('[GetDailyLeaderboard] Error', e);
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * List all available daily quizzes for the archive.
     */
    static async listDailyQuizzes(req: Request, res: Response) {
        try {
            const fs = new FirestoreRestService();
            const dates = await fs.listDailyQuizDates();

            const { userId } = await import('../context/userContext').then(m => m.getDevvitUserId(req));
            let completedDates: string[] = [];

            if (userId) {
                completedDates = await fs.getUserDailyHistory(userId);
            }

            return res.json({ dates, completedDates });
        } catch (e) {
            Logger.error('[ListDaily] Error', e);
            res.status(500).json({ error: 'List failed' });
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

            // Dev Bypass check
            const isDev = CONFIG.DEV.USERNAMES.includes(effectiveUserId || '');

            // Generation logic
            const topicBase = await fs.getTopic(slug);
            if (!topicBase) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });

            const generated = await generateUnifiedContent(String(topicBase.title || 'General Knowledge'), { isDev });

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

            // Block anonymous "Player" users from creating persistent quizzes
            if (username === 'Player') {
                return res.status(403).json({ error: 'Anonymous users cannot create quizzes' });
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
                // Stats handled by fs.saveUserQuiz internally now (Create vs Edit check)
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

            // Block anonymous "Player" users from posting
            if (username === 'Player') {
                return res.status(403).json({ error: 'Anonymous users cannot post quizzes' });
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
