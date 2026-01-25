/*
 Standalone experimental script:
 1. Takes a topic name and list of seed URLs.
 2. Uses Browserless (headless Chrome) via its HTTP endpoint to fetch & extract readable text.
 3. Chunks & trims content, builds a prompt.
 4. Calls Gemini to produce quiz questions.
 5. Prints resulting quiz JSON (and optionally could POST to local server endpoint for storage).

 Requirements:
  - Environment vars:
      GEMINI_API_KEY=...
      BROWSERLESS_ENDPOINT=https://chrome.browserless.io/content?token=YOUR_TOKEN  (or self-hosted)
  - Run with:  ts-node scripts/testTopicScrapeQuiz.ts "Elden Ring" https://eldenring.wiki.fextralife.com/Elden+Ring

 NOTE: This is a throwaway dev script (not production hardened). Delete when pipeline implemented.
*/

import 'dotenv/config';
import crypto from 'crypto';

interface ScrapeResult { url: string; text: string; bytes: number; }
interface QuizQuestion { id: string; question: string; options: string[]; correctAnswer: number; difficulty: string; category: string; explanation?: string; }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
// New env options:
//  BROWSERLESS_TOKEN   (just the token)
//  BROWSERLESS_REGION  (e.g. production-sfo) default production-sfo
//  BROWSERLESS_ENDPOINT (explicit override)
const REGION = process.env.BROWSERLESS_REGION || 'production-sfo';
const BL_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const RAW_BROWSERLESS = process.env.BROWSERLESS_ENDPOINT || '';

// Accept either a full URL (with token param) or just token value
let BROWSERLESS_CONTENT_ENDPOINT = '';
let BROWSERLESS_FUNCTION_ENDPOINT = '';
let BROWSERLESS_BQL_ENDPOINT = '';

if (BL_TOKEN && !RAW_BROWSERLESS) {
  // Construct region-specific base automatically
  const base = `https://${REGION}.browserless.io/chromium`;
  BROWSERLESS_BQL_ENDPOINT = `${base}/bql?token=${BL_TOKEN}`;
  BROWSERLESS_CONTENT_ENDPOINT = `https://${REGION}.browserless.io/content?token=${BL_TOKEN}`; // may not always exist but try
  BROWSERLESS_FUNCTION_ENDPOINT = `https://${REGION}.browserless.io/function?token=${BL_TOKEN}`;
}

if (RAW_BROWSERLESS) {
  if (/^https?:\/\//i.test(RAW_BROWSERLESS)) {
    // If user pasted a /content endpoint directly, normalize variants
    if (RAW_BROWSERLESS.includes('/content')) {
      BROWSERLESS_CONTENT_ENDPOINT = RAW_BROWSERLESS.split('?')[0];
      const tokenPart = RAW_BROWSERLESS.split('?')[1] || '';
      BROWSERLESS_FUNCTION_ENDPOINT = RAW_BROWSERLESS.replace('/content', '/function');
      BROWSERLESS_BQL_ENDPOINT = RAW_BROWSERLESS.replace('/content', '/bql');
      if (!BROWSERLESS_FUNCTION_ENDPOINT.includes('/function')) {
        BROWSERLESS_FUNCTION_ENDPOINT = RAW_BROWSERLESS + (RAW_BROWSERLESS.endsWith('/') ? '' : '/') + 'function';
      }
      if (tokenPart) {
        BROWSERLESS_CONTENT_ENDPOINT += '?' + tokenPart;
        if (!BROWSERLESS_FUNCTION_ENDPOINT.includes('?')) {
          BROWSERLESS_FUNCTION_ENDPOINT += '?' + tokenPart;
        }
        if (BROWSERLESS_BQL_ENDPOINT && !BROWSERLESS_BQL_ENDPOINT.includes('?')) {
          BROWSERLESS_BQL_ENDPOINT += '?' + tokenPart;
        }
      }
    } else if (RAW_BROWSERLESS.includes('/function')) {
      BROWSERLESS_FUNCTION_ENDPOINT = RAW_BROWSERLESS;
      BROWSERLESS_CONTENT_ENDPOINT = RAW_BROWSERLESS.replace('/function', '/content');
      BROWSERLESS_BQL_ENDPOINT = RAW_BROWSERLESS.replace('/function', '/bql');
    } else {
      // base host only
      const base = RAW_BROWSERLESS.replace(/\/$/, '');
      BROWSERLESS_CONTENT_ENDPOINT = base + '/content';
      BROWSERLESS_FUNCTION_ENDPOINT = base + '/function';
      BROWSERLESS_BQL_ENDPOINT = base + '/bql';
    }
  } else {
    // Treat as token only
    BROWSERLESS_CONTENT_ENDPOINT = `https://chrome.browserless.io/content?token=${RAW_BROWSERLESS}`;
    BROWSERLESS_FUNCTION_ENDPOINT = `https://chrome.browserless.io/function?token=${RAW_BROWSERLESS}`;
    BROWSERLESS_BQL_ENDPOINT = `https://chrome.browserless.io/chromium/bql?token=${RAW_BROWSERLESS}`;
  }
}

