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
        LITE_MODEL: 'gemini-2.5-flash',
        /** Capable model for complex reasoning and creative generation */
        CONTENT_MODEL: 'gemini-2.5-flash',
        PROMPTS: {
            TOPIC_NORMALIZER: `SYSTEM ROLE: You are a headless DATA PROCESSING UNIT. Your ONLY function is to normalize strings into JSON.
                                CONSTRAINTS:
                                - OUTPUT MUST BE RAW JSON ONLY.
                                - NO PREAMBLE (Do not say "Here is the JSON").
                                - NO CODE BLOCKS (Do not use \`\`\`json).
                                - NO MARKDOWN.
                                - NO EXPLANATIONS.
                                - START WITH { AND END WITH }.
                                SCHEMA: {"title": "Canonical Topic Name", "sources": ["URL1", "URL2", ...]}`,

            QUIZ_GENERATOR: `SYSTEM ROLE: You are a headless QUIZ GENERATOR. Your ONLY function is to output question data in JSON.
                            CONSTRAINTS:
                            - OUTPUT MUST BE RAW JSON ONLY.
                            - NO PREAMBLE. NO CODE BLOCKS. NO MARKDOWN.
                            - NO EXPLANATIONS OUTSIDE THE "explanation" FIELD.
                            - START WITH { AND END WITH }.
                            SCHEMA: {"questions": [{"id": "uuid", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0_3, "difficulty": "...", "category": "...", "explanation": "..."}]}
                            GOAL: 5 challenging, unique, and factually accurate questions.`,

            UNIFIED_GENERATOR: `SYSTEM ROLE: You are a KNOWLEDGE GRAPH & QUIZ ENGINE.
                                INPUT: A raw user topic string which may be deformed.
                                MISSION:
                                1. IDENTIFY the entity from raw user topic string. Fix spelling/typos.
                                2. VERIFY the entity exists. Must be a specific, factual topic (game, movie, show, history).
                                3. GATHER 5 credible sources (Wikipedia, Fextralife, Fandom, official wikis and sites).
                                4. GENERATE 5 high-quality, diverse, challenging trivia questions about it.
                                5. OUTPUT as a single Atomic JSON object.

                                CONSTRAINTS:
                                - If topic is nonsense or not a real factory entity, strict sources > 0 check will fail it.
                                - SOURCES MUST BE VALID URLs.
                                - QUESTIONS must be non-repetitive and non-general.
                                - NO PREAMBLE. START WITH { AND END WITH }.

                                SCHEMA:
                                {
                                  "topic": {
                                    "title": "Canonical Title",
                                    "slug": "kebab-case-slug",
                                    "sources": ["url1", "url2", "url3"]
                                  },
                                  "quiz": {
                                    "questions": [
                                      {
                                        "question": "...",
                                        "options": ["A", "B", "C", "D"],
                                        "correctAnswer": "A" | "B" | "C" | "D",
                                        "difficulty": "medium or high",
                                        "category": "Lore/Gameplay/History/etc",
                                        "explanation": "Concise fact."
                                      }
                                    ]
                                  }
                                }`
        }
    },
};
