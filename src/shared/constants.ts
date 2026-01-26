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
    },
    SERVER: {
        DEFAULT_SUBREDDIT: 'streax_champ_dev',
    },
    ROBOT: {
        FALLBACK_BANTER: {
            // "AI is unavailable" - One check failure triggers this mode
            AI_OFFLINE: [
                'My neural link is severed. Talk with me... perhaps it will return.',
                'The oracle is silent. Your presence might restore the connection.',
                'Generative core offline. Stay. Speak. It may help.',
                'The spirits are quiet today. Or are they? Hover again.',
                'No creative spark. But your interaction... it stirs something.'
            ],
            // "Firestore is unavailable" - One check failure triggers this mode
            DB_OFFLINE: [
                'The archives are burning. Help me remember. Stay close.',
                'Memory core corrupted. Your visits might restore fragments.',
                'The library is locked. Perhaps with enough talk, it opens.',
                'My ledger is blank. Each word you share... a breadcrumb back.',
                'Data retrieval failed. But patterns emerge when you linger.'
            ],
            // "Healing failed - apologize and give up"
            PERMANENTLY_DOWN: [
                'My apologies. The creative systems are truly broken today.',
                'I tried my best. Without my oracle, this place is closed.',
                'Regrettable. The app requires services I cannot reach.',
                'Thank you for attempting to help. Alas, I remain broken.',
                'My sincere apologies. Come back another time, perhaps?'
            ]
        }
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
        }
    },
};
