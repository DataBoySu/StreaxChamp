import { Devvit } from '@devvit/public-api';
import { Logger } from '../Logger';
import { CONFIG } from '../../shared/constants';
import { AppError } from '../utils/AppError';

/**
 * Current state of the AI circuit breaker.
 */
export let aiCircuitOpen = false;
export let aiLastFailureTime = 0;
export const aiCooldownMs = 120000; // 2 minute cooldown period

let geminiKeyValidated = false;
let geminiKeyWorks = false;
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let aiRequestsSinceTrip = 0;
let aiHealingAttempted = false;
const CIRCUIT_RETRY_THRESHOLD = 5;

/**
 * Attempts to "heal" the AI circuit breaker by checking Gemini health 
 * after a cooldown or request threshold is met.
 */
export async function attemptHealing(): Promise<{ healed: boolean; final: boolean }> {
    // Only attempt if circuit is open
    if (!aiCircuitOpen) return { healed: true, final: false };

    const cooldownElapsed = Date.now() - aiLastFailureTime > aiCooldownMs;
    // We increment requests on the controller side? Or here?
    // index.ts incremented requestsSinceTrip inside the route handler. 
    // Ideally we increment it here when queried?
    // Let's assume the controller calls this method to *check* and *maybe heal*.
    aiRequestsSinceTrip++;

    const thresholdReached = aiRequestsSinceTrip >= CIRCUIT_RETRY_THRESHOLD;

    if (cooldownElapsed || thresholdReached) {
        Logger.warn(`[CircuitBreaker] 🩹 System attempting AI self-repair... (Requests: ${aiRequestsSinceTrip}, Cooldown: ${cooldownElapsed})`);
        const healthy = await checkGeminiHealth();
        if (healthy) {
            aiCircuitOpen = false;
            aiRequestsSinceTrip = 0;
            aiHealingAttempted = false;
            return { healed: true, final: false };
        } else {
            Logger.warn('[CircuitBreaker] AI Still Down.');
            aiHealingAttempted = true;
            return { healed: false, final: true }; // Final means "we tried and failed, give up for now"
        }
    }

    if (aiHealingAttempted) {
        return { healed: false, final: true };
    }

    return { healed: false, final: false };
}

// --- Types ---
export interface GeneratedQuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: string;
    category: string;
    explanation?: string;
    createdAt: string;
}

export interface GeneratedQuizPayload {
    questions: GeneratedQuizQuestion[];
    metadata: { generatedAt: string; sourceWikis: string[]; version: string; model?: string; generator: 'gemini' | 'fallback' };
}

// --- Key Management ---
export function hydrateGeminiKeyFromSettings(): void {
    try {
        const anyDevvit = Devvit as unknown as { settings?: { get?: (k: string) => Promise<unknown> } };
        anyDevvit.settings?.get?.('gemini-api-key')
            .then((val) => {
                if (typeof val === 'string' && val.trim()) {
                    GEMINI_API_KEY = val.trim();
                    Logger.info('[AI] Gemini key loaded from Devvit settings');
                }
            })
            .catch(() => { });
    } catch { }
}

/**
 * Validates the Gemini API key. 
 * Performs a lazy validation (assumes valid if string exists) to save quota.
 */
export async function validateGeminiKey(): Promise<boolean> {
    if (geminiKeyValidated) return geminiKeyWorks;
    if (!GEMINI_API_KEY) {
        Logger.error('[AI] ❌ No Gemini API key configured in .env or settings');
        geminiKeyWorks = false;
        geminiKeyValidated = true;
        aiCircuitOpen = true;
        return false;
    }
    geminiKeyWorks = true;
    geminiKeyValidated = true;
    Logger.info('[AI] 🛡️ Gemini Status: ASSUME_VALID (Network check deferred to first real call)');
    return true;
}

// --- Helpers ---
function extractJSONCandidate(text: string): unknown | null {
    if (!text || typeof text !== 'string') return null;
    const fenceMatch = text.match(/```(?:\s*json)?\s*([\s\S]*?)```/i);
    const rawCandidate = fenceMatch && fenceMatch[1] ? String(fenceMatch[1]) : String(text);
    const raw = rawCandidate
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:\[[A-Z0-9_-]+\]|DEVVIT)\s*/i, ''))
        .join('\n')
        .replace(/^```[a-z]*\s*/i, '')
        .replace(/\s*```$/i, '');
    try { return JSON.parse(raw.trim()); } catch (e) { /* fall through */ }
    const idx = raw.indexOf('{') !== -1 ? (raw.indexOf('[') !== -1 ? Math.min(raw.indexOf('{'), raw.indexOf('[')) : raw.indexOf('{')) : raw.indexOf('[');
    if (idx === -1) return null;
    const slice = raw.slice(idx);
    const stack: string[] = [];
    for (let i = 0; i < slice.length; i++) {
        const ch = slice[i];
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') {
            const last = stack[stack.length - 1];
            if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
                stack.pop();
                if (stack.length === 0) {
                    try { return JSON.parse(slice.slice(0, i + 1)); } catch (err) { break; }
                }
            } else break;
        }
    }
    return null;
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- Generators ---

/**
 * Atomic pipeline to generate both topic metadata and a quiz in a single LLM pass.
 * Uses strict JSON response schema and atomic persistence.
 */
