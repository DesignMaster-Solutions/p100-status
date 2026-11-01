# P100 — Design

## Overview
A single Cloudflare Worker serves an inline teletext HTML client and a `/api/pages` JSON
endpoint. The Worker owns all I/O (network, cache, clock). Two pure modules do the data
work and are the only units imported by tests.

```
request ─▶ worker.ts
            ├─ fetchAllFeeds()  → providers.ts URLs, 5s timeout, caches.default 60s
            │       └─ per feed: raw payload | cache-hit | failure reason
            ├─ normalizeFeed()  (feeds.ts)  → NormalizedFeed (pure)
            ├─ buildPages(feeds, now) (pages.ts) → Page[] (pure, 40x24)
            └─ route:  GET /          → render.ts HTML  (pages embedded as JSON)
                       GET /api/pages → JSON { generatedAt, pages }
```

## Data model (`feeds.ts`)
```ts
type FeedState = 'success' | 'stale' | 'unavailable';
interface Component { id: string; name: string; status: ComponentStatus; rawStatus: string; }
interface NormalizedFeed {
  provider: string; name: string; source: string; page: number;   // 101..106
  state: FeedState; label: string;                                 // e.g. MAJOR, STALE, NO SIGNAL
  indicator: 'none'|'minor'|'major'|'critical'|'maintenance'|'unknown';
  components: Component[]; affected: Component[];
  incidentsAvailability: 'known'|'unknown'; incidents: Incident[] | null;
  retrievedAt: string | null; upstreamUpdatedAt: string | null;
  ageSeconds: number | null; green: boolean; error?: string;
}
```
Classification sets (closed vocabularies): indicators `none|minor|major|critical|
maintenance`; component statuses `operational|degraded_performance|partial_outage|
major_outage|under_maintenance`. Anything else → `unknown`. `green` is true only for
`indicator==='none' && affected===0 && incidentsAvailability==='known' &&
incidents.length===0` (R2.5). This mirrors the validated Codex reference in
`tools/feed-probe.mjs` but is reimplemented in TypeScript for the Worker.

## Grid (`grid.ts`)
`GRID_COLS=40`, `GRID_ROWS=24`. `ascii(text)` applies NFKD → strip `\u0300-\u036f` →
`\x00-\x1f\x7f`→space → other non-ASCII→`?`. `row(text)` = `ascii(text).slice(0,40).
padEnd(40)`. `padPage(rows)` pads/validates to exactly 24 rows of 40. A dev-time assertion
throws if any row ≠ 40 or page ≠ 24 so a layout bug fails loudly in tests; production render
clamps defensively.

## Page builder (`pages.ts`)
`buildPages(feeds: NormalizedFeed[], now: Date): Page[]` returns, in order:

1. **P100 index** — title (double-height on client), one entry per feed:
   `"<page> <provider≤18>  <label>"` and a `"  source age: Ns / NEVER"` line. 24 rows,
   footer nav row `100 INDEX  101-106 VENDORS  199 ABOUT`.
2. **P101..P106 vendor pages** — 4 summary rows (`P<page> <PROVIDER> n/N`, label,
   `COMPONENTS: c  AFFECTED: a`, `INCIDENTS: n|UNKNOWN`), 18 content rows, 2 footer rows.
   Content = incidents first (title, `INC`), then components sorted by severity
   (`major_outage<partial_outage<degraded_performance<under_maintenance<unknown<
   operational`) then by ID, each as `<3-char code> <text≤36>`. Names longer than 36 wrap
   onto further rows/subpages carrying `part/parts`. 18 items per subpage → `N` subpages.
   Unavailable/stale feeds render `NO SIGNAL` / `STALE` with retained timestamp.
3. **P199 about** — fixed limitation lines + per-source page/provider listing. Never green.

Page object:
```ts
interface PageItem { kind:'incident'|'component'; id:string; status:string;
  original:string; text:string; part:number; parts:number; }
interface Page { page:number; key:string; subpage:number; total:number;
  kind:'index'|'vendor'|'about'; label?:string; flashing:boolean;
  state?:FeedState; green:boolean; source:string|null; retrievedAt:string|null;
  counts?:{components:number;affected:number;incidents:number|null};
  items:PageItem[]; rows:string[]; }   // rows: exactly 24 × 40 chars
```
`flashing` is true when the page's vendor indicator is `major` (drives R5.3). Purity: no
`fetch`, no `Date.now()` inside; `now` only formats the generated timestamp. Input arrays
are copied before sorting.

## Worker (`worker.ts`)
- `fetchAllFeeds(env, now)`: `Promise.all` over providers. For each: build a `Request`,
  `caches.default.match` first; on miss `fetch` with `AbortController` (5s) and a browser
  `User-Agent`/`Accept`; on 200 JSON, `cache.put` a cloned response with
  `Cache-Control: max-age=60` and return `{raw, retrievedAt: now}`. On any error return
  `{error}`. A cache hit carries the stored retrieval time via a custom response header so
  the age is honest (R4.2 — never restamped).
- Map each result through `normalizeFeed`, or synthesize an `unavailable`/`stale` feed when
  the raw payload is missing. Then `buildPages`.
- Routes: `/` → `renderHtml(pagesJson, now)`; `/api/pages` → JSON with
  `Cache-Control: no-store` (the per-feed cache already bounds upstream load).

## Front end (`render.ts`)
One HTML string. CSS variables for the 8 teletext colours
(`black, red, green, yellow, blue, magenta, cyan, white`). The grid is a `<pre>`-style
monospace block sized in `ch`/`vmin` so 40×24 scales down intact at 360 px. Double-height
header via `transform: scaleY(2)` on row 0. Mosaic logo drawn from block glyphs
(`█ ▀ ▄ ▌ ▐`). CRT: a repeating-linear-gradient scanline overlay + faint flicker, both
gated by `@media (prefers-reduced-motion: reduce)`. Live clock updates the header each
second. MAJOR OUTAGE text gets a `flash` animation, also disabled under reduced motion.

Client JS: fetch `/api/pages` once, keep `pages` keyed by number; a digit buffer selects a
page (Backspace edits, Escape cancels, invalid → error line, current page kept);
previous/next cycle subpages; an on-screen remote mirrors keys with 0–9 and the four
fastext colour keys (red=index/100, green=prev, yellow=next, cyan=about/199). Provider text
is written with `textContent`. Keyboard focus is visible; the remote is reachable by tab.

## Testing strategy
- `test/unit/feeds.test.ts` — the eight `fixtures/cases.json` cases (indicator, affected
  count, incident availability, NO SIGNAL, STALE age, UNKNOWN, malformed body).
- `test/unit/pages.test.ts` — index/vendor/about assembly, Cloudflare 67-affected spans
  subpages with all affected before operational, OpenAI incidents UNKNOWN.
- `test/unit/properties.test.ts` — fast-check arbitraries generate feeds with arbitrary
  Unicode/control chars and component counts; assert 40×24 bounds, unique+stable page
  numbers, NO SIGNAL for failures, no throw.
Each case is observed red (logic absent/wrong) before green, per R6.1.