if (!(RAW_BROWSERLESS || BL_TOKEN)) {
  console.error('[SCRAPER] Missing BROWSERLESS_ENDPOINT or BROWSERLESS_TOKEN env');
} else {
  console.log('[SCRAPER] Browserless endpoints resolved:', { bql: BROWSERLESS_BQL_ENDPOINT, content: BROWSERLESS_CONTENT_ENDPOINT, function: BROWSERLESS_FUNCTION_ENDPOINT });
}
async function bqlScrape(url: string): Promise<ScrapeResult | null> {
  if (!BROWSERLESS_BQL_ENDPOINT) return null;
  try {
    const query = `mutation Extract($url: String!) {\n  goto(url: $url, waitUntil: load) { status url }\n  waitForTimeout(timeout: 900){ ok }\n  evaluate(expression: \"(function(){const kill=['nav','header','footer','script','style'];kill.forEach(s=>document.querySelectorAll(s).forEach(n=>n.remove()));return document.body.innerText.slice(0,120000);}())\") { value }\n}`;
    const body = { query, variables: { url } };
    const res = await fetch(BROWSERLESS_BQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { console.warn('[SCRAPE-bql] non-200', url, res.status); return null; }
    const json: any = await res.json();
    const value = json?.data?.evaluate?.value || '';
    if (typeof value !== 'string' || value.length < 200) return null;
    const text = value.replace(/\s+/g, ' ').trim();
    return { url, text, bytes: Buffer.byteLength(text, 'utf8') };
  } catch (e) { console.warn('[SCRAPE-bql] fail', url, e); return null; }
}

if (!GEMINI_API_KEY) {
  console.error('[AI] Missing GEMINI_API_KEY env (will fallback)');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function basicContentScrape(url: string): Promise<ScrapeResult | null> {
  if (!BROWSERLESS_CONTENT_ENDPOINT) return null;
  try {
    const target = `${BROWSERLESS_CONTENT_ENDPOINT}${BROWSERLESS_CONTENT_ENDPOINT.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;
    const res = await fetch(target, { method: 'GET' });
    if (!res.ok) { console.warn('[SCRAPE-basic] non-200', url, res.status); return null; }
    const json: any = await res.json();
    const raw = json.data?.text || json.data?.html || JSON.stringify(json).slice(0, 15000);
    const text = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { url, text, bytes: Buffer.byteLength(text, 'utf8') };
  } catch (e) { console.warn('[SCRAPE-basic] fail', url, e); return null; }
}

async function functionScrape(url: string): Promise<ScrapeResult | null> {
  if (!BROWSERLESS_FUNCTION_ENDPOINT) return null;
  try {
    const code = `async ({ page, context }) => {\n  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });\n  await page.setExtraHTTPHeaders({\n    'Accept-Language': 'en-US,en;q=0.9',\n  });\n  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');\n  await page.goto('${url.replace(/'/g, '%27')}', { waitUntil: 'networkidle' });\n  await page.waitForTimeout(1500);\n  const text = await page.evaluate(() => {\n    const blockers = ['nav','header','footer','script','style','noscript','form'];\n    blockers.forEach(sel => document.querySelectorAll(sel).forEach(n=>n.remove()));\n    return document.body.innerText.slice(0, 120000);\n  });\n  return { text };\n}`;
    const res = await fetch(BROWSERLESS_FUNCTION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (!res.ok) { console.warn('[SCRAPE-fn] non-200', url, res.status); return null; }
    const json: any = await res.json();
    const raw = json?.text || JSON.stringify(json).slice(0, 15000);
    const text = String(raw).replace(/\s+/g, ' ').trim();
    return { url, text, bytes: Buffer.byteLength(text, 'utf8') };
  } catch (e) { console.warn('[SCRAPE-fn] fail', url, e); return null; }
}

async function scrapeUrl(url: string): Promise<ScrapeResult | null> {
  // Try function (stealth) first, fallback to basic content, else null
  // Order: BQL -> function -> content
  let result = await bqlScrape(url);
  if (result && result.bytes > 500) return result;
  result = await functionScrape(url);
  if (result && result.bytes > 500) return result;
  if (!result) result = await basicContentScrape(url);
  if (result) return result;
  // Final fallback: if blocked domain like fextralife, try Wikipedia page if pattern suggests a game
  if (/fextralife\.com/i.test(url)) {
    const m = url.match(/https?:\/\/[^/]+\/([^/?#]+)/i);
    if (m && m[1]) {
      const wikiTitle = m[1].replace(/\+/g, '_');
      const alt = `https://en.wikipedia.org/wiki/${wikiTitle}`;
      console.warn('[SCRAPE] trying Wikipedia fallback', alt);
      return basicContentScrape(alt);
    }
  }
  return null;
}

