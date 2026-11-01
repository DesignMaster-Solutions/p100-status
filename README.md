# P100 — DMS-TXT

**Teletext resurrected as a live status desk for the internet services a small
software agency depends on.**

P100 brings back 1980s broadcast Teletext (Ceefax / Oracle style TV text pages) as a
numbered status board. During an incident, opening six vendor status pages is slow. P100
puts a readable index and the affected components behind numbered teletext pages you
select with a remote or the keyboard. Every signal shows its source and the time it was
retrieved; an unavailable source stays visibly **NO SIGNAL**, and `incidents = []` is never
mistaken for an all-clear.

## Kiroween 2026 — Resurrection

Category: **Resurrection** (bring dead technology back to life). The dead technology is
broadcast Teletext; the revival is a live, data-driven status desk on the open web, built
with Kiro's spec-driven workflow.

## Demo

[Demo video on YouTube](https://youtu.be/XWqBSConpNY) (`docs/demo.mp4`, 2 min 37 s, narrated) shows the deployed app on a desktop and an iPad
mini: the index with a live MAJOR, P102 paginating 481 Cloudflare components across 28
subpages, P199 stating the limits, and the test suite. Scene list and narration live in
`video/demo.json`; re-render with `demo_slides.py video/demo.json`. Submission fields,
description and "how Kiro was used" text: `docs/submission.md`.

## What it does

- Fetches six fixed public **Atlassian Statuspage** `summary.json` feeds server-side, in
  parallel, with a 5-second per-source timeout and a 60-second `caches.default` cache. No
  API keys, no accounts, no persistence.
- Converts them into teletext pages on a strict **40×24** character grid:
  - **P100** — service index: each vendor with its page number, overall status and source
    age.
  - **P101** GitHub, **P102** Cloudflare, **P103** OpenAI, **P104** Anthropic,
    **P105** Vercel, **P106** Discord — one base page per vendor listing components and any
    active incidents. A vendor with many affected components spans subpages `n/N` and never
    steals another vendor's number. Affected components are shown before operational ones.
  - **P199** — sources and limitations.
- Authentic front end: the 8 teletext colours, double-height header row with a live clock
  (`P100 P100 DMS-TXT  Fri 30 Oct 14:31:07`), a blocky mosaic logo, a CRT scanline effect,
  flashing text for MAJOR OUTAGE, page entry by digit keys and an on-screen remote (0–9 plus
  the red/green/yellow/cyan fastext keys). It scales to 360 px wide and respects
  `prefers-reduced-motion` (no flashing, no scanline animation).

This is a **vendor-status viewer**, not active monitoring, not an SLA calculator, and not a
claim about any customer's availability.

## How to run

Requires Node.js 22+.

```sh
npm install
npm test            # vitest unit + fast-check property suite
npx wrangler dev    # serves / and /api/pages locally on the Worker runtime
```

- `GET /` — the teletext client (HTML, CSS and JS inline; no build step).
- `GET /api/pages` — JSON of all teletext pages (`{ generatedAt, pages }`).

A red vendor status is valid data, not an error. A failed/slow source renders as NO SIGNAL
while the other five keep working.

## How Kiro was used

The application in `src/`, the tests in `test/unit/` and everything in `.kiro/` were built
with Kiro's spec-driven workflow:

- **Steering** (`.kiro/steering/`): `product.md`, `tech.md`, `structure.md` pin the product
  boundaries (vendor viewer, no keys, honest status), the stack (Cloudflare Worker,
  TypeScript, no framework, pure `buildPages`), and the module layout.
- **Spec** (`.kiro/specs/p100/`): `requirements.md` states acceptance criteria in EARS form
  (WHEN/WHILE/IF … THE SYSTEM SHALL …); `design.md` fixes the data model, the 40×24 grid
  rules and the fetch/cache contract; `tasks.md` is the checkbox plan that was worked
  through to completion.
- **Pure core**: `buildPages(feeds, now)` in `src/pages.ts` and `normalizeFeed` in
  `src/feeds.ts` take no I/O and no hidden clock, so they are directly unit-testable.
- **Tests, red before green**: the eight acceptance cases in `fixtures/cases.json` are
  encoded in `test/unit/feeds.test.ts` and `test/unit/pages.test.ts`. Mutating the builder
  (forcing one subpage; treating unknown incidents as green) was observed to turn them red
  before the correct implementation turned them green.
- **Property-based tests** (`test/unit/properties.test.ts`, fast-check): for ANY generated
  feed input every page is exactly 24 lines of 40 characters, vendor page numbers are unique
  and stable for the same service order, and unknown/failed feeds render NO SIGNAL and never
  throw.
- **Agent hook** (`.kiro/hooks/run-tests-on-save.kiro.hook`): runs `npm test` whenever a
  `src/*.ts` file is saved, keeping the grid bounds and status rules honest during
  development.

### Provenance

`tools/` and `docs/` are earlier Codex-authored preparation (a Node.js feed probe,
paginator and local HTTP reference) and are labelled as such in those files. They informed
the contract; the Kiro-built, Worker-deployable application is `src/` + `.kiro/` +
`test/unit/`. The live `summary.json` snapshots in `fixtures/live/` were captured on
31 October 2026 and are historical development fixtures, not current service status.

## Data and attribution

The feeds carry vendor-owned factual status data. Vendor names are attribution, not an
endorsement, and the MIT license covers original project material, not vendor marks.

## License

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 Design Master Solutions LLC.
