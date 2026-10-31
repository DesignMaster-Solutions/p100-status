# P100

Teletext resurrected as a public service-status desk for a small software agency.

**Stage: executable feed, pagination and local HTTP reference, not a functioning web app or a submitted entry.**
This repository contains a build brief, observed API fixtures, acceptance cases and
a tested Node.js feed probe. No application code has been generated with Kiro yet. The implementation must be developed using
Kiro, with its actual specs, steering, hooks and test evidence retained in `.kiro/`.
The preparation documents and feed probe were written with Codex; they are not Kiro
artifacts. The probe is a development reference, not sufficient use of Kiro to qualify.

## Why it exists

During an incident, opening six separate vendor status pages is slow. P100 should
put a readable index and the affected components behind numbered teletext pages.
A remote, keyboard or touch selects a vendor. Every signal has a source and a
retrieval time. An unavailable source stays visibly unknown.

## Build inputs

- [Build brief](docs/build-brief.md): bounded first version and observable acceptance.
- [Observed feed contract](docs/feed-contract.md): real differences that the adapter must handle.
- [Acceptance cases](fixtures/cases.json): expected outcomes, not passing tests.
- [Capture manifest](fixtures/manifest.json): URLs, UTC timestamps and SHA-256 hashes.
- `fixtures/live/`: unmodified public API responses captured on 31 October 2026.

The snapshots are historical development fixtures, **not current service status**.
They contain vendor-owned factual status data; vendor names are attribution, not
an endorsement. The MIT license covers original project material, not vendor marks.

## Next construction session

1. Authenticate Kiro with the existing project account and verify available free credits.
2. Ask Kiro to read the brief and contract, then produce specs and implement the Worker.
3. Turn every case in `fixtures/cases.json` into executable tests; observe the relevant
   failure before applying the fix. Keep live network calls outside the unit suite.
4. Publish and exercise the app on the real test devices, record a demo under three
   minutes and complete the Devpost form only after the eligibility/terms gate.

## Runnable feed preflight (Node.js 22+)

No dependency installation, API key or paid API is required:

```sh
node --test test/*.test.mjs
node tools/feed-probe.mjs --fixtures
node tools/feed-probe.mjs --live
node tools/component-pages.mjs
```

`--fixtures` is labeled historical. `--live` fetches the six fixed manifest URLs in
parallel with five-second aborts and exits 1 if any request or schema fails. A vendor
reporting an outage is valid data, not a probe transport failure. Every result includes
its source, base page, retrieval time and separate upstream update time. No server is
started and no automatic polling is installed.

The exported `normalizeFeed` and `probeAll` functions preserve all component IDs,
distinguish missing incidents from an empty list, keep unknown statuses non-green,
and accept an optional in-memory previous result for explicitly stale responses.
Stale data retains its original retrieval timestamp; a failed source cannot erase
other vendors. This is a backend reference for Kiro, not a rendered teletext UI.

Seventeen tests cover the data/failure boundary and reference pagination, including
100 deterministic generated Unicode/control-character cases. The paginator keeps
all components and incident titles across 40x24 ASCII grids, preserving the original
text and source metadata separately for a future accessible detail view. The historical
Cloudflare fixture requires 28 subpages for 481 components; all 67 affected components
precede operational ones. This command does not fetch current status.
See [pagination contract and evidence](docs/pagination.md).
The application index/about pages, accessible detail view, Cloudflare Worker cache, browser
rendering and interactions remain unimplemented. Kiro must build those and integrate
or replace this explicitly Codex-authored reference with real Kiro usage evidence.
See [preflight evidence](docs/preflight-evidence.md) for observed live results.
No web deployment exists at this stage.

## Local HTTP reference

`node tools/pages-api.mjs` serves `GET http://127.0.0.1:8789/api/pages`.
It uses the existing probe and paginator, with a 60-second in-memory cache,
coalesced refreshes and explicit failure states. `P100_PORT` changes the local port.
No installation, authentication, paid calls or background polling is required.
Six additional tests exercise cache expiry, concurrent reads, stale-data expiry,
response isolation and actual HTTP success/failure routes (23 total tests).
See [HTTP contract and measured evidence](docs/http-reference.md).

This is a **Node.js development reference**, not a deployed Worker. Kiro still
needs to implement the application and its runtime-specific cache. The local
server does not establish eligibility or a completed competition submission.

## Competition and eligibility

Target: Kiroween 2026, Resurrection. The official rules require a new functioning
application built with Kiro, public GitHub source with a license and `.kiro/`, an
English description, a public YouTube demonstration, and an explanation of Kiro use.
Submission closes 4 December 2026 at 14:00 Pacific; results are expected around
3 February 2027. Category prize: US$5,000; this is a possible award, not revenue.

The proposed entrant is Design Master Solutions LLC. Brazil-resident individuals
are excluded; the organization must have an authorized eligible representative.
The existing task names Rudy as that representative. Confirm authority and
eligibility before submission; do not submit as Alan individually or claim a false
residence. Contract acceptance and any identity/tax/payment details remain with Alan.

Source, checked 31 October 2026: https://kiroween.devpost.com/rules

## License

Original project material: MIT, see [LICENSE](LICENSE).
