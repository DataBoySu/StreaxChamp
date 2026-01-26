import 'dotenv/config';
import { Devvit, SettingScope } from '@devvit/public-api';
import express from 'express';
import { createServer, getServerPort } from '@devvit/server';
import { FirestoreRestService } from './services/FirestoreRestService';
import BrowserlessService from './services/BrowserlessService';
import { Logger } from './Logger';
import { UserService } from './services/UserService';
import { getDevvitUserId } from './context/userContext';
import { LeaderboardService } from './services/LeaderboardService';
import { reddit } from '@devvit/web/server';
import { context } from '@devvit/web/server';
import { createPost } from './core/post';
import type { InitResponse } from '../shared/types/api';
import type { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../shared/constants';
import { AppError } from './utils/AppError';
import { requestLogger } from './middleware/requestLogger';

// App-level secret for Gemini key; configured via Devvit settings
Devvit.addSettings({
    type: 'string',
    name: 'gemini-api-key',
    label: 'Gemini API Key',
    scope: SettingScope.App,
    isSecret: true,
});

// Optional Gemini integration
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
function hydrateGeminiKeyFromSettings(): void {
    try {
        const anyDevvit = Devvit as unknown as { settings?: { get?: (k: string) => Promise<unknown> } };
        anyDevvit.settings?.get?.('gemini-api-key')
            .then((val) => {
                if (typeof val === 'string' && val.trim()) {
                    GEMINI_API_KEY = val.trim();
                    Logger.info('[AI] Gemini key loaded from Devvit settings');
                }
            })
            .catch(() => {/* ignore */ });
    } catch {/* ignore */ }
}
// --- Gemini API Key Validation (REFINED: Zero-Ping Mode) ---
// We assume the key works until a real generation fails to conserve precious free-tier quota.
let geminiKeyValidated = false;
let geminiKeyWorks = false;

async function validateGeminiKey(): Promise<boolean> {
    if (geminiKeyValidated) return geminiKeyWorks;

    if (!GEMINI_API_KEY) {
        Logger.error('[AI] ❌ No Gemini API key configured in .env or settings');
        geminiKeyWorks = false;
        geminiKeyValidated = true;
        aiCircuitOpen = true;
        return false;
    }

    // Assume it works as per user instruction to save 20-call quota
    geminiKeyWorks = true;
    geminiKeyValidated = true;
    Logger.info('[AI] 🛡️ Gemini Status: ASSUME_VALID (Network check deferred to first real call)');
    return true;
}

// Run validation lazily on first request
// void validateGeminiKey();

// Safety settings removed per request (solo testing environment)

// --- Circuit Breakers ---
// If any critical service fails, we switch to "Banter Mode" and stop trying.
let aiCircuitOpen = false;
let dbCircuitOpen = false;
let aiLastFailureTime = 0;
let aiCooldownMs = 120000; // 2 minute cooldown for 429 errors
let aiRequestsSinceTrip = 0;
let dbRequestsSinceTrip = 0;
let aiHealingAttempted = false;
let dbHealingAttempted = false;
const CIRCUIT_RETRY_THRESHOLD = 5; // After 5 user interactions, attempt healing

// Health check: Send minimal request to Gemini to verify availability
async function checkGeminiHealth(): Promise<boolean> {
    if (!GEMINI_API_KEY) return false;
    Logger.warn('[CircuitBreaker] 🩹 System attempting AI self-repair (Health Check)...');
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI.LITE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                    generationConfig: { maxOutputTokens: 10 }
                }),
                signal: controller.signal
            }
        );
        clearTimeout(timeout);
        if (resp.ok) {
            Logger.info('[CircuitBreaker] ✅ AI Connection Restored');
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// Health check: Send minimal request to Firestore to verify availability
async function checkFirestoreHealth(): Promise<boolean> {
    try {
        const fs = new FirestoreRestService();
        const url = `${fs.getBaseUrl()}/health-check-dummy/test`;
        const resp = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        // 404 is OK (doc doesn't exist), 200 is OK, 401/403 means auth issues (still "reachable")
        return resp.status === 404 || resp.status === 200 || resp.status === 401 || resp.status === 403;
    } catch {
        return false;
    }
}

interface GeminiResult {
    title: string;
    slug: string;
    sources: string[];
    provider: 'gemini';
    reason?: string;
    model?: string;
    latencyMs?: number;
}

interface GeneratedQuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; // index
    difficulty: string;
    category: string;
    explanation?: string | undefined; // optional justification
    createdAt: string;
}

interface GeneratedQuizPayload {
    questions: GeneratedQuizQuestion[];
    metadata: { generatedAt: string; sourceWikis: string[]; version: string; model?: string; generator: 'gemini' | 'fallback' };
}

// Attempt to extract the first valid JSON object/array from an LLM response string.
function extractJSONCandidate(text: string): unknown | null {
    if (!text || typeof text !== 'string') return null;

    // Prefer fenced blocks (accept ```json or ```)
    const fenceMatch = text.match(/```(?:\s*json)?\s*([\s\S]*?)```/i);
    const rawCandidate = fenceMatch && fenceMatch[1] ? String(fenceMatch[1]) : String(text);

    // Remove per-line Devvit/log prefixes that might be baked into the string if logged improperly
    const raw = rawCandidate
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:\[[A-Z0-9_-]+\]|DEVVIT)\s*/i, ''))
        .join('\n')
        // Also remove any remaining markdown code block markers if the fence regex missed them
        .replace(/^```[a-z]*\s*/i, '')
        .replace(/\s*```$/i, '');

    // Try direct parse first
    try { return JSON.parse(raw.trim()); } catch (e) { /* fall through */ }

    // Find first '{' or '[' and attempt to find a balanced JSON substring
    const idx1 = raw.indexOf('{');
    const idx2 = raw.indexOf('[');
    let idx = -1;
    if (idx1 === -1) idx = idx2;
    else if (idx2 === -1) idx = idx1;
    else idx = Math.min(idx1, idx2);
    if (idx === -1) return null;
    const slice = raw.slice(idx);

    const stack: string[] = [];
    for (let i = 0; i < slice.length; i++) {
        const ch = slice[i];
        if (ch === '{' || ch === '[') {
            stack.push(ch);
        } else if (ch === '}' || ch === ']') {
            const last = stack[stack.length - 1];
            if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
                stack.pop();
                if (stack.length === 0) {
                    const candidate = slice.slice(0, i + 1);
                    try { return JSON.parse(candidate); } catch (err) { break; }
                }
            } else {
                break;
            }
        }
    }
    return null;
}

