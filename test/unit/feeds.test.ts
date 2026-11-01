// Acceptance cases from fixtures/cases.json (requirement R6.1).
// These exercise feeds.ts normalization and the unavailable/stale builders.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeFeed, unavailableFeed, staleFeed } from '../../src/feeds.js';
import { PROVIDERS } from '../../src/providers.js';

const root = fileURLToPath(import.meta.url).replace(/test[/\\]unit[/\\][^/\\]+$/, '');
const fixture = (rel: string): unknown => JSON.parse(readFileSync(root + rel, 'utf8'));
const provider = (id: string) => PROVIDERS.find((p) => p.id === id)!;

describe('feed normalization — acceptance cases', () => {
  it('cloudflare: 67 affected, major, incidents present and empty, base page 102', () => {
    const feed = normalizeFeed(provider('cloudflare'), fixture('fixtures/live/cloudflare.json'), '2026-10-31T15:19:35Z');
    expect(feed.indicator).toBe('major');
    expect(feed.affected.length).toBe(67);
    expect(feed.incidentsAvailability).toBe('known');
    expect(feed.incidents!.length).toBe(0);
    expect(feed.page).toBe(102);
    expect(feed.green).toBe(false);
  });

  it('openai: incidents field absent -> availability unknown, components preserved, no throw, page 103', () => {
    const run = () =>
      normalizeFeed(provider('openai'), fixture('fixtures/live/openai.json'), '2026-10-31T15:19:43Z');
    expect(run).not.toThrow();
    const feed = run();
    expect(feed.incidentsAvailability).toBe('unknown');
    expect(feed.indicator).toBe('none');
    expect(feed.components.length).toBeGreaterThan(0);
    expect(feed.incidents).toBeNull();
    expect(feed.page).toBe(103);
    expect(feed.green).toBe(false); // unknown incidents cannot be an all-clear
  });

  it('github: empty incidents array -> availability known, count 0, page 101, green', () => {
    const feed = normalizeFeed(provider('github'), fixture('fixtures/live/github.json'), '2026-10-31T15:19:35Z');
    expect(feed.incidentsAvailability).toBe('known');
    expect(feed.incidents!.length).toBe(0);
    expect(feed.page).toBe(101);
    expect(feed.green).toBe(true);
  });

  it('provider-timeout: NO SIGNAL, keeps base page, not green', () => {
    const feed = unavailableFeed(provider('github'), 'timeout');
    expect(feed.label).toBe('NO SIGNAL');
    expect(feed.page).toBe(101);
    expect(feed.green).toBe(false);
    expect(feed.state).toBe('unavailable');
  });

  it('stale-provider: age 300s, original retrievedAt retained, not green', () => {
    const fresh = normalizeFeed(provider('github'), fixture('fixtures/live/github.json'), '2026-10-31T15:00:00Z');
    const stale = staleFeed(fresh, new Date('2026-10-31T15:05:00Z'), 'timeout');
    expect(stale.state).toBe('stale');
    expect(stale.ageSeconds).toBe(300);
    expect(stale.retrievedAt).toBe('2026-10-31T15:00:00Z');
    expect(stale.green).toBe(false);
  });

  it('unknown-status: unrecognized indicator -> UNKNOWN, not green', () => {
    const payload = { status: { indicator: 'new_vendor_value' }, components: [], incidents: [] };
    const feed = normalizeFeed(provider('github'), payload, '2026-10-31T15:00:00Z');
    expect(feed.label).toBe('UNKNOWN');
    expect(feed.indicator).toBe('unknown');
    expect(feed.green).toBe(false);
  });

  it('malformed-body: non-JSON-shaped payload throws, caller turns it into NO SIGNAL', () => {
    expect(() => normalizeFeed(provider('github'), '<html>upstream failure</html>', '2026-10-31T15:00:00Z')).toThrow();
    const feed = unavailableFeed(provider('github'), 'invalid body');
    expect(feed.label).toBe('NO SIGNAL');
    expect(feed.green).toBe(false);
  });

  it('unknown component status stays visible and never defaults to operational', () => {
    const payload = {
      status: { indicator: 'none' },
      components: [{ id: 'a', name: 'Mystery', status: 'teleporting' }],
      incidents: [],
    };
    const feed = normalizeFeed(provider('github'), payload, '2026-10-31T15:00:00Z');
    expect(feed.components[0].status).toBe('unknown');
    expect(feed.components[0].rawStatus).toBe('teleporting');
    expect(feed.affected.length).toBe(1);
    expect(feed.green).toBe(false);
  });
});
