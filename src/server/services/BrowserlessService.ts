import 'dotenv/config';

export interface ScrapeSelectorResult {
  selector: string;
  results: Array<{
    text?: string;
    html?: string;
    attributes?: Array<{ name: string; value: string }>;
  }>;
}

export interface ScrapeResponseData {
  data: ScrapeSelectorResult[];
  raw?: unknown;
}

export interface ScrapeOptions {
  selectors?: string[];            // CSS selectors
  waitForSelector?: string;        // Optional waitForSelector
  waitTimeoutMs?: number;          // Timeout for waitForSelector
  gotoTimeoutMs?: number;          // Page navigation timeout
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  maxCharsPerSelector?: number;    // Trim large texts
}

export class BrowserlessService {
  private readonly token: string | undefined;
  private readonly region: string;
  private readonly explicitEndpoint: string | undefined;
  // Simple static in-memory cache (process lifetime). Not for multi-instance scaling.
  private static cache: Map<string, { text: string; hash: string; scrapedAt: number; bytes: number }> = new Map();
  private static CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

  constructor() {
    this.token = process.env.BROWSERLESS_TOKEN || undefined;
    this.region = process.env.BROWSERLESS_REGION || 'production-sfo';
    this.explicitEndpoint = process.env.BROWSERLESS_ENDPOINT || undefined; // Can be full URL (incl token)
  }

  available(): boolean { return !!(this.token || this.explicitEndpoint); }

  private buildScrapeUrl(): string | null {
    if (this.explicitEndpoint) {
      if (/\/scrape/.test(this.explicitEndpoint)) return this.explicitEndpoint;
      // If user gave base host, append /scrape
      if (/token=/.test(this.explicitEndpoint)) {
        const parts = this.explicitEndpoint.split('?');
        const base = parts[0] || '';
        const qs = parts[1] || '';
        return base.replace(/\/$/, '') + '/scrape' + (qs ? '?' + qs : '');
      }
      return this.explicitEndpoint.replace(/\/$/, '') + '/scrape';
    }
    if (!this.token) return null;
    return `https://${this.region}.browserless.io/scrape?token=${encodeURIComponent(this.token)}`;
  }

  async scrape(url: string, opts: ScrapeOptions = {}): Promise<ScrapeResponseData> {
    const endpoint = this.buildScrapeUrl();
    if (!endpoint) throw new Error('Browserless not configured');
    const selectors = (opts.selectors && opts.selectors.length > 0 ? opts.selectors : ['h1']).map(s => ({ selector: s }));
    const body: Record<string, unknown> = {
      url,
      elements: selectors,
    };
    if (opts.gotoTimeoutMs || opts.waitUntil) {
      body.gotoOptions = {
        timeout: opts.gotoTimeoutMs ?? 10000,
        ...(opts.waitUntil ? { waitUntil: opts.waitUntil } : {}),
      };
    }
    if (opts.waitForSelector) {
      body.waitForSelector = { selector: opts.waitForSelector, timeout: opts.waitTimeoutMs ?? 6000 };
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    let json: any;
    try { json = JSON.parse(rawText); } catch {
      throw new Error(`Non-JSON scrape response (status ${res.status}): ${rawText.slice(0,300)}`);
    }
    if (!res.ok) throw new Error(`Scrape failed HTTP_${res.status}`);
    const max = opts.maxCharsPerSelector ?? 4000;
    const data: ScrapeSelectorResult[] = Array.isArray(json.data) ? json.data.map((d: any) => ({
      selector: d.selector,
      results: (d.results || []).map((r: any) => ({
        text: r.text ? String(r.text).slice(0, max) : undefined,
        html: r.html ? String(r.html).slice(0, max) : undefined,
        attributes: Array.isArray(r.attributes) ? r.attributes.slice(0, 12).map((a: any) => ({ name: String(a.name), value: String(a.value).slice(0, 200) })) : [],
      })),
    })) : [];
    return { data, raw: json };
  }

  async extractReadableText(url: string): Promise<string> {
    // Cache lookup
    const now = Date.now();
    const cached = BrowserlessService.cache.get(url);
    if (cached && (now - cached.scrapedAt) < BrowserlessService.CACHE_TTL_MS) {
      return cached.text;
    }
    // Strategy: capture structural & semantic blocks but avoid comments/navigation.
    const selectors = ['h1', 'article', 'main', 'section', 'p'];
    try {
      const res = await this.scrape(url, { selectors, waitForSelector: 'body', waitUntil: 'load', maxCharsPerSelector: 8000 });
      const parts: string[] = [];
      for (const block of res.data) {
        for (const r of block.results) {
          const raw = (r.text || r.html || '').toString();
          if (!raw) continue;
          // Filter out likely comment / social / footer noise heuristically
          if (/comments?\b|login|signup|subscribe|share this|copyright|all rights reserved/i.test(raw)) continue;
          const cleaned = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
          const collapsed = cleaned.replace(/\s+/g, ' ').trim();
          if (collapsed.split(' ').length < 3) continue; // skip trivial fragments
          parts.push(collapsed);
        }
      }
      const joined = parts.join('\n').replace(/\s+/g, ' ').trim().slice(0, 120000);
      if (joined.length) {
        const hash = await this.hash(joined);
        BrowserlessService.cache.set(url, { text: joined, hash, scrapedAt: now, bytes: joined.length });
      }
      return joined;
    } catch {
      return ''; // graceful fallback
    }
  }

  async aggregateText(urls: string[], minBytes = 400, maxTotalChars = 60000): Promise<{ combined: string; sources: Array<{ url: string; bytes: number }> }> {
    const sources: Array<{ url: string; bytes: number }> = [];
    const chunks: string[] = [];
    for (const u of urls.slice(0, 6)) { // limit pages
      try {
        const txt = await this.extractReadableText(u);
        if (txt.length >= minBytes) {
          sources.push({ url: u, bytes: txt.length });
          chunks.push(`URL: ${u}\n${txt.slice(0, 8000)}`);
        }
      } catch {/* ignore */}
      if (chunks.join('\n').length > maxTotalChars) break;
    }
    return { combined: chunks.join('\n\n').slice(0, maxTotalChars), sources };
  }

  async hash(input: string): Promise<string> {
    const enc = new TextEncoder().encode(input);
    // Avoid crypto subtle for simplicity; small inline hash (FNV-1a) fallback
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < enc.length; i++) {
      const val = enc[i]!; // Uint8Array element always defined within bounds
      hash ^= val;
      hash = Math.imul(hash, 16777619);
    }
    return 'fnv1a32:' + (hash >>> 0).toString(16);
  }

  getCachedHash(url: string): string | undefined {
    const entry = BrowserlessService.cache.get(url);
    return entry?.hash;
  }
}

export default BrowserlessService;
