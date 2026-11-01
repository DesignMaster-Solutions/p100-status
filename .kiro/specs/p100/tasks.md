# P100 — Tasks

- [x] 1. Project scaffolding
  - [x] 1.1 `package.json` (type module, scripts: `test`, `dev`), devDeps vitest,
        fast-check, wrangler, typescript, @cloudflare/workers-types.
  - [x] 1.2 `tsconfig.json` (strict), `wrangler.toml` (`main=src/worker.ts`).
  - _Requirements: R1, R6_

- [x] 2. Grid primitives (`src/grid.ts`)
  - [x] 2.1 `GRID_COLS`/`GRID_ROWS`, `ascii`, `row`, `padPage` with 40×24 assertions.
  - _Requirements: R3.1, R3.5_

- [x] 3. Feed normalization (`src/feeds.ts`, `src/providers.ts`)
  - [x] 3.1 Six fixed providers with base pages 101..106.
  - [x] 3.2 `normalizeFeed` + `fromError`/`fromStale` builders: unknown indicator/status
        never green; incidents availability known/unknown; separate timestamps.
  - _Requirements: R1.1, R2.1–R2.5, R4.1–R4.3_

- [x] 4. Page builder (`src/pages.ts`)
  - [x] 4.1 `buildPages(feeds, now)` pure: P100 index, P101..P106 vendors, P199 about.
  - [x] 4.2 Severity sort, affected-before-operational, wrap to subpages, no dropped
        component, `flashing` for major.
  - _Requirements: R3.1–R3.6, R4.1–R4.3_

- [x] 5. Red → green unit tests (`test/unit/feeds.test.ts`, `pages.test.ts`)
  - [x] 5.1 Encode every `fixtures/cases.json` case; observe failures first.
  - _Requirements: R6.1_

- [x] 6. Property-based tests (`test/unit/properties.test.ts`)
  - [x] 6.1 fast-check: 40×24 bounds, unique+stable page numbers, NO SIGNAL, no throw.
  - _Requirements: R6.2_

- [x] 7. Front end (`src/render.ts`)
  - [x] 7.1 40×24 grid, 8 colours, double-height header, mosaic logo, scanlines, live
        clock, flashing MAJOR OUTAGE.
  - [x] 7.2 Page entry (digits, Backspace, Escape), on-screen remote (0–9 + fastext),
        subpage prev/next, 360 px scaling, `prefers-reduced-motion`, `textContent`.
  - _Requirements: R5.1–R5.8_

- [x] 8. Worker wiring (`src/worker.ts`)
  - [x] 8.1 `fetchAllFeeds`: parallel, 5s timeout, `caches.default` 60s, honest stale age.
  - [x] 8.2 Routes `/` and `/api/pages`; one failed feed never blanks the others.
  - _Requirements: R1.1–R1.5, R4.2_

- [x] 9. Kiro agent hook (`.kiro/hooks/`)
  - [x] 9.1 Run the test suite on save of `src/*.ts`.
  - _Requirements: R6.3_

- [x] 10. Docs & verification
  - [x] 10.1 README (what/category/how to run/how Kiro was used), MIT LICENSE present.
  - [x] 10.2 `npm install` + `npm test` pass.
  - _Requirements: R6.1–R6.3_