function sanitizeLines(lines: string[]): string[] {
    const cleaned = lines
        .map((s) => String(s || '').replace(/\*|`|^\d+\.|^-\s+/g, '').slice(0, 80))
        .filter((s) => s);
    return cleaned;
}

// Global daily bonus (same for all topics)
async function getGlobalBonusForToday(fs: FirestoreRestService): Promise<{ question: string; options: string[]; correctIndex: number } | null> {
    try {
        const date = new Date().toISOString().slice(0, 10);
        const existing = await fs.getDailyBonusQuestion(date);
        if (existing && Array.isArray(existing.options) && existing.options.length === 4) {
            return { question: existing.question, options: existing.options, correctIndex: Math.min(Math.max(existing.correctAnswer, 0), 3) };
        }
        const gen = await generateQuizWithGemini('Ultra Obscure Interdisciplinary Trivia', ['https://en.wikipedia.org/wiki/Knowledge'], undefined);
        const q = gen.questions && gen.questions.length ? gen.questions[0] : undefined;
        if (!q) return null;
        const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
        if ((q.question || '').trim() && opts.length === 4) {
            await fs.saveDailyBonusQuestion(date, { question: q.question, options: opts, correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0, difficulty: 'extreme' });
            const saved = await fs.getDailyBonusQuestion(date);
            if (saved) return { question: saved.question, options: saved.options, correctIndex: Math.min(Math.max(saved.correctAnswer, 0), 3) };
        }
        return null;
    } catch {
        return null;
    }
}

function isValidQuizPayload(payload: GeneratedQuizPayload | null | undefined): boolean {
    if (!payload || !Array.isArray(payload.questions) || payload.questions.length !== 5) return false;
    for (const q of payload.questions) {
        if (!q || !q.question || !Array.isArray(q.options) || q.options.length !== 4) return false;
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) return false;
    }
    return true;
}

async function callGemini(rawTopic: string): Promise<GeminiResult> {
    await validateGeminiKey();
    const fallbackTitle = rawTopic
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((w: string) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');

    if (!GEMINI_API_KEY) {
        throw AppError.aiFailure('NO_API_KEY');
    }

    const systemPrompt = CONFIG.GEMINI.PROMPTS.TOPIC_NORMALIZER;
    const userPrompt = `User input topic: ${rawTopic}`;

    try {
        const model = CONFIG.GEMINI.LITE_MODEL; // Cheapest model for normalization
        Logger.info(`[TopicNorm] Calling Gemini model=${model} for topic="${rawTopic}"`);
        const controller = new AbortController();
        const start = Date.now();
        const timeout = setTimeout(() => controller.abort(), 6500);
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 512, // Increased from 256 to prevent truncation
                        response_mime_type: "application/json",
                        response_schema: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                sources: { type: "array", items: { type: "string" } }
                            },
                            required: ["title", "sources"]
                        }
                    },
                }),
                signal: controller.signal,
            }
        );
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;
        if (!resp.ok) {
            throw new Error(`Gemini HTTP ${resp.status}`);
        }
        // In native JSON mode, we extract values from the response payload
        const data: any = await resp.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJSONCandidate(text);

        // validate parsed shape
        const p = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
        if (!p || typeof p.title !== 'string') {
            Logger.error('[GeminiParseFail] model=' + String(model) + ' missing title or malformed JSON. raw=' + String(text).slice(0, 1000));
            throw new Error('PARSE_FAILED');
        }
        const title = String(p.title || fallbackTitle).trim() || fallbackTitle;
        const finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const sources: string[] = Array.isArray(p.sources)
            ? (p.sources as unknown[])
                .map((s) => String(s).trim())
                .filter((s) => /^https?:\/\//i.test(s))
                .slice(0, 6)
            : [
                `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            ];

        Logger.ai(`[TopicNorm] Gemini matched: "${title}" (Sources: ${sources.length})`, { model, latencyMs });
        return { title, slug: finalSlug, sources, provider: 'gemini', model, latencyMs };
    } catch (err) {
        const status = (err as any)?.status;
        const msg = (err as any)?.message || 'UNKNOWN_GEMINI_ERROR';

        if (status === 429 || status === 500) {
            Logger.warn(`[AI] Critical Failure (${status}): Tripping circuit for 120s cooldown.`);
            aiLastFailureTime = Date.now();
            aiCircuitOpen = true;
        } else {
            aiCircuitOpen = true; // Generic trip
        }

        Logger.error('Gemini call failed, strict error mode enabled:', err);
        throw AppError.aiFailure(msg);
    }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Gemini quiz generation (hard informative variant) – returns 5 challenging, explanation-rich questions
// Helper for sequential generation
// Gemini quiz generation (Batch Mode: 5 questions at once)
// Replaces sequential single-question generation to avoid rate limits and improve consistency
// [CLEANUP] generateQuizWithGemini_OLD removed.

// Gemini quiz generation (Smart Batch Mode: Accumulate & Retry)
// Generates 5 questions. If some fail, keeps valid ones and requests remainder.
async function generateQuizWithGemini(topicTitle: string, topicSources: string[], contextText?: string): Promise<GeneratedQuizPayload> {
    await validateGeminiKey();
    if (!GEMINI_API_KEY) throw AppError.aiFailure('NO_API_KEY');

    const model = CONFIG.GEMINI.CONTENT_MODEL || 'gemini-1.5-flash';
    const trimmedContext = contextText ? contextText.slice(0, 25000) : '';

    // Accumulator for valid questions
    const validQuestions: GeneratedQuizQuestion[] = [];
    const targetCount = 5;
    let attempts = 0;
    const maxAttempts = 3; // Retry entire batches up to 3 times (total api calls)

    Logger.ai(`[SmartGen] Starting generation for topic="${topicTitle}" Target=${targetCount}`, { model });

    // Loop until we have enough questions or exhaust attempts
    while (validQuestions.length < targetCount && attempts < maxAttempts) {
        attempts++;
        const needed = targetCount - validQuestions.length;

        // Contextualize prompt to avoid duplicates
        const existingTxt = validQuestions.map(q => q.question).join(" | ");
        const avoidPrompt = validQuestions.length > 0 ? `\nDO NOT repeat these questions: ${existingTxt}` : '';

        // Use centralized prompt and inject count
        const systemPrompt = CONFIG.GEMINI.PROMPTS.QUIZ_GENERATOR
            .replace('exactly 5', `exactly ${needed}`)
            .replace('containing 5 items', `containing ${needed} items`);

        const userPrompt = `Topic: ${topicTitle}
Sources:
${topicSources.slice(0, 4).join('\n')}
${trimmedContext ? `\nCONTEXT:\n${trimmedContext}` : ''}
${avoidPrompt}

Generate ${needed} unique questions now.`;

        try {
            Logger.ai(`[SmartGen] Batch Attempt ${attempts}/${maxAttempts}: Requesting ${needed} questions...`);
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 16384, // High limit for smart batching (User requested 4x 4096)
                        response_mime_type: "application/json",
                        response_schema: {
                            type: "object",
                            properties: {
                                questions: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            question: { type: "string" },
                                            options: { type: "array", items: { type: "string" } },
                                            correctAnswer: { type: "number" },
                                            difficulty: { type: "string" },
                                            category: { type: "string" },
                                            explanation: { type: "string" }
                                        },
                                        required: ["question", "options", "correctAnswer", "difficulty", "category"]
                                    }
                                }
                            }
                        }
                    }
                })
            });

            if (!resp.ok) {
                Logger.warn(`[SmartGen] API Fail ${resp.status}`);
                await delay(1000); // Backoff briefly
                continue;
            }

            const data: any = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const parsed = extractJSONCandidate(text) as any;

            const rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];

            // Validate and Accumulate
            let addedThisRound = 0;
            for (const q of rawList) {
                if (validQuestions.length >= targetCount) break; // Don't overfill

                // Strict validation
                if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue;

                // Check duplicate against current batch (and previous)
                if (validQuestions.some(vq => vq.question === q.question)) continue;

                validQuestions.push({
                    id: `q${Date.now()}-${validQuestions.length}`,
                    question: String(q.question),
                    options: q.options.map(String),
                    correctAnswer: Number(q.correctAnswer) || 0,
                    difficulty: String(q.difficulty || 'medium'),
                    category: String(q.category || topicTitle),
                    explanation: q.explanation,
                    createdAt: new Date().toISOString()
                });
                addedThisRound++;
            }

            Logger.info(`[SmartGen] Attempt ${attempts}: Added ${addedThisRound} valid questions. Total: ${validQuestions.length}/${targetCount}`);

            // If we added nothing despite success, maybe the model is stuck?
            if (addedThisRound === 0) await delay(1000);

        } catch (e) {
            const status = (e as any)?.status;
            if (status === 429 || status === 500) {
                Logger.warn(`[SmartGen] Critical Failure (${status}): Tripping circuit for 120s cooldown.`);
                aiLastFailureTime = Date.now();
                aiCircuitOpen = true;
                break; // Stop batch loop immediately on quota/internal fail
            }
            Logger.error(`[SmartGen] Error on attempt ${attempts}`, e);
            await delay(1500);
        }
    }

    // PARTIAL SAVE LOGIC: failing softly if we have at least 1 question
    if (validQuestions.length > 0) {
        if (validQuestions.length < targetCount) {
            Logger.warn(`[SmartGen] Partial Success: ONLY ${validQuestions.length}/${targetCount} generated. Saving what we have.`);
        } else {
            Logger.ai(`[SmartGen] Full Success! Generated ${validQuestions.length} questions.`);
        }

        return {
            questions: validQuestions,
            metadata: {
                generatedAt: new Date().toISOString(),
                sourceWikis: topicSources.slice(0, 2),
                version: 'v4-smart-batch',
                model: model,
                generator: 'gemini'
            }
        };
    }

    throw AppError.aiFailure('SMART_GEN_FAILED_TOTAL');
}

