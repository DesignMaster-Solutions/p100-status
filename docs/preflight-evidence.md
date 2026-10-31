# Feed preflight, 31 October 2026

The Codex-built command `node tools/feed-probe.mjs --live` succeeded for all six
fixed providers at 19:44:37 UTC. This is a point-in-time read, not uptime monitoring.

| Provider | Components | Non-operational | Incidents |
| --- | ---: | ---: | --- |
| GitHub | 12 | 0 | 0 |
| Cloudflare | 481 | 68 | 0 |
| OpenAI | 25 | 0 | unavailable |
| Anthropic | 6 | 0 | 0 |
| Vercel | 67 | 0 | 0 |
| Discord | 33 | 0 | 1 |

Cloudflare's earlier fixture had 67 affected components; it now has 68. Discord's
earlier fixture had zero incidents; the live response has one, despite overall
indicator `none`. The probe therefore does not infer all-clear solely from that
indicator. OpenAI still omits incidents. No capture was overwritten with live data.

Tests cover malformed responses, unknown statuses, aborted requests, HTTP failure,
source isolation, stable base pages, stale timestamps and invalid cache origins.
The initial test run failed because the probe did not exist. Isolated mutations of
missing-incident handling, affected-component coverage and stale retrieval times
were each rejected by the corresponding tests (nonzero exit), using temporary
copies so the working source was unchanged. The final unmodified run passed 11/11.

This is construction progress toward an already registered entry, not a submitted
entry or a Kiro usage claim. Kiro still needs to develop the functioning application,
including rendering, paging, Worker and actual specs/hooks. No `.kiro/` evidence is
fabricated here. Eligibility, demonstration and final entry remain outstanding.
