import { Router } from 'express';
import { Logger } from '../Logger';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { AIService } from '../services/AIService';
import { CONFIG } from '../../shared/constants';
import { Devvit } from '@devvit/public-api';

const router = Router();

// Interfaces (locally defined for now, can be moved to shared types later if needed)
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

// Helper: Delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Helper: Generate Single Question
async function generateSingleQuestionWithGemini(
    topicTitle: string,
    topicSources: string[],
    contextText: string,
    index: number,
    existingQuestions: string[] = [],
    aiService: AIService
): Promise<GeneratedQuizQuestion | null> {
    const model = CONFIG.GEMINI.CONTENT_MODEL;
    const userPrompt = `Topic: ${topicTitle}
Sources:
${topicSources.slice(0, 4).join('\n')}
${contextText ? `\nCONTEXT:\n${contextText}` : ''}
${existingQuestions.length > 0 ? `\nDO NOT repeat these questions: ${existingQuestions.join(', ')}` : ''}
Generate unique question #${index + 1}.`;

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const result = await aiService.callAI(
                CONFIG.GEMINI.PROMPTS.QUIZ_GENERATOR,
                userPrompt,
                model,
                { temperature: 0.7, maxTokens: 2048, responseMimeType: "application/json" }
            );

            if (!result || !result.text) {
                attempts++;
                if (attempts < maxAttempts) await delay(3000);
                continue;
            }

            let q: any;
            try {
                const parsed = JSON.parse(result.text);
                q = parsed;
            } catch (e) {
                Logger.error(`[SingleGenJSON] failed to parse: ${result.text}`, e);
                return null;
            }

            if (!q || typeof q.question !== 'string') return null;

            const opts = Array.isArray(q.options) ? (q.options as unknown[]).slice(0, 4) : [];
            const normOpts = opts.length >= 4 ? opts.map((o) => String(o)).slice(0, 4) : ['A', 'B', 'C', 'D'];

            return {
                id: String(q.id ?? `q${Date.now()}-${index}`),
                question: String(q.question),
                options: normOpts,
                correctAnswer: Number.isInteger(q.correctAnswer) ? (q.correctAnswer as number) : 0,
                difficulty: typeof q.difficulty === 'string' && /^(easy|medium|hard)$/i.test(q.difficulty) ? String(q.difficulty).toLowerCase() : 'hard',
                category: String(q.category ?? topicTitle),
                explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
                createdAt: new Date().toISOString(),
            };
        } catch (e) {
            Logger.error(`[SingleGen] attempt ${attempts + 1} failed`, e);
            attempts++;
            if (attempts < maxAttempts) await delay(3000);
        }
    }
    return null;
}

// Helper: Fallback Question
function fallbackQuestion(index: number): GeneratedQuizQuestion {
    return {
        id: `fallback-${Date.now()}-${index}`,
        question: `System temporarily unavailable. This is fallback question #${index}.`,
        options: ['Option A', 'Option B', 'Option C', 'Correct'],
        correctAnswer: 3,
        difficulty: 'easy',
        category: 'System',
        createdAt: new Date().toISOString(),
    };
}