// Configure Devvit for HTTP access and media
Devvit.configure({
    http: true,
    redditAPI: true,
    redis: false,
    media: true,
});

// Programmatic moderator menu: Create Daily Quiz Post
try {
    Devvit.addMenuItem({
        label: 'Create Daily Quiz Post',
        location: 'subreddit',
        forUserType: 'moderator',
        onPress: async (_event: unknown, _ctx: unknown) => {
            try {
                const ctx = _ctx as unknown;
                const ctxRec = ctx as Record<string, unknown> | undefined;
                const subredditName = ctxRec && typeof ctxRec === 'object'
                    ? String(((ctxRec.subreddit as Record<string, unknown> | undefined)?.name as string) || (ctxRec.subredditName as string) || process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT)
                    : (process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT);
                const post = await createPost(subredditName);
                try {
                    type UIShape = { showToast?: (m: string) => void } | undefined;
                    const ui = ctxRec && typeof ctxRec === 'object' && typeof ctxRec['ui'] === 'object' ? (ctxRec['ui'] as UIShape) : undefined;
                    ui?.showToast?.(`Post created: ${post?.id ?? 'unknown'}`);
                } catch {/* ignore UI errors */ }
                console.info('[MenuCreate] post created', post?.id);
            } catch (err) {
                try {
                    const c = _ctx as Record<string, unknown> | undefined;
                    type UIShape = { showToast?: (m: string) => void } | undefined;
                    const ui = c && typeof c['ui'] === 'object' ? (c['ui'] as UIShape) : undefined;
                    ui?.showToast?.('Failed to create post');
                } catch {/* ignore */ }
                console.error('[MenuCreate] createPost failed', err);
            }
        }
    });
} catch (e) {
    // Non-fatal: addMenuItem may not be available in some runtimes
    Logger.info('[DevvitMenu] addMenuItem unavailable or failed to register', e);
}

// Try to load secrets from Devvit settings at startup (non-blocking)
hydrateGeminiKeyFromSettings();

// Create Express app
const app = express();

// Middleware for JSON body parsing
app.use(express.json());

// Request/Response logging middleware (logs all API calls)
app.use(requestLogger);

// --- User Auth (nickname) Endpoints ---
// Devvit user context proxy: attempts to derive a userId. In real Devvit deployment, replace mock logic.
app.get('/api/context/user', async (req, res) => {
    try {
        const { userId, source } = getDevvitUserId(req);
        if (userId && /^t2_/.test(userId)) {
            Logger.info('[ContextUser] resolved', { userId, source });
            return res.json({ ok: true, userId, source });
        }
        Logger.error('[ContextUser] userId not found');
        return res.status(404).json({ ok: false, error: 'USER_ID_NOT_AVAILABLE' });
    } catch (e) {
        Logger.error('[ContextUser] error', e);
        return res.status(500).json({ ok: false, error: 'CONTEXT_ERROR' });
    }
});
app.get('/api/users/resolve', async (req, res) => {
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const us = new UserService();
    Logger.info('[Resolve] attempt', { userId });
    const user = await us.getUser(userId);
    if (!user) {
        Logger.info('[Resolve] not found', { userId });
        return res.json({ found: false });
    }
    Logger.info('[Resolve] success', { userId, nickname: user.nickname });
    res.json({ found: true, user });
});

app.post('/api/users/signup', async (req, res) => {
    const { userId, nickname } = req.body || {};
    if (!userId || typeof userId !== 'string') return res.status(400).json({ ok: false, error: 'userId required' });
    if (!nickname || typeof nickname !== 'string') return res.status(400).json({ ok: false, error: 'nickname required' });
    const trimmedNick = nickname.trim();
    if (trimmedNick.length < 1 || trimmedNick.length > 40) return res.status(400).json({ ok: false, error: 'nickname length 1-40' });
    const us = new UserService();
    Logger.info('[Signup] attempt', { userId, nickname: trimmedNick });
    const existing = await us.getUser(userId);
    if (existing) {
        Logger.info('[Signup] already-exists', { userId, nickname: existing.nickname });
        return res.status(200).json({ ok: true, user: existing, reason: 'ALREADY_EXISTS' });
    }
    const created = await us.createUser(userId, trimmedNick);
    if (!created) {
        Logger.error('Signup failed (taken/conflict)', { userId, nickname: trimmedNick });
        return res.status(409).json({ ok: false, error: 'nickname taken or create failed' });
    }
    Logger.info('[Signup] user created', { userId, nickname: trimmedNick });
    res.json({ ok: true, user: created });
});

// API endpoint to get user information (simplified)
app.get('/api/user', async (_req, res) => {
    // Legacy endpoint retained; attempt to resolve current reddit username when available.
    try {
        const username = await reddit.getCurrentUsername();
        if (username) {
            return res.json({ userId: username, username, displayName: username, isLoggedIn: true });
        }
        // Return nulls rather than 'anonymous' placeholders so the client can decide display logic.
        return res.json({ userId: null, username: null, displayName: null, isLoggedIn: false });
    } catch (e) {
        // On error, return nulls instead of placeholder string
        return res.status(200).json({ userId: null, username: null, displayName: null, isLoggedIn: false });
    }
});

// Initialization endpoint: returns postId and username (Devvit context-aware)
app.get<{ postId: string }, InitResponse | { status: string; message: string }>('/api/init',
    async (_req, res): Promise<void> => {
        const { postId } = context as { postId?: string };

        if (!postId) {
            console.error('API Init Error: postId not found in devvit context');
            res.status(400).json({ status: 'error', message: 'postId is required but missing from context' });
            return;
        }

        try {
            const username = await reddit.getCurrentUsername();

            res.json({
                type: 'init',
                postId: postId,
                username: username ?? null,
            });
        } catch (error) {
            console.error(`API Init Error for post ${postId}:`, error);
            let errorMessage = 'Unknown error during initialization';
            if (error instanceof Error) {
                errorMessage = `Initialization failed: ${error.message}`;
            }
            res.status(400).json({ status: 'error', message: errorMessage });
        }
    }
);

// API endpoint to get quiz data
app.get('/api/quiz', async (_req, res) => {
    try {
        await validateGeminiKey();
        const firestoreService = new FirestoreRestService();

        // 1. Try fetching today's quiz from DB
        const quiz = await firestoreService.getTodaysQuiz();
        if (quiz) {
            // Increment a generic daily quiz play counter stored under a pseudo-topic slug 'daily-quizzes'
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
        dbCircuitOpen = true; // or aiCircuitOpen depending on error? generic catch means 500.
        res.status(500).json({ error: 'System Unavailable: Failed to load daily quiz.' });
    }
});

// --- Topic & Custom Quiz Endpoints ---

app.get('/api/topics', async (_req, res) => {
    try {
        const fs = new FirestoreRestService();
        const list = await fs.listTopics();
        res.json(list);
    } catch (e) {
        Logger.error('[TopicsList] error', e);
        res.status(500).json({ error: 'FAILED_TO_LIST' });
    }
});

// [REMOVED] Duplicate generation route & legacy helper to enforce strict validation via single source of truth

app.get('/api/topics/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const fs = new FirestoreRestService();
        const topic = await fs.getTopic(slug);
        if (!topic) return res.status(404).json({ error: 'NOT_FOUND' });
        res.json(topic);
    } catch (e) {
        res.status(500).json({ error: 'FETCH_ERROR' });
    }
});

