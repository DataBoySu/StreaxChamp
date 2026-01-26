import { Router } from 'express';
import { Logger } from '../Logger';
import { LeaderboardService } from '../services/LeaderboardService';
import { AIService } from '../services/AIService';
import { CONFIG } from '../../shared/constants';
import { Devvit } from '@devvit/public-api';

const router = Router();

// GET /api/leaderboard/:slug/today
router.get('/leaderboard/:slug/today', async (req, res) => {
    try {
        const { slug } = req.params;
        const limit = Math.min(parseInt(String(req.query.limit || '25'), 10) || 25, 100);
        const lb = new LeaderboardService();
        const list = await lb.listRolling(slug);
        res.json({ ok: true, entries: list.slice(0, limit), rolling: true });
    } catch (e) {
        Logger.error('[LeaderboardFetchRolling] error', e);
        res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
    }
});

// POST /api/topics/:slug/complete
router.post('/topics/:slug/complete', async (req, res) => {
    try {
        const { slug } = req.params;
        const lb = new LeaderboardService();
        await lb.incrementCompletion(slug);
        Logger.info('[DailyStats] completion increment', { slug });
        res.json({ ok: true });
    } catch (e) {
        Logger.error('[DailyStats] error', e);
        res.status(500).json({ ok: false, error: 'INCR_FAILED' });
    }
});

// GET /api/ai/status
router.get('/ai/status', async (_req, res) => {
    // Hydrate keys locally
    let GEMINI_API_KEY = '';
    try {
        const anyDevvit = Devvit as unknown as { settings?: { get?: (k: string) => Promise<unknown> } };
        GEMINI_API_KEY = (await anyDevvit.settings?.get?.('gemini-api-key') as string) || process.env.GEMINI_API_KEY || '';
    } catch { /* ignore */ }

    if (!GEMINI_API_KEY) return res.json({ geminiKeyPresent: false, reachable: false, reason: 'NO_API_KEY' });
    try {
        const test = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { method: 'GET' });
        if (!test.ok) return res.json({ geminiKeyPresent: true, reachable: false, reason: `HTTP_${test.status}` });
        res.json({ geminiKeyPresent: true, reachable: true });
    } catch (e) {
        res.json({ geminiKeyPresent: true, reachable: false, reason: (e as Error).message });
    }
});

// POST /api/ai/test (Dev only)
router.post('/ai/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production' && !req.header('x-dev-secret')) {
        return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }

    // Hydrate keys locally
    let GEMINI_API_KEY = '';
    let OPENAI_API_KEY = '';
    try {
        const anyDevvit = Devvit as unknown as { settings?: { get?: (k: string) => Promise<unknown> } };
        GEMINI_API_KEY = (await anyDevvit.settings?.get?.('gemini-api-key') as string) || process.env.GEMINI_API_KEY || '';
        OPENAI_API_KEY = (await anyDevvit.settings?.get?.('openai-api-key') as string) || process.env.OPENAI_API_KEY || '';
    } catch { /* ignore */ }

    const { prompt } = req.body;
    const aiService = new AIService(GEMINI_API_KEY, OPENAI_API_KEY);
    const start = Date.now();

    // Create a timeout promise
    const timeout = setTimeout(() => {
        // This is just to ensure we don't hang forever, though fetch usually has its own timeout
    }, 10000);

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000); // 8s timeout

        const model = CONFIG.GEMINI.LITE_MODEL;
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt || 'Hello' }] }],
                    generationConfig: { maxOutputTokens: 60 }
                }),
                signal: controller.signal,
            }
        );
        clearTimeout(timeout);
        const ms = Date.now() - start;
        if (!resp.ok) return res.status(500).json({ ok: false, http: resp.status, ms });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await resp.json();
        const raw = JSON.stringify(data);
        let extracted = '';
        try {
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            extracted = text;
        } catch (err) {
            Logger.error('[SomeEndpointCatch] silent catch replaced', err);
        }
        res.json({ ok: true, ms, rawTruncated: raw.slice(0, 4000), extracted });
    } catch (e) {
        res.status(500).json({ ok: false, error: (e as Error).message });
    }
});

export default router;