export async function generateUnifiedContent(rawTopic: string): Promise<{ topic: any, quiz: any, model: string, latencyMs: number }> {
    await validateGeminiKey();
    if (!GEMINI_API_KEY) throw AppError.aiFailure('NO_API_KEY');

    const model = CONFIG.GEMINI.CONTENT_MODEL || 'gemini-1.5-flash';
    const start = Date.now();
    Logger.ai(`[UnifiedGen] Starting atomic generation for input="${rawTopic}"`, { model });

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: CONFIG.GEMINI.PROMPTS.UNIFIED_GENERATOR }] },
                    contents: [{ role: 'user', parts: [{ text: rawTopic }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 16384,
                        response_mime_type: "application/json",
                        response_schema: {
                            type: "object",
                            properties: {
                                topic: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        slug: { type: "string" },
                                        sources: { type: "array", items: { type: "string" } }
                                    },
                                    required: ["title", "sources"]
                                },
                                quiz: {
                                    type: "object",
                                    properties: {
                                        questions: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    question: { type: "string" },
                                                    options: { type: "array", items: { type: "string" } },
                                                    correctAnswer: { type: "string" },
                                                    difficulty: { type: "string" },
                                                    category: { type: "string" },
                                                    explanation: { type: "string" }
                                                },
                                                required: ["question", "options", "correctAnswer", "difficulty", "category"]
                                            }
                                        }
                                    },
                                    required: ["questions"]
                                }
                            },
                            required: ["topic", "quiz"]
                        }
                    }
                })
            }
        );

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Gemini HTTP ${resp.status}: ${txt.slice(0, 100)}`);
        }

        const data: any = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJSONCandidate(text) as { topic: any, quiz: any };
        const latencyMs = Date.now() - start;

        if (!parsed?.topic?.sources || !Array.isArray(parsed.topic.sources) || parsed.topic.sources.length === 0) {
            Logger.warn('[UnifiedGen] Rejected: No sources found', { input: rawTopic });
            throw new AppError('NO_SOURCES_FOUND', 422);
        }

        const qList = parsed.quiz?.questions;
        if (!Array.isArray(qList) || qList.length < 5) {
            Logger.warn('[UnifiedGen] Rejected: Insufficient questions', { count: qList?.length });
            throw new AppError('INSUFFICIENT_QUESTIONS', 422);
        }

        return { topic: parsed.topic, quiz: parsed.quiz, model, latencyMs };

    } catch (e: any) {
        Logger.error('[UnifiedGen] Failed', e);
        if (e.status === 429 || e.status === 500) {
            aiCircuitOpen = true;
            aiLastFailureTime = Date.now();
        }
        throw e instanceof AppError ? e : AppError.aiFailure(e.message);
    }
}

export async function generateQuizWithGemini(topicTitle: string, topicSources: string[], contextText?: string): Promise<GeneratedQuizPayload> {
    await validateGeminiKey();
    if (!GEMINI_API_KEY) throw AppError.aiFailure('NO_API_KEY');

    const model = CONFIG.GEMINI.CONTENT_MODEL || 'gemini-1.5-flash';
    const trimmedContext = contextText ? contextText.slice(0, 25000) : '';
    const validQuestions: GeneratedQuizQuestion[] = [];
    const targetCount = 5;
    let attempts = 0;
    const maxAttempts = 3;

    Logger.ai(`[SmartGen] Starting generation for topic="${topicTitle}" Target=${targetCount}`, { model });

    while (validQuestions.length < targetCount && attempts < maxAttempts) {
        attempts++;
        const needed = targetCount - validQuestions.length;
        const existingTxt = validQuestions.map(q => q.question).join(" | ");
        const avoidPrompt = validQuestions.length > 0 ? `\nDO NOT repeat these questions: ${existingTxt}` : '';

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
                        maxOutputTokens: 16384,
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
                await delay(1000);
                continue;
            }

            const data: any = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const parsed = extractJSONCandidate(text) as any;
            const rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];

            let addedThisRound = 0;
            for (const q of rawList) {
                if (validQuestions.length >= targetCount) break;
                if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue;
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
            if (addedThisRound === 0) await delay(1000);

        } catch (e) {
            const status = (e as any)?.status;
            if (status === 429 || status === 500) {
                Logger.warn(`[SmartGen] Critical Failure (${status}): Tripping circuit for 120s cooldown.`);
                aiLastFailureTime = Date.now();
                aiCircuitOpen = true;
                break;
            }
            Logger.error(`[SmartGen] Error on attempt ${attempts}`, e);
            await delay(1500);
        }
    }

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

export async function generateRobotLines(): Promise<string[]> {
    await validateGeminiKey();
    if (!GEMINI_API_KEY) throw AppError.aiFailure('NO_API_KEY');

    const model = 'gemini-2.0-flash-exp'; // Specific creative model - or use LITE_MODEL
    const prompt = CONFIG.ROBOT.PROMPTS.SYSTEM;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 1024,
                        response_mime_type: "application/json"
                    }
                })
            }
        );

        if (!resp.ok) {
            throw new Error(`Gemini HTTP ${resp.status}`);
        }

        const data: any = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJSONCandidate(text) as { lines: string[] };

        if (parsed && Array.isArray(parsed.lines)) {
            return parsed.lines.filter(l => l && typeof l === 'string').slice(0, 10);
        }
        return [];
    } catch (e: any) {
        if (e.message && (e.message.includes('429') || e.message.includes('500'))) {
            aiCircuitOpen = true;
            aiLastFailureTime = Date.now();
        }
        Logger.error('[RobotGen] failed', e);
        throw e;
    }
}

export async function checkGeminiHealth(): Promise<boolean> {
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
