# Tech steering — P100

## Runtime
- **Cloudflare Worker**, TypeScript, **no framework**. One `fetch` handler serving:
  - `GET /` → one self-contained HTML page (markup + CSS + JS inline, no build step).
  - `GET /api/pages` → JSON of all teletext pages.
- `wrangler.toml` with `main = "src/worker.ts"`, `compatibility_date` set. Run locally
  with `npx wrangler dev`.

## Data path
- Fetch the six fixed `summary.json` feeds **in parallel**, **5 s per-source timeout**
  via `AbortController`.
- Cache responses **60 s** using `caches.default` keyed by feed URL. A cache hit keeps the
  **original retrieval time**; it is never restamped with the current time.
- One failed provider cannot blank the other five.

## Pure core (unit-testable)
- `src/feeds.ts` — `normalizeFeed(provider, payload, retrievedAt)`: validates shape,
  classifies overall indicator and component statuses, tracks `incidentsAvailability`
  (`known`/`unknown`), computes `green` (only `none` + zero affected + known-empty
  incidents). Never defaults an unknown string to operational.
- `src/pages.ts` — **`buildPages(feeds, now)`**: pure function, no I/O, no mutation of
  input. Converts normalized feeds into teletext pages that fit a strict **40×24**
  character grid. Deterministic truncate/wrap. Stable, unique page numbers for a given
  service order. Vendor overflow spans subpages; affected components precede operational.

## Display alphabet
Provider text is normalized for the grid with NFKD, combining marks stripped, control
chars → space, remaining non-ASCII → `?`. This is a lossy **display** conversion; the full
original string is retained in page item metadata for an accessible detail view. Provider
text is rendered with `textContent`, never `innerHTML`.

## Front end
Authentic teletext: 40×24 grid, the 8 teletext colours, double-height header row, blocky
mosaic logo, flashing MAJOR OUTAGE, live clock header, CRT scanlines. Page entry via digit
keys and an on-screen remote (0–9 + red/green/yellow/cyan fastext). Works at 360 px wide;
respects `prefers-reduced-motion` (no flashing, no scanline animation).

## Testing
- **Vitest** unit tests for the acceptance cases in `fixtures/cases.json`.
- **fast-check** property-based tests: for ANY feed input, every page is ≤24 lines of
  ≤40 chars; page numbers unique and stable for the same service order; unknown/failed
  feeds render as `NO SIGNAL` and never throw.
- Live network calls stay out of the unit suite.

## Conventions
TypeScript strict. Pure functions take `now` as an argument (no hidden `Date.now()` inside
`buildPages`). Comments in English.
