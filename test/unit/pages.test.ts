// Page assembly tests (requirement R3, R4, R6.1).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeFeed, unavailableFeed, type NormalizedFeed } from '../../src/feeds.js';
import { buildPages } from '../../src/pages.js';
import { PROVIDERS } from '../../src/providers.js';
import { GRID_COLS, GRID_ROWS } from '../../src/grid.js';

const root = fileURLToPath(import.meta.url).replace(/test[/\\]unit[/\\][^/\\]+$/, '');
const fixture = (rel: string): unknown => JSON.parse(readFileSync(root + rel, 'utf8'));
const provider = (id: string) => PROVIDERS.find((p) => p.id === id)!;
const now = new Date('2026-10-31T15:30:00Z');

function allLiveFeeds(): NormalizedFeed[] {
  return PROVIDERS.map((p) => normalizeFeed(p, fixture(`fixtures/live/${p.id}.json`), '2026-10-31T15:19:35Z'));
}

describe('buildPages — structure', () => {
  const { pages } = buildPages(allLiveFeeds(), now);

  it('every page is exactly 24 rows of 40 cells', () => {
    for (const page of pages) {
      expect(page.rows.length).toBe(GRID_ROWS);
      for (const r of page.rows) expect(r.length).toBe(GRID_COLS);
    }
  });

  it('has the index (100), six vendors (101-106) and about (199)', () => {
    const basePages = new Set(pages.map((p) => p.page));
    expect(basePages.has(100)).toBe(true);
    expect(basePages.has(199)).toBe(true);
    for (let n = 101; n <= 106; n++) expect(basePages.has(n)).toBe(true);
  });

  it('does not mutate the input feeds', () => {
    const feeds = allLiveFeeds();
    const snapshot = feeds.map((f) => f.components.map((c) => c.id).join(','));
    buildPages(feeds, now);
    const after = feeds.map((f) => f.components.map((c) => c.id).join(','));
    expect(after).toEqual(snapshot);
  });
});

describe('buildPages — cloudflare 67 affected across subpages', () => {
  const feed = normalizeFeed(provider('cloudflare'), fixture('fixtures/live/cloudflare.json'), '2026-10-31T15:19:35Z');
  const { pages } = buildPages([feed], now);
  const vendor = pages.filter((p) => p.page === 102);

  it('spans multiple subpages with a stable base page number', () => {
    expect(vendor.length).toBeGreaterThan(1);
    expect(vendor.every((p) => p.page === 102)).toBe(true);
    expect(vendor.map((p) => p.subpage)).toEqual(vendor.map((_, i) => i + 1));
  });

  it('keeps all 481 components and shows all affected before any operational', () => {
    const components = vendor.flatMap((p) => p.items).filter((i) => i.kind === 'component' && i.part === 1);
    expect(components.length).toBe(481);
    const firstOperational = components.findIndex((c) => c.status === 'operational');
    const lastAffected = components.map((c) => c.status !== 'operational').lastIndexOf(true);
    expect(lastAffected).toBeLessThan(firstOperational);
  });

  it('is marked flashing (major) and never green', () => {
    expect(vendor[0].flashing).toBe(true);
    expect(vendor.every((p) => p.green === false)).toBe(true);
  });
});

describe('buildPages — openai incidents unknown', () => {
  const feed = normalizeFeed(provider('openai'), fixture('fixtures/live/openai.json'), '2026-10-31T15:19:35Z');
  const page = buildPages([feed], now).pages.find((p) => p.page === 103)!;

  it('shows INCIDENTS: UNKNOWN and is not green', () => {
    expect(page.rows.some((r) => r.startsWith('INCIDENTS: UNKNOWN'))).toBe(true);
    expect(page.counts!.incidents).toBeNull();
    expect(page.green).toBe(false);
  });
});

describe('buildPages — unavailable feed', () => {
  const page = buildPages([unavailableFeed(provider('github'), 'timeout')], now).pages.find((p) => p.page === 101)!;

  it('renders NO SIGNAL, keeps page number, FETCHED NEVER, never green', () => {
    expect(page.label).toBe('NO SIGNAL');
    expect(page.page).toBe(101);
    expect(page.green).toBe(false);
    expect(page.rows.some((r) => r.startsWith('FETCHED NEVER'))).toBe(true);
  });
});

describe('buildPages — index', () => {
  const page = buildPages(allLiveFeeds(), now).pages.find((p) => p.page === 100)!;

  it('lists every vendor with its page number and label', () => {
    for (const p of PROVIDERS) {
      expect(page.rows.some((r) => r.trim().startsWith(String(p.page)))).toBe(true);
    }
  });
});