app.post('/api/topics/:slug/quiz', async (req, res) => {
    try {
        const { slug } = req.params;
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
});

// --- Robot Dialogues (Landing Page Bot) ---
const ROBOT_SYSTEM_PROMPT = `Role-play as a medieval guardsman who treats this application as his charge: haughty, easily irritated, and dislikes being disturbed — yet greets newcomers politely at first. Speak as the app's guardsman and refer to the application metaphorically (examples: "the keep", "the gate", "these gates", "this place", "the watch"), but DO NOT use the words "town", "towns", "townsguard" or "village" anywhere in the output. The app is it's figurative town. Short, punchy lines (max 80 chars), witty, a cute puffball of anger with an old man's patience. No profanity. No markdown.
Write 5 new standalone lines suitable for a landing page mascot. Keep them varied: greetings for new players, snark when hovered too long, and a final push to enter the app.
Return STRICT JSON: { "lines": ["...","...","...","...","..."] } and NOTHING else.`;

app.get('/api/robot/dialogues/today', async (_req: Request, res: Response) => {
    try {
        await validateGeminiKey();
        const today = new Date().toISOString().slice(0, 10);

        // 1. CIRCUIT BREAKER CHECKS WITH HEALING
        // DB Circuit: Check if we should attempt healing
        if (dbCircuitOpen) {
            dbRequestsSinceTrip++;
            if (dbRequestsSinceTrip >= CIRCUIT_RETRY_THRESHOLD) {
                Logger.info(`[CircuitBreaker] DB healing attempt (${dbRequestsSinceTrip} requests since trip)`);
                const dbHealthy = await checkFirestoreHealth();
                if (dbHealthy) {
                    Logger.info('[CircuitBreaker] DB is back! Closing circuit.');
                    dbCircuitOpen = false;
                    dbRequestsSinceTrip = 0;
                    // Fall through to normal flow
                } else {
                    Logger.warn('[CircuitBreaker] DB still down after healing attempt - giving up');
                    dbHealingAttempted = true; // Mark that we tried and failed
                    return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.PERMANENTLY_DOWN });
                }
            } else {
                // If we already tried healing and it failed, show final message
                if (dbHealingAttempted) {
                    return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.PERMANENTLY_DOWN });
                }
                return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.DB_OFFLINE });
            }
        }

        // AI Circuit: Check if we should attempt healing
        const cooldownElapsed = Date.now() - aiLastFailureTime > aiCooldownMs;
        const thresholdReached = aiRequestsSinceTrip >= CIRCUIT_RETRY_THRESHOLD;

        if (aiCircuitOpen && (cooldownElapsed || thresholdReached)) {
            aiRequestsSinceTrip++; // continue counting but also try healing
            Logger.info(`[CircuitBreaker] AI healing attempt (${aiRequestsSinceTrip} requests since trip / cooldown: ${cooldownElapsed})`);
            const aiHealthy = await checkGeminiHealth();
            if (aiHealthy) {
                Logger.info('[CircuitBreaker] AI is back! Closing circuit.');
                aiCircuitOpen = false;
                aiRequestsSinceTrip = 0;
                aiHealingAttempted = false; // Reset failure flag
                // Fall through to normal flow
            } else {
                Logger.warn('[CircuitBreaker] AI still down after healing attempt - resetting cooldown');
                aiLastFailureTime = Date.now(); // reset timer for next attempt
                aiHealingAttempted = true;
                return res.json({
                    ok: true,
                    date: today,
                    lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE,
                    systemStatus: { ai: false, db: !dbCircuitOpen },
                    healingInProgress: true
                });
            }
        } else if (aiCircuitOpen) {
            aiRequestsSinceTrip++;
            if (aiHealingAttempted) {
                return res.json({
                    ok: true,
                    date: today,
                    lines: CONFIG.ROBOT.FALLBACK_BANTER.PERMANENTLY_DOWN,
                    systemStatus: { ai: false, db: !dbCircuitOpen }
                });
            }
            return res.json({
                ok: true,
                date: today,
                lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE,
                systemStatus: { ai: false, db: !dbCircuitOpen }
            });
        }

        // Check RAM cache first (zero DB/AI calls if cached)
        if (ROBOT_DIALOGUE_CACHE && ROBOT_DIALOGUE_CACHE.date === today) {
            Logger.cache('[Robot] RAM Cache Hit', { date: today });
            return res.json({
                ok: true,
                date: today,
                lines: ROBOT_DIALOGUE_CACHE.lines,
                cached: true,
                systemStatus: { ai: !aiCircuitOpen, db: !dbCircuitOpen }
            });
        }

        const fs = new FirestoreRestService();
        let existing;
        try {
            Logger.db('[Robot] Checking Firestore for existing dialogues', { date: today });
            existing = await fs.getRobotDialogues(today);
        } catch (e) {
            Logger.error('[Robot] DB Check Failed -> Trip Breaker', e);
            dbCircuitOpen = true;
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.DB_OFFLINE });
        }
        if (existing && existing.length >= 5) {
            // Cache in RAM for subsequent requests
            ROBOT_DIALOGUE_CACHE = { date: today, lines: existing.slice(0, 20) };
            return res.json({
                ok: true,
                date: today,
                lines: existing.slice(0, 20),
                systemStatus: { ai: !aiCircuitOpen, db: !dbCircuitOpen }
            });
        }
        // Generate 5 new lines if none today (or not enough)
        const model = CONFIG.GEMINI.LITE_MODEL; // Cheaper model for simple text
        if (!GEMINI_API_KEY) {
            Logger.warn('[Robot] No API Key -> Trip AI Breaker');
            aiCircuitOpen = true;
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
        }

        let resp;
        try {
            Logger.ai('[Robot] Requesting new dialogues from Gemini', { model });
            resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: ROBOT_SYSTEM_PROMPT }] },
                        contents: [{ role: 'user', parts: [{ text: 'Generate 5 robot lines now.' }] }],
                        generationConfig: {
                            temperature: 0.6,
                            maxOutputTokens: 512,
                            response_mime_type: "application/json",
                            response_schema: {
                                type: "object",
                                properties: {
                                    lines: { type: "array", items: { type: "string" } }
                                },
                                required: ["lines"]
                            }
                        }
                    }),
                }
            );
        } catch (e) {
            Logger.error('[Robot] AI Network Fail -> Trip Breaker', e);
            aiCircuitOpen = true;
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
        }

        if (!resp.ok) {
            const status = resp.status;
            if (status === 429 || status === 500) {
                Logger.warn(`[Robot] AI Critical Fail (${status}) -> Trip 120s cooldown`);
                aiLastFailureTime = Date.now();
                aiCircuitOpen = true;
            } else {
                Logger.warn(`[Robot] AI Status Fail ${status} -> Trip Breaker`);
                aiCircuitOpen = true;
            }
            return res.json({
                ok: true,
                date: today,
                lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE,
                systemStatus: { ai: false, db: !dbCircuitOpen }
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await resp.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJSONCandidate(String(text));
        type RobotJson = { lines?: unknown };
        const linesArr = parsed && typeof parsed === 'object' && Array.isArray((parsed as RobotJson).lines as unknown[])
            ? ((parsed as RobotJson).lines as unknown[]).map((s) => String(s).trim()).filter(Boolean)
            : [];
        const clean = sanitizeLines(linesArr).slice(0, 5);
        Logger.ai(`[Robot] Gemini returned ${clean.length} valid dialogue lines`, { model });

        // VALIDATION: Only save to Firestore if we have 5 valid lines
        if (clean.length < 5) {
            Logger.warn(`[Robot] AI returned insufficient lines (${clean.length}/5) -> Trip Breaker`);
            aiCircuitOpen = true;
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
        }

        // Additional quality check: ensure each line is meaningful
        const validLines = clean.filter(line => line.length >= 10 && line.length <= 80);
        if (validLines.length < 5) {
            Logger.warn(`[Robot] AI returned low-quality lines (${validLines.length}/5 valid) -> Trip Breaker`);
            aiCircuitOpen = true;
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
        }

        // Save to Firestore
        Logger.db('[Robot] Saving validated dialogues to Firestore', { count: validLines.length });
        const fsOk = await new FirestoreRestService().saveRobotDialogues(today, validLines);
        if (!fsOk) {
            Logger.warn('[Robot] DB Save Failed -> Trip Breaker');
            dbCircuitOpen = true;
            // Still return the generated lines this time, but future requests will use DB_OFFLINE
        }

        // Cache in RAM for subsequent requests
        ROBOT_DIALOGUE_CACHE = { date: today, lines: validLines };

        res.json({
            ok: true,
            date: today,
            lines: validLines,
            systemStatus: { ai: !aiCircuitOpen, db: !dbCircuitOpen }
        });
    } catch (e) {
        Logger.error('[RobotDialogues] error', e);
        // Determine if it was AI or DB error to set specific flags if needed
        // For now, if the top-level catch hits, it's ambiguous, but we can assume DB if AI calls were wrapped.
        // But since we are here, we can just check if it was likely an AI error or DB error.
        // Simplification: just return a generic error or the offline banter if we know which one failed.

        // If we are here, something major failed.
        // Let's assume DB failure if we haven't set AI failure explicitly yet, or checking the error object.
        // But for "checking once", we should set the flag corresponding to what failed.
        // Since this try/catch wraps BOTH FS and AI calls, it's tricky.

        // Strategy: We rely on the specific catch blocks or flags set during execution if possible.
        // But this block catches EVERYTHING.
        // Let's safe-fail to "System Malfunction" (generic) or triggering one of the breakers?
        // Actually, if we are in this catch block, we can't easily distinguish without checking error.

        res.status(500).json({ ok: false, error: 'ROBOT_DIALOGUES_FAILED' });
    }
});

