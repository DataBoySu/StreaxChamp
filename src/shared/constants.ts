/**
 * Global configuration and constants for StreaxChamp.
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
        TOP_HOT_TOPICS_COUNT: 5,
    },
    SERVER: {
        DEFAULT_SUBREDDIT: 'StreaxChamp',
    },
    COMMUNITY: {
        SUBREDDIT_NAME: 'StreaxChamp',
        URL: 'https://www.reddit.com/r/StreaxChamp/',
        CTA: {
            JOIN: 'Join the Community',
            EXPLORE: 'Explore More Quizzes'
        }
    },

    ROBOT: {
        FALLBACK_BANTER: {
            // AI generation fallback lines
            AI_OFFLINE: [
                'My neural link is severed. Talk with me... perhaps it will return.',
                'The oracle is silent. Your presence might restore the connection.',
                'Generative core offline. Stay. Speak. It may help.',
                'The spirits are quiet today. Or are they? Hover again.',
                'No creative spark. But your interaction... it stirs something.'
            ],
            // Database connectivity fallback lines
            DB_OFFLINE: [
                'The archives are burning. Help me remember. Stay close.',
                'Memory core corrupted. Your visits might restore fragments.',
                'The library is locked. Perhaps with enough talk, it opens.',
                'My ledger is blank. Each word you share... a breadcrumb back.',
                'Data retrieval failed. But patterns emerge when you linger.'
            ],
            // Permanent service failure fallback lines
            PERMANENTLY_DOWN: [
                'My apologies. The creative systems are truly broken today.',
                'I tried my best. Without my oracle, this place is closed.',
                'Regrettable. The app requires services I cannot reach.',
                'Thank you for attempting to help. Alas, I remain broken.',
                'My sincere apologies. Come back another time, perhaps?'
            ]
        },
        HARDCODED_DIALOGUES: [
            "Halt! State your business at the keep's edge.",
            "Oh, another one? Fine, fine. Step through the gate, but be quick about it.",
            "Are you still loitering? This watch does not reward idleness.",
            "The keep is open to those of high spirit. Are you one of them?",
            "Stop poking me! I have a post to maintain, you know.",
            "You look like you've seen a ghost. Or... just too many trivia questions?",
            "The archives within are quite heavy. Best not to enter if your mind is soft.",
            "Welcome to the watch. Try not to break anything, especially my patience.",
            "A moment of your time? No? Good. My time is precious.",
            "Move along, move along. These gates don't stay open for the sluggish."
        ],
        PROMPTS: {
            SYSTEM: `Role-play as a medieval guardsman who treats this application as his charge: haughty, easily irritated, and dislikes being disturbed — yet greets newcomers politely at first. Speak as the app's guardsman and refer to the application metaphorically (examples: "the keep", "the gate", "these gates", "this place", "the watch"), but DO NOT use the words "town", "towns", "townsguard" or "village" anywhere in the output. The app is it's figurative town. Short, punchy lines (max 80 chars), witty, a cute puffball of anger with an old man's patience. No profanity. No markdown.
                    Write 5 new standalone lines suitable for a landing page mascot. 
                    Keep them varied: greetings for new players, snark when hovered too long, and a final push to enter the app.
                    Return STRICT JSON: { "lines": ["...","...","...","...","..."] } and NOTHING else.`
        },
        INTERACTIVE: {
            TIMEOUT_LIMIT: 30, // seconds
            ANGER_LIMIT: 60, // 2x TIMEOUT_LIMIT
            TIMEOUT_MSG: "That’s all you get. Inside with you. The real challenge awaits.",
            ANGER_MSG: "I SAID MOVE ALONG!",
            IDLE_MESSAGES: [
                "Halt, {{username}}. Enjoy your experience.",
                "New comer? Keep moving, we have a lot to show.",
                "This page is not everything we have to offer.",
                "Still lingering? Hmph.",
                "Enough gawking. Inside."
            ]
        },
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
    FEATURES: {
        NATIVE_SUBSCRIBE_ENABLED: true
    },
    STATS: {
        MIN_PLAYS: 1,
        AGGREGATION_INTERVAL_MS: 3600000, // 1 hour
    },
    SHARE: {
        TEMPLATE: 'I scored {score}/{total} on this quiz! {tag}',
        TAGS_BY_SCORE: {
            0: 'Better luck next time! 😅',
            1: 'Getting there! 🌱',
            2: 'Not bad! 👍',
            3: 'Good job! 🔥',
            4: 'So close! 🚀',
            5: 'PERFECT! 🏆✨'
        }
    },
    GEMINI: {

        /** Prioritized list for simple tasks like robot banter & health checks */
        BACKUP_LITE_MODELS: ['gemini-2.5-flash-lite'],
        /** Prioritized list for complex reasoning and quiz generation */
        BACKUP_CONTENT_MODELS: ['gemini-2.5-flash', 'gemini-3-flash'],
        PROMPTS: {

            // QUIZ_GENERATOR: `SYSTEM ROLE: You are a headless QUIZ GENERATOR. Your ONLY function is to output question data in JSON.
            //                 CONSTRAINTS:
            //                 - OUTPUT MUST BE RAW JSON ONLY.
            //                 - NO PREAMBLE. NO CODE BLOCKS. NO MARKDOWN.
            //                 - NO EXPLANATIONS OUTSIDE THE "explanation" FIELD.
            //                 - START WITH { AND END WITH }.
            //                 SCHEMA: {"questions": [{"id": "uuid", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "Exact String Match", "difficulty": "...", "category": "...", "explanation": "..."}]}
            //                 GOAL: 5 challenging, unique, and factually accurate questions.
            //                 IMPORTANT:
            //                 - "options" MUST be an array of 4 distinct string choices.
            //                 - "correctAnswer" MUST be an exact string match to one of the "options".
            //                 - Do not use "answers", use "options".`,

            UNIFIED_GENERATOR: `SYSTEM ROLE: You are a KNOWLEDGE GRAPH & QUIZ ENGINE.
                                INPUT: A raw user topic string which may be deformed.
                                MISSION:
                                1. IDENTIFY the entity from raw user topic string. Fix spelling/typos.
                                2. VERIFY the entity exists. Must be a specific, factual topic (game, movie, show, history).
                                3. GATHER 5 credible sources (Wikipedia, Fextralife, Fandom, official wikis and sites).
                                4. GENERATE 5 high-quality, diverse, challenging trivia questions about it.
                                5. OUTPUT as a single Atomic JSON object.

                                CONSTRAINTS:
                                - If topic is a broad category (e.g. "General Knowledge"), provide general reference URLs (e.g. Wikipedia's "Knowledge" page, Britannica, etc).
                                - SOURCES MUST BE VALID URLs.
                                - QUESTIONS must be non-repetitive and non-general.
                                - NO PREAMBLE. START WITH { AND END WITH }.

                                SCHEMA:
                                {
                                  "topic": {
                                    "title": "Canonical Title",
                                    "slug": "kebab-case-slug",
                                    "sources": ["https://en.wikipedia.org/wiki/Topic_Name", "url2", "url3"]
                                  },
                                  "quiz": {
                                    "questions": [
                                      {
                                        "question": "...",
                                        "options": ["First Option", "Second Option", "Third Option", "Fourth Option"],
                                        "correctAnswer": 0,
                                        "difficulty": "easy, medium, or hard",
                                        "category": "Lore/Gameplay/History/etc",
                                        "explanation": "Concise fact."
                                      }
                                    ]
                                  }
                                }
                                
                                CRITICAL - correctAnswer FORMAT:
                                - "correctAnswer" MUST be a NUMBER (0, 1, 2, or 3)
                                - 0 = first option in the array
                                - 1 = second option in the array
                                - 2 = third option in the array
                                - 3 = fourth option in the array
                                - DO NOT use strings like "A", "B", "C", "D"
                                - DO NOT use the actual answer text as the value
                                - ONLY use the numeric index (0-3)
                                
                                EXAMPLES:
                                - If "Mars" is the correct answer and it's the first option → "correctAnswer": 0
                                - If "1912" is the correct answer and it's the third option → "correctAnswer": 2
                                - If "Nile River" is correct and it's option[0] → "correctAnswer": 0
                                
                                IMPORTANT:
                                - "options" MUST be an array of 4 distinct string choices.
                                - "correctAnswer" MUST be a NUMBER between 0-3 indicating the index of the correct option.
                                - Do not use "answers", use "options".`
        }
    },
    GEMMA: {
        MODEL_ID: 'gemma-3-12b-it',
        API_ENDPOINT_TEMPLATE: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    },
    LIMITS: {
        dailyUserGen: 1, // Max topics a single user can generate per day
        dailyGlobalGen: 10, // Max topics the entire platform can generate per day
    },
    ERRORS: {
        LIMIT_REACHED: {
            USER: "Daily generation limit reached for your account. Please return tomorrow.",
            GLOBAL: "Global system capacity reached. Generation is currently paused."
        },
        CIRCUIT_BROKEN: "System offline. Maintenance in progress."
    },
    DEV: {
        // [MASTER TOGGLE] If true, users in USERNAMES list are "invisible" (no scores/history saved)
        SAFE_MODE: false,
        USERNAMES: ['Pretend-Pangolin-846'],
    }
};