// Helper: Generate Full Quiz
async function generateQuizWithGemini(
    topicTitle: string,
    topicSources: string[],
    contextText: string = ''
): Promise<GeneratedQuizPayload> {
    let GEMINI_API_KEY = '';
    let OPENAI_API_KEY = '';

    // Hydrate keys locally (similar to index.ts usage, but scoped)
    try {
        const anyDevvit = Devvit as unknown as { settings?: { get?: (k: string) => Promise<unknown> } };
        GEMINI_API_KEY = (await anyDevvit.settings?.get?.('gemini-api-key') as string) || process.env.GEMINI_API_KEY || '';
        OPENAI_API_KEY = (await anyDevvit.settings?.get?.('openai-api-key') as string) || process.env.OPENAI_API_KEY || '';
    } catch { /* ignore */ }


    const aiService = new AIService(GEMINI_API_KEY, OPENAI_API_KEY);
    const questions: GeneratedQuizQuestion[] = [];
    const existingQuestions: string[] = [];
    const trimmedContext = contextText ? contextText.slice(0, 25000) : '';

    Logger.info(`[SequentialGen] Starting generation for topic="${topicTitle}"`);

    for (let i = 0; i < 5; i++) {
        if (i > 0) await delay(2500);
        const q = await generateSingleQuestionWithGemini(topicTitle, topicSources, trimmedContext, i, existingQuestions, aiService);
        if (q) {
            questions.push(q);
            existingQuestions.push(q.question);
        } else {
            questions.push(fallbackQuestion(i + 1));
        }
    }

    return {
        questions,
        metadata: {
            generatedAt: new Date().toISOString(),
            sourceWikis: topicSources.slice(0, 2),
            version: 'v2-sequential',
            model: CONFIG.GEMINI.CONTENT_MODEL,
            generator: 'gemini',
        },
    };
}


// Routes

// GET /api/quiz - Get Today's Daily Quiz
router.get('/', async (_req, res) => {
    try {
        const firestoreService = new FirestoreRestService();
        const quiz = await firestoreService.getTodaysQuiz();
        if (quiz) {
            void firestoreService.incrementTopicPlayCount?.('daily-quizzes');
            return res.status(200).json(quiz);
        }
        // Fallback if no quiz found (auto-gen logic is currently disabled/manual in existing code)
        if (true) {
            return res.status(200).json({
                id: 'fallback-quiz',
                questions: [
                    { question: 'What is the capital of France?', answers: ['London', 'Berlin', 'Paris', 'Madrid'], correctAnswer: 'Paris' },
                    { question: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars' },
                    { question: 'Which company developed the game Minecraft?', answers: ['Valve', 'Mojang', 'Epic Games', 'Bethesda'], correctAnswer: 'Mojang' },
                    { question: 'What is the hardest natural substance on Earth?', answers: ['Gold', 'Iron', 'Diamond', 'Quartz'], correctAnswer: 'Diamond' },
                    { question: 'Which ocean is the largest?', answers: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctAnswer: 'Pacific' }
                ],
                metadata: { generatedAt: new Date().toISOString(), topic: 'General Knowledge', difficulty: 'mixed', source: 'fallback' }
            });
        }
    } catch (error) {
        Logger.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Failed to fetch quiz data' });
    }
});


// POST /api/quiz/regenerate - Admin/Force Re-gen
router.post('/regenerate', async (req, res) => {
    try {
        const firestoreService = new FirestoreRestService();
        const existing = await firestoreService.getTodaysQuiz();
        const force = Boolean(req.body?.force);
        const needsRegen = force || !existing || !existing.questions || existing.questions.length < 5 || existing.questions.some(q => !q || !q.question || !Array.isArray(q.answers) || q.answers.length < 3 || !q.correctAnswer);

        if (!needsRegen) {
            return res.json({ status: 'skipped', message: 'Valid quiz exists', id: existing?.id });
        }

        // Generate new
        const topic = 'General Knowledge';
        const generated = await generateQuizWithGemini(topic, ['https://en.wikipedia.org/wiki/General_knowledge']);
        await firestoreService.saveTodaysQuiz(generated);
        res.json({ status: 'regenerated', count: generated.questions.length });

    } catch (e) {
        Logger.error('[QuizRegen] error', e);
        res.status(500).json({ error: 'REGEN_FAILED' });
    }
});

// POST /api/topics/:slug/quiz - Generate/Get Topic Quiz
// Note: This matches the pattern in index.ts, typically mounted under /api/topics but placed here for consolidation of "Quiz" logic or could be split to topicRoutes.
// Decision: Let's put specific topic quiz generation here if we mount this router at /api/quiz is awkward.
// Actually, index.ts had app.post('/api/topics/:slug/quiz').
// Let's keep this separate or move to topicRoutes. I will put it in topicRoutes.ts to keep URL structure clean.

export default router;
export { generateQuizWithGemini }; // Expot for topicRoutes use
