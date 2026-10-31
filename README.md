# P100

Teletext resurrected as a public service-status desk for a small software agency.

**Stage: preparation, not a functioning app or a submitted entry.** This repository
contains a build brief, observed API fixtures and acceptance cases. No application
code has been generated with Kiro yet. The implementation must be developed using
Kiro, with its actual specs, steering, hooks and test evidence retained in `.kiro/`.
These preparation documents were written with Codex; they are not Kiro artifacts.

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

No `npm install`, `npm test`, local server or deployment exists at this stage.

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