function chunkText(text: string, maxChars = 4000): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
  return chunks;
}

function buildPrompt(topic: string, sources: ScrapeResult[]): { prompt: string; hash: string } {
  const combined = sources.map(s => `SOURCE: ${s.url}\n${s.text.slice(0, 2000)}`).join('\n\n');
  const base = `You are a game knowledge quiz generator. Topic: ${topic}\nYou will create EXACTLY 5 multiple-choice questions. Each question: JSON object with keys id, question, options (array of 4), correctAnswer (index 0-3), difficulty (easy|medium|hard), category, explanation.\nReturn STRICT JSON: { "questions": [...], "sourceWikis": [url1,...] }. No commentary.\nContext:\n${combined}`;
  const hash = 'sha256:' + crypto.createHash('sha256').update(base).digest('hex').slice(0, 16);
  return { prompt: base, hash };
}

async function callGeminiForQuiz(prompt: string): Promise<QuizQuestion[]> {
  if (!GEMINI_API_KEY) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `q${i + 1}`,
      question: `Offline placeholder question ${i + 1}?`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
      difficulty: 'medium',
      category: 'General',
    }));
  }
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-live-001'];
  let lastErr: unknown = null;
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 13000);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.45, maxOutputTokens: 900 } }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) { lastErr = new Error('HTTP_' + resp.status); continue; }
      const data: any = await resp.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let parsed: any = null;
      try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { lastErr = new Error('PARSE_FAIL'); continue; }
      if (!parsed?.questions) { lastErr = new Error('NO_QUESTIONS'); continue; }
      const qs: QuizQuestion[] = parsed.questions.slice(0,5).map((q: any, i: number) => ({
        id: String(q.id || `q${i+1}`),
        question: String(q.question || 'Missing question'),
        options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0,4).map((o: any)=>String(o)) : ['A','B','C','D'],
        correctAnswer: Number.isInteger(q.correctAnswer) ? q.correctAnswer : 0,
        difficulty: /^(easy|medium|hard)$/i.test(q.difficulty) ? q.difficulty.toLowerCase() : 'medium',
        category: String(q.category || 'General'),
        explanation: q.explanation ? String(q.explanation) : undefined,
      }));
      return qs;
    } catch (e) { clearTimeout(timeout); lastErr = e; await sleep(500); }
  }
  console.error('[AI] Gemini quiz generation failed, returning placeholders', lastErr);
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `q${i + 1}`,
    question: `Fallback placeholder question ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    difficulty: 'medium',
    category: 'General',
  }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: ts-node scripts/testTopicScrapeQuiz.ts "<Topic Name>" <url1> [url2 url3 ...]');
    process.exit(1);
  }
  const topic = args[0];
  const urls = Array.from(new Set(args.slice(1)));
  console.log('[SCRAPE] Starting topic:', topic, 'URLs:', urls.length);
  if (!RAW_BROWSERLESS) {
    console.error('\n[ERROR] BROWSERLESS_ENDPOINT not set. Add to .env:');
    console.error('BROWSERLESS_ENDPOINT=YOUR_TOKEN or full https://chrome.browserless.io/function?token=TOKEN');
  }
  const scraped: ScrapeResult[] = [];
  for (const u of urls) {
    const r = await scrapeUrl(u);
    if (r) { scraped.push(r); console.log('[SCRAPE] ok', u, r.bytes, 'bytes'); }
    await sleep(300);
  }
  if (!scraped.length) {
    console.error('[SCRAPE] No content extracted after fallbacks. Aborting.');
    process.exit(2);
  }
  const { prompt, hash } = buildPrompt(topic, scraped);
  console.log('[PROMPT] Hash', hash, 'chars', prompt.length);
  const questions = await callGeminiForQuiz(prompt);
  console.log('\n[RESULT] Quiz Questions JSON:\n', JSON.stringify({ topic, hash, questions }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
