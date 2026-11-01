// Pure feed normalization. No network, no cache, no clock reads.
// Mirrors the validated Codex reference (tools/feed-probe.mjs) in TypeScript.

import type { Provider } from './providers.js';

export type Indicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance' | 'unknown';
export type ComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'
  | 'unknown';
export type FeedState = 'success' | 'stale' | 'unavailable';

export interface Component {
  id: string;
  name: string;
  status: ComponentStatus;
  rawStatus: string;
}

export interface Incident {
  id?: string;
  name?: string;
  [k: string]: unknown;
}

export interface NormalizedFeed {
  provider: string;
  name: string;
  source: string;
  page: number;
  state: FeedState;
  label: string;
  indicator: Indicator;
  components: Component[];
  affected: Component[];
  incidentsAvailability: 'known' | 'unknown';
  incidents: Incident[] | null;
  retrievedAt: string | null;
  upstreamUpdatedAt: string | null;
  ageSeconds: number | null;
  green: boolean;
  error?: string;
}

const INDICATORS = new Set<Indicator>(['none', 'minor', 'major', 'critical', 'maintenance']);
const COMPONENT_STATUSES = new Set<ComponentStatus>([
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function labelFor(indicator: Indicator): string {
  return indicator === 'unknown' ? 'UNKNOWN' : indicator.toUpperCase();
}

/**
 * Normalize a raw Statuspage summary.json payload for one provider.
 * Throws only on a structurally invalid payload; callers turn that into an
 * `unavailable` feed so one bad source never blanks the others.
 */
export function normalizeFeed(provider: Provider, payload: unknown, retrievedAt: string): NormalizedFeed {
  if (!isObject(payload) || !Array.isArray(payload.components)) {
    throw new Error('Invalid provider payload or components');
  }
  const rawComponents = payload.components;
  const componentsValid = rawComponents.every(
    (c) => isObject(c) && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.status === 'string',
  );
  if (!componentsValid) throw new Error('Invalid component entries');
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error('Invalid retrieval timestamp');

  const status = isObject(payload.status) ? payload.status : {};
  const rawIndicator = typeof status.indicator === 'string' ? (status.indicator as Indicator) : 'unknown';
  const indicator: Indicator = INDICATORS.has(rawIndicator) ? rawIndicator : 'unknown';

  const components: Component[] = (rawComponents as Record<string, unknown>[]).map((c) => {
    const raw = c.status as string;
    return {
      id: c.id as string,
      name: c.name as string,
      status: COMPONENT_STATUSES.has(raw as ComponentStatus) ? (raw as ComponentStatus) : 'unknown',
      rawStatus: raw,
    };
  });

  const incidentsKnown = Array.isArray(payload.incidents) && payload.incidents.every(isObject);
  const incidents = incidentsKnown ? (payload.incidents as Incident[]) : null;
  const affected = components.filter((c) => c.status !== 'operational');
  const page = isObject(payload.page) ? payload.page : {};
  const upstreamUpdatedAt = typeof page.updated_at === 'string' ? page.updated_at : null;

  // Missing incident data cannot establish an all-clear signal either.
  const green =
    indicator === 'none' && affected.length === 0 && incidentsKnown && incidents!.length === 0;

  return {
    provider: provider.id,
    name: provider.name,
    source: provider.url,
    page: provider.page,
    state: 'success',
    label: labelFor(indicator),
    indicator,
    components,
    affected,
    incidentsAvailability: incidentsKnown ? 'known' : 'unknown',
    incidents,
    retrievedAt,
    upstreamUpdatedAt,
    ageSeconds: 0,
    green,
  };
}

/** A feed that could not be fetched or parsed: NO SIGNAL, never green. */
export function unavailableFeed(provider: Provider, error: string): NormalizedFeed {
  return {
    provider: provider.id,
    name: provider.name,
    source: provider.url,
    page: provider.page,
    state: 'unavailable',
    label: 'NO SIGNAL',
    indicator: 'unknown',
    components: [],
    affected: [],
    incidentsAvailability: 'unknown',
    incidents: null,
    retrievedAt: null,
    upstreamUpdatedAt: null,
    ageSeconds: null,
    green: false,
    error: error.slice(0, 200),
  };
}

/**
 * Promote a previously successful feed to STALE, keeping its ORIGINAL retrieval
 * time (never restamped) and reporting age against `now`. Never green.
 */
export function staleFeed(previous: NormalizedFeed, now: Date, error: string): NormalizedFeed {
  const base = previous.retrievedAt ? Date.parse(previous.retrievedAt) : NaN;
  const ageSeconds = Number.isFinite(base) ? Math.max(0, Math.floor((now.getTime() - base) / 1000)) : null;
  return {
    ...previous,
    state: 'stale',
    label: 'STALE',
    green: false,
    ageSeconds,
    error: error.slice(0, 200),
  };
}
