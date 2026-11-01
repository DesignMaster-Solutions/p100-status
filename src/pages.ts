// Pure teletext page builder. No I/O, no Date.now() inside, no input mutation.
// Produces pages whose every row is exactly 40 cells and every page is 24 rows.

import { GRID_COLS, GRID_ROWS, row, padPage, wrap } from './grid.js';
import type { NormalizedFeed, ComponentStatus } from './feeds.js';

export interface PageItem {
  kind: 'incident' | 'component';
  id: string;
  status: string;
  original: string;
  text: string;
  part: number;
  parts: number;
}

export interface Page {
  page: number;
  key: string; // e.g. "102/2"
  subpage: number;
  total: number;
  kind: 'index' | 'vendor' | 'about';
  label?: string;
  flashing: boolean;
  state?: NormalizedFeed['state'];
  green: boolean;
  source: string | null;
  retrievedAt: string | null;
  counts?: { components: number; affected: number; incidents: number | null };
  items: PageItem[];
  rows: string[];
}

export interface BuildResult {
  generatedAt: string;
  pages: Page[];
}

// Severity order for component sort; lower sorts first (worst first).
const SEVERITY: Record<ComponentStatus, number> = {
  major_outage: 0,
  partial_outage: 1,
  degraded_performance: 2,
  under_maintenance: 3,
  unknown: 4,
  operational: 5,
};

const CODE: Record<string, string> = {
  major_outage: 'MAJ',
  partial_outage: 'PAR',
  degraded_performance: 'DEG',
  under_maintenance: 'MNT',
  unknown: 'UNK',
  operational: ' OK',
};

const TEXT_WIDTH = GRID_COLS - 4; // 3-char status code + space
const CONTENT_ROWS = 18; // 24 - 4 summary - 2 footer
const INDEX_FOOTER = '100 INDEX  101-106 VENDORS  199 ABOUT';
const VENDOR_FOOTER = 'INC=INCIDENT  MAJ PAR DEG MNT UNK OK';

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function ageLabel(feed: NormalizedFeed): string {
  if (feed.ageSeconds === null) return 'NEVER';
  return `${feed.ageSeconds}s`;
}

/** Build the P100 service index page. */
function buildIndex(feeds: NormalizedFeed[]): Page {
  const lines: string[] = [];
  lines.push(row('VENDOR STATUS - NOT CUSTOMER UPTIME'));
  lines.push(row(''));
  for (const feed of feeds) {
    const num = String(feed.page);
    const name = feed.name.slice(0, 16).padEnd(16, ' ');
    lines.push(row(`${num} ${name} ${feed.label}`));
    lines.push(row(`    SOURCE AGE: ${ageLabel(feed)}`));
  }
  if (feeds.length === 0) lines.push(row('NO SOURCES - STATUS UNKNOWN'));

  const header = [row('P100 SERVICE INDEX'), row('')];
  const body = [...header, ...lines].slice(0, GRID_ROWS - 1);
  const rows = padPage([...body, row(INDEX_FOOTER)]);
  const green = feeds.length > 0 && feeds.every((f) => f.green);
  return {
    page: 100,
    key: '100/1',
    subpage: 1,
    total: 1,
    kind: 'index',
    flashing: feeds.some((f) => f.indicator === 'major'),
    green,
    source: null,
    retrievedAt: null,
    items: [],
    rows,
  };
}

/** Expand a feed's incidents then components into wrapped grid items. */
function feedItems(feed: NormalizedFeed): PageItem[] {
  const items: PageItem[] = [];

  const push = (
    kind: PageItem['kind'],
    id: string,
    status: string,
    original: string,
  ): void => {
    const segments = wrap(original, TEXT_WIDTH);
    segments.forEach((text, i) => {
      items.push({ kind, id, status, original, text, part: i + 1, parts: segments.length });
    });
  };

  // Incidents first (only when availability is known).
  const incidents = feed.incidentsAvailability === 'known' ? feed.incidents ?? [] : [];
  incidents.forEach((inc, i) => {
    const original = String(inc?.name ?? '(untitled)') || '(untitled)';
    push('incident', String(inc?.id ?? `incident-${i}`), 'incident', original);
  });

  // Components sorted worst-first, stable by ID; affected naturally precede operational.
  const sorted = [...feed.components].sort(
    (a, b) => (SEVERITY[a.status] ?? 4) - (SEVERITY[b.status] ?? 4) || compare(a.id, b.id),
  );
  sorted.forEach((c, i) => {
    const original = String(c.name ?? '(unnamed)') || '(unnamed)';
    push('component', String(c.id ?? `component-${i}`), c.status, original);
  });

  return items;
}

