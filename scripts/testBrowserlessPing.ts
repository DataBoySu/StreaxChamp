import 'dotenv/config';

// Prefer explicit env var but allow hard-coded override ONLY for quick local tests.
// User supplied updated token; keep a single source of truth.
const TOKEN = process.env.BROWSERLESS_TOKEN || '';
const token = TOKEN || (() => {
  const ep = process.env.BROWSERLESS_ENDPOINT || '';
  const m = ep.match(/token=([^&]+)/i);
  return m ? m[1] : '';
})();
const region = process.env.BROWSERLESS_REGION || 'production-sfo';

async function main() {
  if (!token) {
    console.error('[PING] Missing BROWSERLESS_TOKEN (or token param in BROWSERLESS_ENDPOINT).');
    process.exit(1);
  }
  const url = `https://${region}.browserless.io/scrape?token=${encodeURIComponent(token)}`;
  // Basic scrape per docs verifying selector extraction and timing options.
  const basicScrape = {
    url: 'https://www.example.com/',
    elements: [ { selector: 'h1' } ],
    gotoOptions: { timeout: 10000, waitUntil: 'load' },
    waitForSelector: { selector: 'h1', timeout: 5000 }
  };
  console.log('[PING] POST', url, '\n[BODY]', basicScrape);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, body: JSON.stringify(basicScrape) });
    console.log('[PING] HTTP(scrape)', res.status);
    const raw = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch {
      console.error('[PING] Non-JSON response:', raw.slice(0, 400));
      process.exit(2);
    }
    if (!res.ok) {
      console.error('[PING] Error payload:', parsed);
      process.exit(3);
    }
    console.log('[PING] Data keys:', Array.isArray(parsed.data) ? parsed.data.map((d: any) => d.selector) : Object.keys(parsed));
    // Show first element result snippet
    const first = parsed?.data?.[0]?.results?.[0];
    if (first) {
      console.log('[PING] First result text:', first.text);
    }
  } catch (e) {
    console.error('[PING] Error:', e);
    process.exit(2);
  }
}

main();
