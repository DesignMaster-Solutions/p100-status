# P100 — Requirements

Acceptance criteria use EARS (Easy Approach to Requirements Syntax): WHEN/WHILE/IF …
THE SYSTEM SHALL … The data-boundary criteria are mirrored by the cases in
`fixtures/cases.json`.

## R1 — Fetch the fixed public feeds
**User story:** As an agency operator, I want P100 to read the real vendor status feeds,
so that the board reflects public reality without any credentials.

- 1.1 WHEN the Worker handles a request THE SYSTEM SHALL fetch the six fixed
  `summary.json` URLs defined in `src/providers.ts` and no other hosts.
- 1.2 THE SYSTEM SHALL fetch the feeds in parallel with a 5-second per-source timeout.
- 1.3 WHEN a successful feed response is received THE SYSTEM SHALL cache it in
  `caches.default` for 60 seconds keyed by its URL.
- 1.4 IF a feed request times out, returns non-200, or returns a body that is not valid
  JSON of the expected shape THEN THE SYSTEM SHALL mark that feed unavailable and SHALL
  still render the remaining feeds.
- 1.5 THE SYSTEM SHALL require no API key, account, persistence, or user-supplied fetch
  target.

## R2 — Normalize feed data honestly
**User story:** As an operator, I want the board to never fake an all-clear, so that I can
trust a green signal.

- 2.1 WHEN a feed is normalized THE SYSTEM SHALL record `retrievedAt` and the upstream
  `page.updated_at` as separate fields.
- 2.2 IF the overall indicator is missing or unrecognized THEN THE SYSTEM SHALL classify
  it as `UNKNOWN` and SHALL NOT render it as green.
- 2.3 IF a component status string is unrecognized THEN THE SYSTEM SHALL keep it visible
  as `unknown` and SHALL NOT default it to operational.
- 2.4 IF the `incidents` field is absent or not an array THEN THE SYSTEM SHALL set
  incident availability to `unknown`, SHALL NOT read `.length`/`.map` on it, and SHALL
  NOT treat the feed as green.
- 2.5 THE SYSTEM SHALL mark a feed green only when the indicator is `none`, zero components
  are non-operational, and incidents are known and empty.

## R3 — Build teletext pages on a strict grid
**User story:** As an operator, I want pages that fit a real teletext screen, so the
revival is authentic and nothing overflows.

- 3.1 WHEN `buildPages(feeds, now)` runs THE SYSTEM SHALL return pages whose every row is
  exactly 40 printable cells and whose every page is exactly 24 rows.
- 3.2 THE SYSTEM SHALL assign P100 to the index, 101..106 to the six vendors in a fixed
  order, and P199 to the about page.
- 3.3 WHILE a vendor has more content than fits one page THE SYSTEM SHALL split it into
  subpages `n/N` under the same base page number without using another vendor's number.
- 3.4 THE SYSTEM SHALL order non-operational components before operational ones, sorted by
  severity then by stable component ID, and SHALL never drop an affected component.
- 3.5 WHEN provider text is placed on the grid THE SYSTEM SHALL apply the documented
  display alphabet (NFKD, strip combining marks, control→space, other non-ASCII→`?`) and
  SHALL retain the full original text in the page item metadata.
- 3.6 `buildPages` SHALL be pure: it SHALL NOT perform I/O, SHALL NOT read the clock
  internally (it receives `now`), and SHALL NOT mutate its input.

## R4 — Represent unavailable and stale sources
- 4.1 WHEN a feed is unavailable THE SYSTEM SHALL label its page `NO SIGNAL`, keep its base
  page number, and SHALL NOT render green.
- 4.2 WHEN only a stale cached payload exists THE SYSTEM SHALL label it `STALE`, keep the
  original `retrievedAt`, report age in seconds, and SHALL NOT render green.
- 4.3 THE SYSTEM SHALL show each page's source and retrieval time (or `NEVER`).

## R5 — Authentic teletext front end
**User story:** As a viewer, I want it to look and feel like 1980s Teletext.

- 5.1 THE SYSTEM SHALL render a 40×24 grid using the 8 teletext colours, a double-height
  header row, a blocky mosaic logo, and a subtle CRT scanline effect.
- 5.2 THE SYSTEM SHALL show a header row `P100 P100 DMS-TXT  <Day DD Mon HH:MM:SS>` with a
  live clock.
- 5.3 WHILE any visible vendor is in MAJOR OUTAGE THE SYSTEM SHALL flash that text.
- 5.4 THE SYSTEM SHALL let the user enter a page number with digit keys and with an
  on-screen remote providing 0–9 and red/green/yellow/cyan fastext keys; Backspace edits,
  Escape cancels; an invalid number leaves the current page and shows a readable error.
- 5.5 THE SYSTEM SHALL provide previous/next subpage navigation by keyboard and touch.
- 5.6 WHEN the viewport is 360 px wide THE SYSTEM SHALL scale the grid to stay readable
  with a usable remote.
- 5.7 WHILE `prefers-reduced-motion` is set THE SYSTEM SHALL disable flashing and scanline
  animation while preserving contrast and visible focus.
- 5.8 THE SYSTEM SHALL render provider text via `textContent`, never `innerHTML`.

## R6 — Verification (tests)
- 6.1 THE SYSTEM SHALL include vitest unit tests covering every case in
  `fixtures/cases.json`, each observed failing before the implementation satisfies it.
- 6.2 THE SYSTEM SHALL include fast-check property tests asserting, for arbitrary feed
  inputs: every page is ≤24 rows of ≤40 chars; page numbers are unique and stable for the
  same service order; unknown/failed feeds render `NO SIGNAL` and never throw.
- 6.3 A Kiro agent hook SHALL run the tests when any `src/*.ts` file is saved.
