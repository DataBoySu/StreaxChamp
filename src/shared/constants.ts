/**
 * Centralized configuration for StreaxChamp.
 * This file contains non-sensitive configuration that persists across client/server.
 * Sensitive values (API keys) should be managed via environment variables or Devvit settings.
 */

export const CONFIG = {
    FIREBASE: {
        PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'streaxchamp',
        API_KEY: process.env.FIREBASE_API_KEY || '',
        AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
        STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
        MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        APP_ID: process.env.FIREBASE_APP_ID || '',
    },
    GAME: {
        NAME: 'StreaxChamp',
        DEFAULT_QUESTIONS_COUNT: 5,
        TIMER_DURATION: 15, // seconds
        BONUS_TIMER_DURATION: 15,
        PREDEFINED_TOPICS: ['Elden Ring', 'Dark Souls', 'Cyberpunk 2077', 'Minecraft'],
    },
    SERVER: {
        DEFAULT_SUBREDDIT: 'streax_champ_dev',
    },
    BROWSERLESS: {
        DEFAULT_REGION: 'production-sfo',
    },
    STORAGE_KEYS: {
        AUTH: 'streax.auth',
        MUSIC: 'streax.music',
        THEME: 'streax.theme',
    },
    INTERNAL: {
        VERSION: '0.1.0',
        BUILD_ENV: process.env.NODE_ENV || 'development',
    },
    GEMINI: {
        /** Cheapest model for simple tasks like normalization & categorization */
        LITE_MODEL: 'gemini-2.5-flash-lite',
        /** Capable model for complex reasoning and creative generation */
        CONTENT_MODEL: 'gemini-2.5-flash',
        PROMPTS: {
            TOPIC_NORMALIZER: `You are a precise topic normalizer for a quiz generator.\nGiven a user input topic string, 
                                return STRICT JSON with keys: title (canonical properly capitalized topic name), 
                                sources (array of 2-5 high-quality authoritative URLs—Wikipedia second if exists, 
                                then fandom.com, official site, IGN, etc. Only real pages).\nNO commentary. JSON only.`,

            QUIZ_GENERATOR: `You are an expert quiz generator. Your MISSION is to produce high-density, challenging questions for a gaming-focused quiz.
Output MUST be a SINGLE minified-style JSON object. DO NOT include markdown code blocks, backticks, or any conversational text.
Fields: id, question, options (4 specific strings), correctAnswer (0-3), difficulty, category, explanation.
STRICT RULES:
 - Questions must be challenging and factually accurate.
 - explanation must be ONE concise sentence starting with a direct fact.
 - Output MUST NOT be truncated. Keep your response concise to stay within token limits.
 - Return ONLY the JSON object.`
        },
        /** Configurable endpoint for OpenAI-compliant providers (OpenRouter, Groq, etc.) */
        OPENAI_ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
        /** Helper to determine if we should use Google native vs OpenAI-compatible API */
        getProvider: (model: string): 'google' | 'openai_compatible' => {
            if (!model) return 'google';
            // OpenAI-compatible providers require "provider/model_name" format (contains a slash)
            // Google Gemini-native models use the direct model name (no slash)
            return model.includes('/') ? 'openai_compatible' : 'google';
        }
    },
};
