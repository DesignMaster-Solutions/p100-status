// Cloudflare Worker: the only module that touches the network, the cache and
// the clock. It fetches the six fixed feeds in parallel (5s timeout each),
// caches each in caches.default for 60s, normalizes and builds teletext pages.

import { PROVIDERS, type Provider } from './providers.js';
import { normalizeFeed, unavailableFeed, type NormalizedFeed } from './feeds.js';
import { buildPages, type BuildResult } from './pages.js';
import { renderHtml } from './render.js';

const TIMEOUT_MS = 5000;
const CACHE_TTL_S = 60;
const RETRIEVED_HEADER = 'x-p100-retrieved-at';

interface FetchOutcome {
  provider: Provider;
  raw?: unknown;
  retrievedAt?: string;
  error?: string;
}

/** Fetch one feed, preferring a fresh cache entry; honest retrieval time. */
async function fetchFeed(provider: Provider, now: Date): Promise<FetchOutcome> {
  const cache = caches.default;
  const cacheKey = new Request(provider.url, { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) {
    try {
      const raw = await cached.json();
      const retrievedAt = cached.headers.get(RETRIEVED_HEADER) ?? now.toISOString();
      return { provider, raw, retrievedAt };
    } catch {
      // Fall through to a live fetch if the cached body is unreadable.
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(provider.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'P100-DMS-TXT/0.1', Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const raw = JSON.parse(text);
    const retrievedAt = now.toISOString();

    // Store a copy stamped with the retrieval time so a later cache hit keeps
    // the ORIGINAL time rather than being restamped.
    const toCache = new Response(text, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${CACHE_TTL_S}`,
        [RETRIEVED_HEADER]: retrievedAt,
      },
    });
    await cache.put(cacheKey, toCache);
    return { provider, raw, retrievedAt };
  } catch (err) {
    return { provider, error: String((err as Error)?.message ?? err).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch and normalize all feeds; one failure never blanks the others. */
async function collectFeeds(now: Date): Promise<NormalizedFeed[]> {
  const outcomes = await Promise.all(PROVIDERS.map((p) => fetchFeed(p, now)));
  return outcomes.map((o) => {
    if (o.raw === undefined || o.retrievedAt === undefined) {
      return unavailableFeed(o.provider, o.error ?? 'no payload');
    }
    try {
      return normalizeFeed(o.provider, o.raw, o.retrievedAt);
    } catch (err) {
      return unavailableFeed(o.provider, String((err as Error)?.message ?? err));
    }
  });
}

async function build(now: Date): Promise<BuildResult> {
  const feeds = await collectFeeds(now);
  return buildPages(feeds, now);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date();

    if (url.pathname === '/api/pages') {
      const result = await build(now);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    if (url.pathname === '/' || url.pathname === '') {
      const result = await build(now);
      return new Response(renderHtml(result), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    return new Response('P100: not found. Try / or /api/pages', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
