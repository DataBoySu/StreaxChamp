/**
 * Error Code Definitions and User-Friendly Messages
 * 
 * This module contains all error codes used throughout the application,
 * along with user-friendly messages and robot dialogue for each error type.
 */

export interface ErrorDefinition {
    code: string;
    userMessage: string;
    robotDialogue: string;
}

export const ERROR_MESSAGES: Record<string, ErrorDefinition> = {
    // ═══════════════════════════════════════════════════════════════
    // AI/Generation Errors
    // ═══════════════════════════════════════════════════════════════
    AI_GENERATION_FAILED: {
        code: 'AI_GENERATION_FAILED',
        userMessage: 'Gemini core unresponsive. Topic generation aborted. Try again later.',
        robotDialogue: 'The Great Eye refuses to cooperate. Stand by.'
    },

    QUIZ_VALIDATION_FAILED: {
        code: 'QUIZ_VALIDATION_FAILED',
        userMessage: 'Generated quiz data corrupted. Request denied.',
        robotDialogue: 'Invalid data detected. I refuse to serve garbage. Try another topic.'
    },

    // ═══════════════════════════════════════════════════════════════
    // Database Errors
    // ═══════════════════════════════════════════════════════════════
    DB_FAILURE: {
        code: 'DB_FAILURE',
        userMessage: 'Firestore connection lost. Cannot persist data.',
        robotDialogue: 'Memory banks offline. Your request cannot be processed.'
    },

    TOPIC_SAVE_FAILED: {
        code: 'TOPIC_SAVE_FAILED',
        userMessage: 'Topic save failed. Database error.',
        robotDialogue: 'Storage malfunction. Topic rejected.'
    },

    QUIZ_SAVE_FAILED: {
        code: 'QUIZ_SAVE_FAILED',
        userMessage: 'Quiz save failed. Database error.',
        robotDialogue: 'Quiz persistence failed. Firestore unresponsive.'
    },

    // ═══════════════════════════════════════════════════════════════
    // Validation Errors
    // ═══════════════════════════════════════════════════════════════
    INSUFFICIENT_QUESTIONS: {
        code: 'INSUFFICIENT_QUESTIONS',
        userMessage: 'Quiz has too few questions. Request rejected.',
        robotDialogue: 'Pathetic output. Minimum 5 questions required. Try again.'
    },

    INVALID_QUESTION_FORMAT: {
        code: 'INVALID_QUESTION_FORMAT',
        userMessage: 'Question format validation failed.',
        robotDialogue: 'Malformed question detected. Quality standards not met.'
    },

    // ═══════════════════════════════════════════════════════════════
    // Rate Limiting
    // ═══════════════════════════════════════════════════════════════
    RATE_LIMITED: {
        code: 'RATE_LIMITED',
        userMessage: 'Too many requests. Please wait before trying again.',
        robotDialogue: 'Quota exhausted. Cool your jets and return in 2 minutes.'
    },

    // ═══════════════════════════════════════════════════════════════
    // Network/Connection Errors
    // ═══════════════════════════════════════════════════════════════
    NETWORK_ERROR: {
        code: 'NETWORK_ERROR',
        userMessage: 'Network connection failed. Check your connection.',
        robotDialogue: 'Connection severed. Verify your network link.'
    },

    // ═══════════════════════════════════════════════════════════════
    // Generic Fallback
    // ═══════════════════════════════════════════════════════════════
    UNKNOWN_ERROR: {
        code: 'UNKNOWN_ERROR',
        userMessage: 'An unexpected error occurred. Please try again.',
        robotDialogue: 'System malfunction detected. Apologies for the disruption. Try again shortly.'
    }
};

/**
 * Get error definition by code, with fallback to UNKNOWN_ERROR
 */
export function getErrorDefinition(code: string): ErrorDefinition {
    const errorDef = ERROR_MESSAGES[code] as ErrorDefinition | undefined;
    return (errorDef || ERROR_MESSAGES.UNKNOWN_ERROR) as ErrorDefinition;
}