// Regenerate today's daily quiz if corrupt or forced
app.post('/api/quiz/regenerate', async (req, res) => {
    try {
        const firestoreService = new FirestoreRestService();
        const existing = await firestoreService.getTodaysQuiz();
        const force = Boolean(req.body?.force);
        const needsRegen = force || !existing || !existing.questions || existing.questions.length < 5 || existing.questions.some(q => !q || !q.question || !Array.isArray(q.answers) || q.answers.length < 3 || !q.correctAnswer);
        if (!needsRegen) {
            return res.json({ ok: true, regenerated: false, reason: 'ALREADY_VALID' });
        }
        // Use generic generation with Gemini fallback (topic fixed as Daily Mix)
        const topicTitle = 'Daily Mix';
        const sources: string[] = ['https://en.wikipedia.org/wiki/General_knowledge'];
        const generated = await generateQuizWithGemini(topicTitle, sources, undefined);
        // Persist to Firestore under daily-quizzes/{today}
        const today = new Date().toISOString().split('T')[0];
        // Build Firestore document body manually (mirror parse expectations)
        const questionsValues = generated.questions.map((q, idx) => ({
            mapValue: {
                fields: {
                    id: { stringValue: q.id || `q${idx + 1}` },
                    question: { stringValue: q.question },
                    options: { arrayValue: { values: q.options.map(o => ({ stringValue: o })) } },
                    correctAnswer: { integerValue: String(q.correctAnswer ?? 0) },
                    difficulty: { stringValue: q.difficulty || 'medium' },
                    category: { stringValue: q.category || topicTitle },
                    createdAt: { stringValue: q.createdAt || new Date().toISOString() }
                }
            }
        }));
        const body = {
            fields: {
                id: { stringValue: today },
                questions: { arrayValue: { values: questionsValues } },
                metadata: {
                    mapValue: {
                        fields: {
                            generatedAt: { stringValue: new Date().toISOString() },
                            sourceWikis: { arrayValue: { values: (generated.metadata.sourceWikis || []).map(s => ({ stringValue: s })) } },
                            version: { stringValue: 'v1' },
                            generator: { stringValue: generated.metadata.generator || 'unknown' }
                        }
                    }
                }
            }
        };
        const url = `${firestoreService.getBaseUrl()}/daily-quizzes/${today}`;
        const saveResp = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!saveResp.ok) {
            Logger.error('[DailyQuizRegenerate] save failed', { status: saveResp.status });
            return res.status(500).json({ ok: false, error: 'SAVE_FAILED' });
        }
        Logger.info('[DailyQuizRegenerate] success');
        res.json({ ok: true, regenerated: true, questions: generated.questions.length });
    } catch (e) {
        Logger.error('[DailyQuizRegenerate] error', e);
        res.status(500).json({ ok: false, error: 'REGEN_FAILED' });
    }
});

// API endpoint for topic-based quiz generation (placeholder)
// List saved topics
app.get('/api/topics', async (_req, res) => {
    try {
        const firestoreService = new FirestoreRestService();
        const topics = await firestoreService.listTopics?.();
        // We might need playCount; refetch each topic minimal info if necessary
        const enriched = await Promise.all((topics || []).map(async (t) => {
            try {
                const full = await firestoreService.getTopic(t.slug);
                return { ...t, playCount: full?.playCount ?? full?.playcount ?? undefined };
            } catch { return t; }
        }));
        res.status(200).json(enriched);
    } catch (error) {
        Logger.error('Error listing topics:', error);
        res.status(500).json({ error: 'Failed to list topics' });
    }
});

// Get a single topic by slug
app.get('/api/topics/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const firestoreService = new FirestoreRestService();
        const topic = await firestoreService.getTopic(slug);
        if (!topic) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ ...topic });
    } catch (error) {
        Logger.error('Error fetching topic:', error);
        res.status(500).json({ error: 'Failed to fetch topic' });
    }
});