/** Build the one-or-more subpages for a single vendor. */
function buildVendor(feed: NormalizedFeed): Page[] {
  const items = feedItems(feed);
  const counts = {
    components: feed.components.length,
    affected: feed.affected.length,
    incidents: feed.incidentsAvailability === 'known' ? feed.incidents?.length ?? 0 : null,
  };
  const total = Math.max(1, Math.ceil(items.length / CONTENT_ROWS));
  const label =
    feed.state === 'unavailable' ? 'NO SIGNAL' : feed.state === 'stale' ? 'STALE' : feed.label;
  const incidentsLine = counts.incidents === null ? 'UNKNOWN' : String(counts.incidents);

  const pages: Page[] = [];
  for (let offset = 0; offset < total; offset++) {
    const slice = items.slice(offset * CONTENT_ROWS, (offset + 1) * CONTENT_ROWS);
    const content = slice.map((item) =>
      row(`${item.kind === 'incident' ? 'INC' : CODE[item.status] ?? 'UNK'} ${item.text}`),
    );
    while (content.length < CONTENT_ROWS) content.push(row(''));

    const rows = padPage([
      row(`P${feed.page} ${feed.name.toUpperCase()} ${offset + 1}/${total}`),
      row(label),
      row(`COMPONENTS: ${counts.components}  AFFECTED: ${counts.affected}`),
      row(`INCIDENTS: ${incidentsLine}`),
      ...content,
      row(`FETCHED ${feed.retrievedAt ?? 'NEVER'}`),
      row(VENDOR_FOOTER),
    ]);

    pages.push({
      page: feed.page,
      key: `${feed.page}/${offset + 1}`,
      subpage: offset + 1,
      total,
      kind: 'vendor',
      label,
      flashing: feed.indicator === 'major',
      state: feed.state,
      green: feed.state === 'success' && feed.green,
      source: feed.source,
      retrievedAt: feed.retrievedAt,
      counts,
      items: slice,
      rows,
    });
  }
  return pages;
}

/** Build the P199 sources-and-limits page. */
function buildAbout(feeds: NormalizedFeed[]): Page {
  const lines = [
    'Public vendor reports only.',
    'Not active monitoring or an SLA.',
    'No claim about your customer uptime.',
    'NO SIGNAL = request/schema failed.',
    'STALE = last successful source data.',
    'UNKNOWN does not mean operational.',
    'Age is time since retrieval, not',
    'time since the vendor last changed.',
    'Missing incidents are not zero.',
    '',
  ];
  for (const feed of feeds) {
    lines.push(`${feed.page} ${feed.name}: ${feed.source.replace(/^https?:\/\//, '')}`);
  }
  const body = [row('P199 SOURCES AND LIMITS'), ...lines.map(row)].slice(0, GRID_ROWS - 1);
  const rows = padPage([...body, row(INDEX_FOOTER)]);
  return {
    page: 199,
    key: '199/1',
    subpage: 1,
    total: 1,
    kind: 'about',
    flashing: false,
    green: false,
    source: null,
    retrievedAt: null,
    items: [],
    rows,
  };
}

/**
 * Pure transform: normalized feeds -> ordered teletext pages.
 * `now` is used only to stamp the generated time; page content never reads a
 * hidden clock. The input array is copied before any sort.
 */
export function buildPages(feeds: NormalizedFeed[], now: Date): BuildResult {
  const ordered = [...feeds].sort((a, b) => a.page - b.page);
  const pages: Page[] = [buildIndex(ordered)];
  for (const feed of ordered) pages.push(...buildVendor(feed));
  pages.push(buildAbout(ordered));
  return { generatedAt: now.toISOString(), pages };
}
