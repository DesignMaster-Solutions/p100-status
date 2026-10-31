# HTTP reference, 31 October 2026

Authorship: Codex, not Kiro. This implements the missing local `/api/pages`
boundary by reusing `probeAll` and `componentPages`; there is no second feed adapter.

## Contract

Run `node tools/pages-api.mjs`, then `curl http://127.0.0.1:8789/api/pages`.
Only GET is accepted (405 + Allow otherwise); unknown paths return 404 and query
parameters return 400 before any fetch. Clients cannot supply a fetch URL.
The six fixed sources come from the repository manifest. No CORS is enabled.

The response contains `mode: live-reference`, `checkedAt`, `cache` (hit/refresh),
`degraded`, normalized `feeds` and 40x24 `pages`. These are data grids, not a UI.
No index P100 or about P199 is produced yet. Each feed carries its original
`retrievedAt`, separately updated `ageSeconds`, source and failure state.
`checkedAt` is response assembly time, not a new source observation.

A healthy batch is cached for 60 seconds. Concurrent callers share one refresh.
On any provider failure, retry becomes eligible after 5 seconds, on the next
request only; there is no timer polling the providers in the background.
Successful feeds remain usable when another fails. A last successful payload may
be shown as STALE for at most 15 minutes after retrieval, never green. After that
it becomes unavailable. Partial or stale results return 200 with `degraded: true`;
all unavailable results return 503 with explicit NO SIGNAL data. Responses use
`Cache-Control: no-store` so an intermediary cannot conceal current failure state.

The state is scoped to one local Node server, lost on restart, and is not a
production/distributed cache. Do not copy its mutable state into Worker globals.
Kiro must implement the Cloudflare runtime using appropriate cache bindings and
retain genuine development evidence. Public deployment and browser UI are pending.

## Verification

- Initial test run failed with the new module missing; then 23/23 tests passed.
- 25 simultaneous cold reads made exactly one upstream request per provider.
- Tests exercised 59s cache hit, 60s refresh, 5s failure retry, 15-minute stale
  expiry, response mutation isolation, HTTP 404/400/405/200/503.
- Three isolated mutations (duplicate refresh, indefinite stale data, age reset)
  were rejected by the new tests; the working implementation was unchanged.
- Live HTTP smoke at 2026-10-31T22:45:58Z: 200, all six sources successful,
  38 pages of 24x40 cells. Component counts: GitHub 12, Cloudflare 481,
  OpenAI 25, Anthropic 6, Vercel 67, Discord 33. Immediate second request was
  a cache hit with the exact original per-source timestamps.
- Both test servers and the live smoke server closed after their checks.

These measurements prove a local backend reference, not an app on the internet,
Kiro authorship, submission, award or payment. Reproduce with
`node --test test/*.test.mjs` and the curl command above.