// Lightweight status endpoint for a topic's quiz generation state (today)
app.get('/api/topics/:slug/status', async (req, res) => {
    try {
        const { slug } = req.params;
        const firestoreService = new FirestoreRestService();
        const topic = await firestoreService.getTopic(slug || '');
        if (!topic) return res.status(404).json({ error: 'Topic not found' });
        const today = new Date().toISOString().split('T')[0];
        const quiz = await firestoreService.getTopicQuiz?.(slug || '', today || '');
        res.json({
            slug,
            status: topic.status || 'unknown',
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
});

// Generate a topic: call Gemini (stub for v1), save topic doc to Firestore
app.post('/api/topics/generate', async (req, res) => {
    try {
        const { topic, userKey } = req.body || {};
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({ error: 'Topic is required' });
        }
        // NOTE: Per-user generation quota enforcement removed — allow generation requests
        // Keep `userKey` optional for telemetry; do not require it or persist per-user counters here.
        const fs = new FirestoreRestService();

        Logger.info('Generate topic request:', topic);
        const { title, slug, sources, provider, reason, model, latencyMs } = await callGemini(topic);



        // Strict validation check
        if (!title || title.length < 2 || !slug || slug.length < 2) {
            Logger.warn('[GenerateTopic] Validation failed', { title, slug });
            return res.status(400).json({ error: 'Invalid topic generated' });
        }

        const firestoreService = fs;
        const topicPayload: { title: string; slug: string; sources: string[]; model?: string; genLatencyMs?: number; requestedBy?: string } = { title, slug, sources, requestedBy: userKey };
        if (model) topicPayload.model = model;
        if (typeof latencyMs === 'number') topicPayload.genLatencyMs = latencyMs;

        // Only save if we strictly trust the output
        const saved = await firestoreService.saveTopic(topicPayload);
        Logger.db(`[GenerateTopic] Topic stored in Firestore: "${title}" (Slug: ${slug})`, { saved: !!saved });
        res.status(200).json({ title, slug, sources, saved, provider, model, latencyMs });
    } catch (error) {
        Logger.error('Error in /api/topics/generate:', error);
        res.status(500).json({ error: 'Failed to generate topic' });
    }
});

// Generate or fetch today's quiz for a topic
app.post('/api/topics/:slug/quiz', async (req, res) => {
    try {
        const { slug } = req.params;
        // Disable scraping: honor user's preference to keep Browserless off
        const useScrape = false;
        const date: string = new Date().toISOString().slice(0, 10);
        const firestoreService = new FirestoreRestService();
        // Try existing quiz
        const existing = await firestoreService.getTopicQuiz(slug || '', date || '');
        const force = Boolean(req.body?.force);
        if (existing && existing.questions && existing.questions.length >= 5 && !force) {
            Logger.cache('[TopicQuiz] Serving from Firestore Cache', { slug, date });
            // Attach existing bonus (if any) for consistency when served from cache
            let bonusExisting: { question: string; options: string[]; correctIndex: number } | null = null;
            try { bonusExisting = await getGlobalBonusForToday(firestoreService); } catch {/* ignore */ }
            return res.status(200).json({ fromCache: true, quiz: existing, bonus: bonusExisting });
        }
        // Removed any auto-regeneration triggers elsewhere: only generate on explicit request (this endpoint)
        // Get topic for sources (include contextSnippet if present)
        const topic = await firestoreService.getTopic(slug);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });
        // If topic has lastQuizDate today and hasQuiz true, short-circuit without regeneration
        const today = date;
        if (topic.hasQuiz && topic.lastQuizDate === today && !force) {
            Logger.cache('[TopicQuiz] Topic marked as having quiz today (Metadata Cache)', { slug });
            let bonusExisting: { question: string; options: string[]; correctIndex: number } | null = null;
            try { bonusExisting = await getGlobalBonusForToday(firestoreService); } catch {/* ignore */ }
            return res.status(200).json({ fromCache: true, reason: 'ALREADY_TODAY', quiz: existing, bonus: bonusExisting });
        }
        await firestoreService.patchTopic(slug, { status: 'generating', generationPhase: 'started', lastGenerated: new Date().toISOString() });

        let contextText: string | undefined;
        const bl = new BrowserlessService();
        if (useScrape) {
            if (bl.available() && Array.isArray(topic.sources) && topic.sources.length) {
                try {
                    const agg = await bl.aggregateText(topic.sources.slice(0, 5));
                    contextText = agg.combined;
                    // Store snippet/hash for reuse (truncate to 15000 chars)
                    if (contextText) {
                        const hash = await bl.hash(contextText);
                        await firestoreService.patchTopic(slug, {
                            contextHash: hash,
                            contextSnippet: contextText.slice(0, 15000),
                            lastScraped: new Date().toISOString(),
                            generationPhase: 'scraped'
                        });
                    }
                } catch {
                    // ignore scrape failures
                }
            }
        } else if (topic.contextSnippet) {
            // Reuse existing snippet when scraping disabled
            contextText = topic.contextSnippet;
        }

        Logger.ai('[TopicQuiz] Generating quiz with Gemini', { topic: topic.title || slug, hasContext: !!contextText });
        const quizPayload = await generateQuizWithGemini(topic.title || slug, topic.sources || [], contextText);
        // Validate: must have exactly 5 fully-formed questions and no placeholders
        const hasPlaceholders = Array.isArray(quizPayload?.questions) && quizPayload.questions.some(q => /Placeholder question|Missing question/i.test(q.question || ''));
        if (!isValidQuizPayload(quizPayload) || hasPlaceholders) {
            await firestoreService.patchTopic(slug, { status: 'error', generationPhase: 'invalid' });
            return res.status(422).json({ ok: false, error: 'INVALID_QUIZ', details: 'Must contain 5 valid questions with 4 options and correct index' });
        }
        // Attach (or generate) a persistent bonus question for this topic/day
        const bonus = await getGlobalBonusForToday(firestoreService);
        await firestoreService.patchTopic(slug, { generationPhase: 'aiGenerated' });

        Logger.db('[TopicQuiz] Saving generated quiz', { slug, questions: quizPayload.questions.length });
        const saved = await firestoreService.saveTopicQuiz(slug, date, quizPayload);
        if (saved) {
            await firestoreService.patchTopic(slug, { hasQuiz: true, lastQuizDate: date, status: 'ready', generationPhase: 'saved' });
        } else {
            Logger.error('[SaveTopicQuiz] failed to save quiz for', { slug, date });
            // attempt to fetch response from Firestore REST for debugging (best-effort)
            try {
                const baseUrl = firestoreService.getBaseUrl();
                const checkUrl = `${baseUrl}/topics/${slug}/quizzes/${date}`;
                const r = await fetch(checkUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                const txt = await r.text();
                Logger.error('[SaveTopicQuiz] fetch-after-fail status=' + String(r.status) + ' body=' + txt.slice(0, 2000));
            } catch (err) {
                Logger.error('[SaveTopicQuiz] debug fetch failed', err);
            }
            await firestoreService.patchTopic(slug, { status: 'error', generationPhase: 'error' });
        }
        // Increment after generation (count actual access)
        res.status(200).json({ fromCache: false, saved, quiz: quizPayload, bonus, usedScrapeContext: !!contextText });
    } catch (e) {
        Logger.error('Error generating topic quiz', e);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});


// Daily bonus question endpoint (generate once per day on demand)
app.get('/api/bonus/today', async (_req, res) => {
    try {
        const fs = new FirestoreRestService();
        const date = new Date().toISOString().slice(0, 10);
        const existing = await fs.getDailyBonusQuestion(date);
        if (existing) return res.json({ fromCache: true, bonus: existing });
        // Use the quiz generator which falls back to non-Gemini generator when key absent
        const hardPromptTopic = 'Ultra Obscure Interdisciplinary Trivia';
        const gen = await generateQuizWithGemini(hardPromptTopic, ['https://en.wikipedia.org/wiki/Knowledge'], undefined);
        const q = gen.questions && gen.questions.length ? gen.questions[0] : undefined;
        if (!q) return res.status(500).json({ error: 'NO_GENERATED_QUESTION' });
        await fs.saveDailyBonusQuestion(date, { question: q.question, options: q.options, correctAnswer: q.correctAnswer, difficulty: 'extreme' });
        const stored = await fs.getDailyBonusQuestion(date);
        res.json({ fromCache: false, bonus: stored });
    } catch (e) {
        Logger.error('Bonus generation failed', e);
        res.status(500).json({ error: 'BONUS_FAILED' });
    }
});

// (Optional) pruning endpoint stub – would delete leaderboards older than ?days (requires secure gating in real deploy)
app.post('/api/maintenance/pruneLeaderboards', async (req, res) => {
    const days = parseInt(String(req.body?.days || '3'), 10) || 3;
    // NOTE: Actual recursive delete of old dated subcollections is non-trivial via REST; stub acknowledges request.
    res.json({ ok: true, prunedOlderThanDays: days, note: 'Implement Firestore recursive deletion via Admin SDK or scheduled script offline.' });
});

// Separate quiz start endpoint for playCount increment (called when user actually begins quiz)
app.post('/api/topics/:slug/start', async (req, res) => {
    try {
        const { slug } = req.params;
        const firestoreService = new FirestoreRestService();
        await firestoreService.incrementTopicPlayCount?.(slug);
        Logger.info('[PlayCount] incremented (start)', { slug });
        res.json({ ok: true });
    } catch (e) {
        Logger.error('Error incrementing playCount at start', e);
        res.status(500).json({ ok: false, error: (e as Error).message });
    }
});

// Popular topics endpoint: topics whose playCount > average (and >0)
app.get('/api/topics/popular', async (_req, res) => {
    try {
        const fs = new FirestoreRestService();
        const list = await fs.listTopics?.();
        if (!list || !list.length) return res.json({ topics: [], average: 0 });
        // Fetch playCount for each
        const withCounts = await Promise.all(list.map(async t => {
            const full = await fs.getTopic(t.slug);
            return { ...t, playCount: full?.playCount ?? 0 };
        }));
        const nonZero = withCounts.filter(t => (t.playCount || 0) > 0);
        const avg = nonZero.length ? nonZero.reduce((s, t) => s + (t.playCount || 0), 0) / nonZero.length : 0;
        const popular = withCounts.filter(t => (t.playCount || 0) > avg && (t.playCount || 0) > 0);
        res.json({ topics: popular, average: avg });
    } catch (e) {
        Logger.error('Error in /api/topics/popular', e);
        res.status(500).json({ error: 'Failed to compute popular topics' });
    }
});

// Lightweight scraping endpoint
app.post('/api/scrape', async (req, res) => {
    const { url, selectors, waitForSelector } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
    const bl = new BrowserlessService();
    if (!bl.available()) return res.status(400).json({ error: 'Browserless not configured' });
    try {
        const out = await bl.scrape(url, { selectors, waitForSelector });
        res.json({ ok: true, ...out });
    } catch (e) {
        res.status(500).json({ ok: false, error: (e as Error).message });
    }
});

// --- Leaderboard & Stats Endpoints ---
app.post('/api/leaderboard/:slug/submit', async (req, res) => {
    try {
        const { slug } = req.params;
        const { score, timeTakenMs, nickname, userKey } = req.body || {};
        if (typeof score !== 'number' || typeof timeTakenMs !== 'number') return res.status(400).json({ ok: false, error: 'score and timeTakenMs required' });
        if (!nickname || typeof nickname !== 'string') return res.status(400).json({ ok: false, error: 'nickname required' });
        const lb = new LeaderboardService();
        const key = typeof userKey === 'string' && userKey ? userKey : 'anon';
        // Enforce one play per topic per day
        try {
            const today = new Date().toISOString().split('T')[0];
            const dailyEntries = await lb.list(slug, today);
            if (dailyEntries.some((e) => e.userKey === key)) {
                return res.status(429).json({ ok: false, error: 'ONE_PLAY_PER_DAY', message: 'You have already submitted for today.' });
            }
        } catch {/* ignore fetch issues and proceed */ }
        const result = await lb.submit(slug, { userKey: key, nickname, score, timeTakenMs });
        // Also submit to rolling leaderboard (persistent top results)
        try {
            await lb.submitRolling(slug, { userKey: key, nickname, score, timeTakenMs });
            // Update global totals (sum of all scores)
            await lb.addToGlobalTotals({ userKey: key, nickname, score, timeTakenMs });
        } catch (err) {
            Logger.error('[RollingSubmit] failed', err);
        }
        Logger.info('[LeaderboardSubmit]', { slug, score, timeTakenMs, key, updated: result.updated });
        // Increment completion stats only if updated (first or better score)
        if (result.updated) {
            await lb.incrementCompletion(slug);
        }
        // Always record an attempt history row (lightweight)
        try {
            const fs = new FirestoreRestService();
            const attemptDoc = {
                userKey: { stringValue: key },
                nickname: { stringValue: nickname },
                slug: { stringValue: slug },
                score: { integerValue: String(score) },
                timeTakenMs: { integerValue: String(timeTakenMs) },
                createdAt: { timestampValue: new Date().toISOString() },
            } as const;
            const baseUrl = fs.getBaseUrl();
            const url = `${baseUrl}/attempts`;
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: attemptDoc }) });
        } catch (err) {
            Logger.error('[AttemptRecord] failed', err);
        }
        res.json({ ok: result.ok, updated: result.updated });
    } catch (e) {
        Logger.error('[LeaderboardSubmit] error', e);
        res.status(500).json({ ok: false, error: 'SUBMIT_FAILED' });
    }
});

