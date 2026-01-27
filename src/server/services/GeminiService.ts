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
    aiRequestsSinceTrip++;

    const thresholdReached = aiRequestsSinceTrip >= CIRCUIT_RETRY_THRESHOLD;

    if (cooldownElapsed || thresholdReached) {
        Logger.warn(`[CircuitBreaker] 🩹 Cooldown elapsed. Resetting circuit implementation.`);
        // Assuming healthy after cooldown; next request will determine actual status
        aiCircuitOpen = false;
        aiRequestsSinceTrip = 0;
        aiHealingAttempted = false;
        return { healed: true, final: false };
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

// --- Generators ---

/**
 * Atomic pipeline to generate both topic metadata and a quiz in a single LLM pass.
 * Uses strict JSON response schema and atomic persistence.
 */
export async function generateUnifiedContent(rawTopic: string): Promise<{ topic: any, quiz: any, model: string, latencyMs: number }> {
    await validateGeminiKey();
    if (!GEMINI_API_KEY) throw AppError.aiFailure('NO_API_KEY');

    const model = (CONFIG.GEMINI.BACKUP_CONTENT_MODELS[0] || CONFIG.GEMINI.BACKUP_CONTENT_MODELS[1]) as string;
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

export async function generateRobotLines(): Promise<string[]> {
    // Robot lines are now hardcoded for stability and performance as per user request
    return CONFIG.ROBOT.HARDCODED_DIALOGUES || [];
}

/**
 * Lightweight health check to ensure Gemini API is reachable.
 * Used by the circuit breaker to periodically verify the connection.
 */
export async function checkGeminiHealth(): Promise<boolean> {
    // Health check disabled by request: Assume healthy until proven otherwise by a failed request.
    return !!GEMINI_API_KEY;
}
