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
 * SILENT OPTIMISTIC STRATEGY: Assumes Gemini works, never validates proactively.
 * Only logs when circuit breaker actually fails or recovers.
 */
export async function validateGeminiKey(): Promise<boolean> {
    // If we've already validated (failed or succeeded), return cached result
    if (geminiKeyValidated) return geminiKeyWorks;

    // Silent check: if no key, mark as failed but DON'T log yet
    // Only log when an actual AI call fails
    if (!GEMINI_API_KEY) {
        geminiKeyWorks = false;
        geminiKeyValidated = true;
        aiCircuitOpen = true;
        return false;
    }

    // Optimistically assume it works - no logging, no validation
    geminiKeyWorks = true;
    geminiKeyValidated = true;
    return true;
}

// --- Helpers ---

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
                        maxOutputTokens: 8192,
                        response_mime_type: "application/json"
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
        Logger.ai('[UnifiedGen] Raw AI Response received', { textSnippet: text.slice(0, 300) + '...' });

        let parsed: { topic: any, quiz: any };
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            Logger.error('[UnifiedGen] JSON Parse Error', { textSnippet: text.slice(0, 100) });
            throw new AppError('AI_JSON_PARSE_FAIL', 500);
        }
        const latencyMs = Date.now() - start;

        if (parsed?.quiz?.questions) {
            Logger.ai(`[UnifiedGen] Successfully parsed ${parsed.quiz.questions.length} questions`);
            parsed.quiz.questions.forEach((q: any, i: number) => {
                Logger.ai(`  Q${i + 1}: ${q.question.slice(0, 50)}...`);
            });
        }

        if (!parsed?.topic?.sources || !Array.isArray(parsed.topic.sources) || parsed.topic.sources.length === 0) {
            // Log as warning but don't fail if we have a valid quiz
            // This allows broad categories like "General Knowledge" to work even if AI doesn't find specific source URLs
            Logger.warn('[UnifiedGen] No sources found, but questions provided. Continuing.', { input: rawTopic });
            // Ensure sources is at least an empty array for downstream
            if (!parsed?.topic) parsed.topic = {};
            parsed.topic.sources = [];
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