// Global totals leaderboard endpoint (sum across topics)
app.get('/api/leaderboard/global', async (req, res) => {
    try {
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
        const lb = new LeaderboardService();
        const list = await lb.listGlobalTotals(limit);
        res.json({ ok: true, entries: list });
    } catch (e) {
        Logger.error('[LeaderboardFetchGlobalTotals] error', e);
        res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
    }
});

// Fetch recent attempts history for a userKey (most recent first)
app.get('/api/history/:userKey', async (req, res) => {
    try {
        const { userKey } = req.params;
        if (!userKey) return res.status(400).json({ ok: false, error: 'userKey required' });
        const fs = new FirestoreRestService();
        const baseUrl = fs.getBaseUrl();
        const listUrl = `${baseUrl}/attempts?pageSize=50&orderBy=createdAt desc`;
        const r = await fetch(listUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!r.ok) return res.status(500).json({ ok: false, error: 'ATTEMPTS_FETCH_FAILED' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await r.json();
        const docs: unknown[] = data.documents || [];
        // filter by userKey client side (Firestore REST simple query avoided for simplicity now)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attempts = (docs as any[]).map(d => d.fields).filter(Boolean).map(f => ({
            userKey: f.userKey?.stringValue || 'anon',
            nickname: f.nickname?.stringValue || 'anon',
            slug: f.slug?.stringValue || 'unknown',
            score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
            timeTakenMs: f.timeTakenMs?.integerValue ? parseInt(f.timeTakenMs.integerValue, 10) : 0,
            createdAt: f.createdAt?.timestampValue || '',
        })).filter(a => a.userKey === userKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
        res.json({ ok: true, attempts });
    } catch (e) {
        Logger.error('[HistoryFetch] error', e);
        res.status(500).json({ ok: false, error: 'HISTORY_FAILED' });
    }
});

// NOTE: Endpoint name kept as /today for client compatibility, but now returns rolling (all-time) leaderboard top entries.
app.get('/api/leaderboard/:slug/today', async (req, res) => {
    try {
        const { slug } = req.params;
        const limit = Math.min(parseInt(String(req.query.limit || '25'), 10) || 25, 100);
        const lb = new LeaderboardService();
        const list = await lb.listRolling(slug);
        res.json({ ok: true, entries: list.slice(0, limit), rolling: true });
    } catch (e) {
        Logger.error('[LeaderboardFetchRolling] error', e);
        res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
    }
});

app.post('/api/topics/:slug/complete', async (req, res) => {
    try {
        const { slug } = req.params;
        const lb = new LeaderboardService();
        await lb.incrementCompletion(slug);
        Logger.info('[DailyStats] completion increment', { slug });
        res.json({ ok: true });
    } catch (e) {
        Logger.error('[DailyStats] error', e);
        res.status(500).json({ ok: false, error: 'INCR_FAILED' });
    }
});

