#!/usr/bin/env ts-node
/**
 * Standalone Gemini connectivity & response test.
 * Does NOT depend on server or Devvit runtime.
 * Usage:
 *   npx ts-node -P tsconfig.scripts.json scripts/testGemini.ts "Elden Ring lore"
 * or via npm script: npm run ai:test "Elden Ring lore"
 */
import 'dotenv/config';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.error('[GeminiTest] No GEMINI_API_KEY or GOOGLE_API_KEY in environment');
  process.exit(1);
}

const userArg = process.argv.slice(2).join(' ').trim() || 'Test topic: Elden Ring';

const systemPrompt = `You are a topic normalizer. Return STRICT JSON with keys: title (canonical form), sources (array of 2-4 high quality URLs). JSON only.`;

interface AttemptResult {
  ok: boolean;
  status?: number;
  latencyMs: number;
  text?: string;
  error?: string;
  model: string;
}

async function singleAttempt(model: string, timeoutMs: number): Promise<AttemptResult> {
  const controller = new AbortController();
  const started = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [ { role: 'user', parts: [{ text: systemPrompt + '\nInput: ' + userArg }] } ],
          generationConfig: { temperature: 0.25, maxOutputTokens: 192 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    const latencyMs = Date.now() - started;
    if (!resp.ok) {
      return { ok: false, status: resp.status, latencyMs, model, error: `HTTP_${resp.status}` };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { ok: true, status: resp.status, latencyMs, text, model };
  } catch (e) {
    const latencyMs = Date.now() - started;
    return { ok: false, latencyMs, model, error: (e as Error).message };
  }
}

async function main() {
  const modelsPrimary = ['gemini-2.0-flash', 'gemini-2.0-flash-live-001'];
  const attempts: AttemptResult[] = [];
  for (const m of modelsPrimary) {
    for (let i = 0; i < 2; i++) { // two tries per model
      const r = await singleAttempt(m, 6000 + i * 2000);
      attempts.push(r);
      if (r.ok) {
        let parsed: any = null;
        let parseError: string | undefined;
        if (r.text) {
          try { parsed = JSON.parse(r.text.replace(/```json|```/g, '').trim()); } catch (e) { parseError = (e as Error).message; }
        }
        console.log(JSON.stringify({
          final: true,
          model: r.model,
          latencyMs: r.latencyMs,
          rawExtracted: r.text?.slice(0, 1200),
          parsed,
          parseError,
          attempts,
        }, null, 2));
        return;
      }
    }
  }
  // All failed
  console.error(JSON.stringify({ final: false, attempts }, null, 2));
  process.exit(2);
}

main();
