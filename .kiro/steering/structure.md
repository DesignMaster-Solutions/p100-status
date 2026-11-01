# Structure steering — P100

```
.kiro/
  steering/            product.md, tech.md, structure.md
  specs/p100/          requirements.md, design.md, tasks.md
  hooks/               run-tests-on-save.kiro.hook
src/
  providers.ts         the six fixed feeds (id, name, url, base page 101..106)
  feeds.ts             normalizeFeed() — pure shape/validation + classification
  pages.ts             buildPages(feeds, now) — pure 40x24 teletext page builder
  grid.ts              display-alphabet + wrap/pad helpers (GRID_COLS=40, GRID_ROWS=24)
  render.ts            HTML page string (inline CSS + client JS)
  worker.ts            Worker fetch handler: fetchAllFeeds (timeout+cache) + routes
test/
  *.test.mjs           pre-existing Codex reference tests (Node, kept)
  unit/                Kiro vitest suites
    feeds.test.ts      acceptance cases from fixtures/cases.json (red->green)
    pages.test.ts      page assembly: index, vendor, about, subpages
    properties.test.ts fast-check PBT: cell bounds, stable page numbers, NO SIGNAL
fixtures/              live/*.json snapshots, cases.json, manifest.json (kept)
tools/                 Codex-authored Node reference (feed-probe, component-pages, pages-api)
docs/                  development evidence (Codex-authored)
wrangler.toml          Worker config
package.json           scripts: test (vitest), dev (wrangler dev)
tsconfig.json
README.md  LICENSE
```

## Boundaries between modules
- `grid.ts` owns the 40×24 constants and all text→cell conversion. Nothing else hardcodes
  40 or 24.
- `feeds.ts` and `pages.ts` are **pure**: no `fetch`, no `caches`, no `Date.now()` inside.
  `buildPages` receives `now` explicitly. These are the only files the unit tests import.
- `worker.ts` is the only file that touches the network, the cache and the clock.
- Provenance note: `tools/` and `docs/` are Codex-authored preparation and are labelled as
  such. The Kiro-built application lives in `src/`, `.kiro/` and `test/unit/`.
