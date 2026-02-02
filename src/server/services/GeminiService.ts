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

// --- Validation ---

/**
 * STRICT VALIDATOR: Ensures quiz payload meets all requirements before DB persistence.
 * Returns detailed error list for debugging. Zero tolerance for malformed data.
 */
function validateQuizPayload(quiz: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Structure check
    if (!quiz || typeof quiz !== 'object') {
        errors.push('Quiz payload is not an object');
        return { valid: false, errors };
    }

    if (!Array.isArray(quiz.questions)) {
        errors.push('quiz.questions is not an array');
        return { valid: false, errors };
    }

    const questions = quiz.questions;

    // 2. Quantity check
    if (questions.length < 5) {
        errors.push(`Insufficient questions: ${questions.length} (minimum 5 required)`);
    }

    // 3. Individual question validation
    questions.forEach((q: any, idx: number) => {
        const qNum = idx + 1;

        // 3a. Question text
        if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
            errors.push(`Q${qNum}: Missing or empty question text`);
        } else if (q.question.length > 500) {
            errors.push(`Q${qNum}: Question too long (${q.question.length} chars, max 500)`);
        }

        // 3b. Options array
        if (!Array.isArray(q.options)) {
            errors.push(`Q${qNum}: options is not an array`);
        } else {
            if (q.options.length !== 4) {
                errors.push(`Q${qNum}: Wrong number of options (${q.options.length}, expected 4)`);
            }

            const seenOptions = new Set<string>();
            q.options.forEach((opt: any, optIdx: number) => {
                if (typeof opt !== 'string') {
                    errors.push(`Q${qNum}: Option ${optIdx + 1} is not a string`);
                } else if (opt.trim().length === 0) {
                    errors.push(`Q${qNum}: Option ${optIdx + 1} is empty`);
                } else if (opt.length > 200) {
                    errors.push(`Q${qNum}: Option ${optIdx + 1} too long (${opt.length} chars, max 200)`);
                } else {
                    const normalized = opt.trim().toLowerCase();
                    if (seenOptions.has(normalized)) {
                        errors.push(`Q${qNum}: Duplicate option detected "${opt}"`);
                    }
                    seenOptions.add(normalized);
                }
            });
        }

        // 3c. Correct answer validation
        if (q.correctAnswer === undefined || q.correctAnswer === null) {
            errors.push(`Q${qNum}: correctAnswer is missing`);
        } else if (typeof q.correctAnswer === 'number') {
            if (q.correctAnswer < 0 || q.correctAnswer > 3) {
                errors.push(`Q${qNum}: correctAnswer index out of bounds (${q.correctAnswer})`);
            }
        } else if (typeof q.correctAnswer === 'string') {
            // Verify it matches one of the options
            const hasMatch = q.options?.some((opt: string) =>
                opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
            );
            if (!hasMatch) {
                errors.push(`Q${qNum}: correctAnswer "${q.correctAnswer}" does not match any option`);
            }
        } else {
            errors.push(`Q${qNum}: correctAnswer has invalid type (${typeof q.correctAnswer})`);
        }

        // 3d. Difficulty
        const validDifficulties = ['easy', 'medium', 'hard'];
        // Normalize common AI hallucinations
        if (q.difficulty) {
            const d = String(q.difficulty).toLowerCase();
            if (d === 'high') q.difficulty = 'hard';
            else if (d === 'low') q.difficulty = 'easy';
            else q.difficulty = d;
        }

        if (!q.difficulty || !validDifficulties.includes(String(q.difficulty).toLowerCase())) {
            errors.push(`Q${qNum}: Invalid difficulty "${q.difficulty}" (must be easy/medium/hard)`);
        }

        // 3e. Category
        if (!q.category || typeof q.category !== 'string' || q.category.trim().length === 0) {
            errors.push(`Q${qNum}: Missing or empty category`);
        }

        // 3f. Explanation (optional but validated if present)
        if (q.explanation !== undefined && (typeof q.explanation !== 'string' || q.explanation.length > 1000)) {
            errors.push(`Q${qNum}: Invalid explanation (must be string, max 1000 chars)`);
        }
    });

    return { valid: errors.length === 0, errors };
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

        // SANITIZATION: Remove letter prefixes from options (A), B), C), D), etc.)
        // Gemini sometimes adds these despite instructions not to
        if (parsed?.quiz?.questions && Array.isArray(parsed.quiz.questions)) {
            parsed.quiz.questions.forEach((q: any, idx: number) => {
                if (Array.isArray(q.options)) {
                    q.options = q.options.map((opt: string) => {
                        if (typeof opt === 'string') {
                            // Remove patterns like "A) ", "B) ", "1. ", etc.
                            // Regex: ^[A-D]\)\s* or ^[1-4]\.\s*
                            return opt.replace(/^[A-D]\)\s*/i, '').replace(/^[1-4]\.\s*/, '').trim();
                        }
                        return opt;
                    });
                    Logger.ai(`  Q${idx + 1} options sanitized:`, q.options);
                }
            });
        }

        const qList = parsed.quiz?.questions;
        if (!Array.isArray(qList) || qList.length < 5) {
            Logger.warn('[UnifiedGen] Rejected: Insufficient questions', { count: qList?.length });
            throw new AppError('QUIZ_INSUFFICIENT_QUESTIONS', 422);
        }

        // STRICT VALIDATION: Verify quiz structure before accepting
        const validation = validateQuizPayload(parsed.quiz);
        if (!validation.valid) {
            Logger.error('[UnifiedGen] VALIDATION FAILED - Quiz rejected', {
                errorCount: validation.errors.length,
                errors: validation.errors
            });
            throw new AppError(`QUIZ_VALIDATION_FAILED: ${validation.errors[0]}`, 422);
        }

        Logger.ai('[UnifiedGen] ✅ Quiz passed strict validation');
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