// Landing summary: top3 (today) + popular (10-day sum of playsCompleted)
app.get('/api/landing/summary', async (_req, res) => {
    try {
        const fs = new FirestoreRestService();
        const lb = new LeaderboardService();
        const today = new Date().toISOString().split('T')[0];
        const topics = await fs.listTopics?.() || [];
        const topicDetails = await Promise.all(
            topics.map(async (t) => {
                try {
                    const full = await fs.getTopic(t.slug);
                    return { slug: t.slug, title: full?.title || t.title, playCount: full?.playCount || 0, lastGenerated: full?.lastGenerated || '' };
                } catch {
                    return { slug: t.slug, title: t.title, playCount: 0, lastGenerated: '' };
                }
            })
        );
        // For each topic, fetch today's leaderboard entries (top score only needed)
        const perTopicTop: { slug: string; title: string; topScore: number; nickname: string; timeTakenMs: number }[] = [];
        for (const t of topics) {
            try {
                const list = await lb.list(t.slug, today);
                if (list && list.length > 0) {
                    const topEntry = list[0];
                    if (topEntry) {
                        perTopicTop.push({ slug: t.slug, title: t.title, topScore: topEntry.score, nickname: topEntry.nickname, timeTakenMs: topEntry.timeTakenMs });
                    }
                }
            } catch (err) {
                Logger.error('[LandingSummary] per-topic leaderboard error', { slug: t.slug, err });
            }
        }
        // Fallback to rolling leaderboard if no daily data yet
        if (perTopicTop.length === 0) {
            for (const t of topics) {
                try {
                    const listR = await lb.listRolling(t.slug);
                    if (listR && listR.length > 0) {
                        const topEntry = listR[0];
                        if (topEntry) {
                            perTopicTop.push({ slug: t.slug, title: t.title, topScore: topEntry.score, nickname: topEntry.nickname, timeTakenMs: topEntry.timeTakenMs });
                        }
                    }
                } catch {/* ignore */ }
            }
        }
        perTopicTop.sort((a, b) => b.topScore - a.topScore || a.timeTakenMs - b.timeTakenMs);
        const top3 = perTopicTop.slice(0, 3);

        // Popular topics: sum playsCompleted over last 10 days
        const popular: { slug: string; title: string; totalCompletions: number }[] = [];
        const baseUrl = fs.getBaseUrl();
        const dates: string[] = Array.from({ length: 10 }).map((_, i): string => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString();
            const day = iso.split('T')[0];
            return day || iso.substring(0, 10);
        });
        for (const t of topics) {
            let sum = 0;
            for (const d of dates) {
                try {
                    const statsUrl = `${baseUrl}/topics/${t.slug}/stats/${d}`;
                    const r = await fetch(statsUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                    if (!r.ok) continue;
                    const data: unknown = await r.json();
                    if (data && typeof data === 'object' && 'fields' in data) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const f: any = (data as any).fields || {};
                        if (f.playsCompleted?.integerValue) sum += parseInt(f.playsCompleted.integerValue, 10) || 0;
                    }
                } catch (err) {
                    const msg = (err as Error)?.toString?.() || '';
                    if (msg.includes('404') || msg.includes('NOT_FOUND')) {
                        // benign: stats doc simply missing for that day
                    } else {
                        Logger.error('[LandingSummary] stats fetch error', { slug: t.slug, day: d, err });
                    }
                }
            }
            if (sum > 0) popular.push({ slug: t.slug, title: t.title, totalCompletions: sum });
        }
        if (popular.length === 0) {
            const sortedByPlays = topicDetails
                .filter((d) => (d.playCount || 0) > 0)
                .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                .slice(0, 6);
            sortedByPlays.forEach((d) => popular.push({ slug: d.slug, title: d.title, totalCompletions: d.playCount || 0 }));
        }
        if (popular.length === 0) {
            const recent = topicDetails
                .slice()
                .sort((a, b) => String(b.lastGenerated).localeCompare(String(a.lastGenerated)))
                .slice(0, 6);
            recent.forEach((d) => popular.push({ slug: d.slug, title: d.title, totalCompletions: 0 }));
        }
        popular.sort((a, b) => b.totalCompletions - a.totalCompletions);
        // Derive globalTop (top 10 across all topics today) and unique hotTopics list
        const globalEntries: { slug: string; title: string; nickname: string; score: number; timeTakenMs: number }[] = [];
        for (const t of topics) {
            try {
                const list = await lb.list(t.slug, today);
                list.forEach((e) => globalEntries.push({ slug: t.slug, title: t.title, nickname: e.nickname, score: e.score, timeTakenMs: e.timeTakenMs }));
            } catch {/* ignore */ }
        }
        if (globalEntries.length === 0) {
            for (const t of topics) {
                try {
                    const listR = await lb.listRolling(t.slug);
                    listR.slice(0, 5).forEach((e) => globalEntries.push({ slug: t.slug, title: t.title, nickname: e.nickname, score: e.score, timeTakenMs: e.timeTakenMs }));
                } catch {/* ignore */ }
            }
        }
        globalEntries.sort((a, b) => b.score - a.score || a.timeTakenMs - b.timeTakenMs);
        const globalTop = globalEntries.slice(0, 10);
        // Also fetch global totals leaderboard (sum of all scores)
        let globalTotals: Array<{ userKey: string; nickname: string; totalScore: number }> = [];
        try { globalTotals = await lb.listGlobalTotals(10); } catch {/* ignore */ }
        const hotTopics = Array.from(new Set([
            ...perTopicTop.map(p => p.slug),
            ...popular.map(p => p.slug),
            ...(perTopicTop.length === 0 && popular.length === 0
                ? topicDetails.slice().sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5).map(d => d.slug)
                : [])
        ])).map(slug => {
            const t = topics.find(tt => tt.slug === slug);
            return { slug, title: t?.title || slug };
        });
        res.json({ ok: true, top3, popular, globalTop, hotTopics, globalTotals });
    } catch (e) {
        Logger.error('[LandingSummary] error', e);
        res.status(500).json({ ok: false, error: 'SUMMARY_FAILED' });
    }
});

// Simple AI status endpoint
app.get('/api/ai/status', async (_req, res) => {
    if (!GEMINI_API_KEY) return res.json({ geminiKeyPresent: false, reachable: false, reason: 'NO_API_KEY' });
    try {
        const test = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { method: 'GET' });
        if (!test.ok) return res.json({ geminiKeyPresent: true, reachable: false, reason: `HTTP_${test.status}` });
        res.json({ geminiKeyPresent: true, reachable: true });
    } catch (e) {
        res.json({ geminiKeyPresent: true, reachable: false, reason: (e as Error).message });
    }
});

// Create a splash post (Devvit Web) for playtesting. Secure in production.
app.post('/api/splash/create', async (req, res) => {
    try {
        const subredditName = String(req.body?.subredditName || process.env.DEVVIT_SUBREDDIT || 'streax_bot_dev');
        const splashPayload = {
            appDisplayName: 'StreaxBot',
            backgroundUri: 'splash-background.png',
            appIconUri: 'app-icon.png',
            heading: 'Ready to Streak?',
            description: 'Prove Your Fandom. Master the Streak. Own the Leaderboard.',
            buttonLabel: 'Start Today\'s Quiz',
            entry: 'default',
        };

        const post = await reddit.submitCustomPost({
            subredditName,
            title: 'StreaxBot — Daily Quiz',
            splash: splashPayload,
            postData: {
                mode: 'daily',
                initialized: false
            }
        });
        res.json({ ok: true, post });
    } catch (e) {
        const msg = (e as Error)?.message || String(e);
        Logger.error('[SplashCreate] failed', e);
        res.status(500).json({ ok: false, error: 'SPLASH_CREATE_FAILED', message: msg });
    }
});

// Internal endpoint: called when app is installed (Devvit lifecycle)
app.post('/internal/on-app-install', async (_req, res) => {
    try {
        const result = await createPost();
        Logger.info('[OnAppInstall] post created', { id: result?.id });
        // Devvit UiResponse must only include allowed keys
        res.json({ showToast: `Post created: ${result?.id ?? 'unknown'}` });
    } catch (e) {
        Logger.error('[OnAppInstall] createPost failed', e);
        res.status(500).json({ showToast: `Failed to create post: ${(e as Error).message}` });
    }
});

// Internal endpoint: menu action to create a post on demand
app.post('/internal/menu/post-create', async (_req, res) => {
    try {
        const result = await createPost();
        Logger.info('[MenuPostCreate] post created', { id: result?.id });
        // Navigate the moderator to the created post in Reddit
        const ctxSub = (context as { subredditName?: string })?.subredditName || process.env.DEVVIT_SUBREDDIT || 'streax_bot_dev';
        const postId = result?.id || '';
        // Use comments URL — Devvit UI expects a navigateTo field for navigation responses
        res.json({ navigateTo: `https://reddit.com/r/${ctxSub}/comments/${postId}` });
    } catch (e) {
        Logger.error('[MenuPostCreate] createPost failed', e);
        res.status(500).json({ showToast: `Failed to create post: ${(e as Error).message}` });
    }
});

// Raw Gemini probe endpoint (diagnostic) - DO NOT expose in production without auth
app.post('/api/ai/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    if (!GEMINI_API_KEY) return res.status(400).json({ ok: false, reason: 'NO_API_KEY' });
    const { prompt } = req.body || {};
    const userText = typeof prompt === 'string' && prompt.trim().length > 0 ? prompt.trim() : 'Test topic: Elden Ring';
    const systemPrompt = 'Return STRICT JSON with a single key echo containing the provided text.';
    try {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const probeModel = 'gemini-1.5-flash'; // Fixed diagnostics model
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=` + GEMINI_API_KEY,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\nInput: ' + userText }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 128 },
                }),
                signal: controller.signal,
            }
        );
        clearTimeout(timeout);
        const ms = Date.now() - start;
        if (!resp.ok) return res.status(500).json({ ok: false, http: resp.status, ms });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await resp.json();
        const raw = JSON.stringify(data);
        let extracted = '';
        try {
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            extracted = text;
        } catch (err) {
            Logger.error('[SomeEndpointCatch] silent catch replaced', err);
        }
        res.json({ ok: true, ms, rawTruncated: raw.slice(0, 4000), extracted });
    } catch (e) {
        res.status(500).json({ ok: false, error: (e as Error).message });
    }
});

// In-memory cache for robot dialogues (prevents redundant AI/DB calls)
let ROBOT_DIALOGUE_CACHE: { date: string; lines: string[] } | null = null;

// Global error handling middleware (MUST be last)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
        Logger.error(`[AppError] ${err.code}: ${err.message}`, { statusCode: err.statusCode, path: req.path });
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Programming error - log but don't expose details
    Logger.error('[UnhandledError]', err);
    return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
    });
});

// Start the server
const server = createServer(app);
server.listen(getServerPort(), () => {
    Logger.info('Topic-based quiz bot server started');
});

export default Devvit;

