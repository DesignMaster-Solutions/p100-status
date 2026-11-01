// Property-based tests (requirement R6.2). For ANY feed input:
//  - every page is <=24 rows of <=40 chars (exactly, here)
//  - page numbers are unique per base and stable for the same service order
//  - unknown/failed feeds render NO SIGNAL and never throw

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeFeed, unavailableFeed, type NormalizedFeed } from '../../src/feeds.js';
import { buildPages } from '../../src/pages.js';
import { GRID_COLS, GRID_ROWS } from '../../src/grid.js';
import type { Provider } from '../../src/providers.js';

const providerArb = (page: number): fc.Arbitrary<Provider> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 12 }).map((s) => `p${page}-${s}`.slice(0, 20)),
    name: fc.fullUnicodeString({ maxLength: 30 }),
    url: fc.constant(`https://status.example-${page}.com/api/v2/summary.json`),
    page: fc.constant(page),
  });

// Arbitrary raw Statuspage-like payload with nasty text and arbitrary sizes.
const componentArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 8 }),
  name: fc.fullUnicodeString({ maxLength: 120 }), // includes control chars / long labels
  status: fc.constantFrom(
    'operational',
    'degraded_performance',
    'partial_outage',
    'major_outage',
    'under_maintenance',
    'teleporting', // unknown on purpose
  ),
});

const payloadArb = fc.record({
  page: fc.record({ updated_at: fc.constant('2026-10-31T00:00:00Z') }),
  status: fc.record({
    indicator: fc.constantFrom('none', 'minor', 'major', 'critical', 'maintenance', 'wat'),
  }),
  components: fc.array(componentArb, { maxLength: 60 }),
  incidents: fc.oneof(
    fc.constant(undefined), // missing -> unknown
    fc.array(fc.record({ id: fc.string(), name: fc.fullUnicodeString({ maxLength: 120 }) }), { maxLength: 5 }),
  ),
});

function assertGridBounds(pages: ReturnType<typeof buildPages>['pages']): void {
  for (const page of pages) {
    expect(page.rows.length).toBeLessThanOrEqual(GRID_ROWS);
    expect(page.rows.length).toBe(GRID_ROWS);
    for (const r of page.rows) {
      expect(r.length).toBeLessThanOrEqual(GRID_COLS);
      expect(r.length).toBe(GRID_COLS);
    }
  }
}

describe('property: grid bounds for arbitrary feeds', () => {
  it('every page is exactly 24 rows of 40 cells, never throws', () => {
    fc.assert(
      fc.property(fc.array(payloadArb, { minLength: 0, maxLength: 6 }), (payloads) => {
        const feeds: NormalizedFeed[] = payloads.map((payload, i) => {
          const prov: Provider = {
            id: `svc${i}`,
            name: `SVC${i}`,
            url: `https://status.example-${101 + i}.com/api/v2/summary.json`,
            page: 101 + i,
          };
          try {
            return normalizeFeed(prov, payload, '2026-10-31T15:00:00Z');
          } catch {
            return unavailableFeed(prov, 'invalid');
          }
        });
        const { pages } = buildPages(feeds, new Date('2026-10-31T15:30:00Z'));
        assertGridBounds(pages);
      }),
      { numRuns: 120 },
    );
  });
});

describe('property: page numbers unique and stable', () => {
  it('each vendor keeps a unique base page; order is stable for the same service order', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }).chain((n) =>
          fc.tuple(...Array.from({ length: n }, (_, i) => providerArb(101 + i))),
        ),
        (provs) => {
          const feeds = provs.map((p) =>
            normalizeFeed(p, { status: { indicator: 'none' }, components: [], incidents: [] }, '2026-10-31T15:00:00Z'),
          );
          const first = buildPages(feeds, new Date('2026-10-31T15:30:00Z')).pages;
          const second = buildPages(feeds, new Date('2026-10-31T15:31:00Z')).pages;

          // Base page numbers are unique per vendor (plus 100 index + 199 about).
          const vendorBases = first.filter((p) => p.kind === 'vendor').map((p) => p.page);
          expect(new Set(vendorBases).size).toBe(provs.length);

          // Stable: identical key sequence across two builds with the same order.
          expect(first.map((p) => p.key)).toEqual(second.map((p) => p.key));
        },
      ),
      { numRuns: 120 },
    );
  });
});

describe('property: failed feeds render NO SIGNAL and never throw', () => {
  it('unavailable feeds always produce a NO SIGNAL vendor page, never green', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1, maxLength: 6 }), (errors) => {
        const feeds = errors.map((e, i) =>
          unavailableFeed(
            { id: `svc${i}`, name: `SVC${i}`, url: `https://status.example-${101 + i}.com/api/v2/summary.json`, page: 101 + i },
            e,
          ),
        );
        const { pages } = buildPages(feeds, new Date('2026-10-31T15:30:00Z'));
        const vendors = pages.filter((p) => p.kind === 'vendor');
        expect(vendors.length).toBeGreaterThanOrEqual(1);
        for (const v of vendors) {
          expect(v.label).toBe('NO SIGNAL');
          expect(v.green).toBe(false);
        }
        assertGridBounds(pages);
      }),
      { numRuns: 120 },
    );
  });
});
