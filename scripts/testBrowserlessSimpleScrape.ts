import 'dotenv/config';

/*
 Simple Browserless /scrape API test.
 Usage:
   $env:BROWSERLESS_TOKEN='YOUR_TOKEN'
   npm run browserless:simple -- https://browserless.io/ https://www.example.com

 Accepts one or more URLs as CLI args. For each URL it posts to:
   https://<region>.browserless.io/scrape?token=TOKEN
 Region defaults to production-sfo (override with BROWSERLESS_REGION).

 Elements requested are a broad set to capture meaningful text; you can adjust via SELECTORS env
   $env:SELECTORS='h1,h2,article,main,p'
*/

const token = process.env.BROWSERLESS_TOKEN || (() => {
  const ep = process.env.BROWSERLESS_ENDPOINT || '';
  const m = ep.match(/token=([^&]+)/i); return m ? m[1] : '';
})();
const region = process.env.BROWSERLESS_REGION || 'production-sfo';
const selectors = (process.env.SELECTORS || 'h1,h2,article,main,p').split(',').map(s => s.trim()).filter(Boolean);

if (!token) {
  console.error('[SCRAPE] Missing BROWSERLESS_TOKEN');
  process.exit(1);
}

const base = `https://${region}.browserless.io/scrape?token=${token}`;

interface ScrapeRequest { url: string; elements: { selector: string }[]; }

async function scrape(url: string) {
  const payload: ScrapeRequest = { url, elements: selectors.map(s => ({ selector: s })) };
  try {
    const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, body: JSON.stringify(payload) });
    const json: any = await res.json();
    if (!res.ok) {
      console.error('[SCRAPE] HTTP', res.status, url, json);
      return { url, ok: false, status: res.status, error: json };
    }
    // Browserless returns shape like { data: { elements: [ { selector, html, text } ] } }
    const elements = json?.data?.elements || [];
    const combinedText: string = elements.map((e: any) => e.text || '').join('\n').replace(/\s+/g,' ').trim();
    console.log(`\n[SCRAPE] URL: ${url}`);
    console.log('[SCRAPE] Elements returned:', elements.length);
    console.log('[SCRAPE] Snippet:', combinedText.slice(0, 400));
    return { url, ok: true, textLength: combinedText.length };
  } catch (e) {
    console.error('[SCRAPE] Error', url, e);
    return { url, ok: false, error: (e as Error).message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('Usage: npm run browserless:simple -- <url1> [url2] ...');
    process.exit(1);
  }
  console.log('[SCRAPE] Base endpoint:', base);
  console.log('[SCRAPE] Selectors:', selectors.join(', '));
  for (const u of args) {
    await scrape(u);
  }
}

main();
