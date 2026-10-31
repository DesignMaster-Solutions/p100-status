# Pagination reference, 31 October 2026

`node tools/component-pages.mjs` reads the six historical fixtures and prints JSON.
It starts no server, uses no paid API and is not a live status display. Codex authored
this reference. It must not be represented as Kiro-generated work.

## Boundary

`componentPages(feed)` accepts one normalized `normalizeFeed`/`probeAll` result with
a base `page` from 101 through 198. It returns subpages with a stable base page,
a composite key (`102/1`, `102/2`...), source, original retrieval timestamp, state,
all-clear flag, counts, text rows and item metadata. It does not mutate the input.

Each grid has exactly 24 rows of 40 printable ASCII cells: four summary rows,
18 content rows and two footer rows. Incident titles appear first. Components sort
by major outage, partial outage, degraded performance, maintenance, unknown, then
operational, with ID as a deterministic tie-breaker. Duplicate IDs do not delete data.

Each content row has a three-character status and 36 text cells. Long labels continue
onto subsequent rows and subpages; each segment retains `part`, `parts`, kind, ID,
status and full original text. An empty name is displayed as `(unnamed)`. Missing
incident titles use `(untitled)`. Neither missing incidents nor stale data is green.

The display alphabet uses NFKD decomposition, removes combining diacritics, replaces
control characters with spaces and other non-ASCII characters with `?`. This is a
lossy display conversion only: `original` retains full Unicode for the accessible
view Kiro still needs to build. Summary/footer strings are bounded; complete source
and timestamp remain in metadata. Provider text MUST be rendered with `textContent`,
never `innerHTML`; these plain strings are not an HTML sanitizer.

## Verified outputs

| Historical provider | Components preserved | Subpages | Affected |
| --- | ---: | ---: | ---: |
| GitHub | 12 | 1 | 0 |
| Cloudflare | 481 | 28 | 67 |
| OpenAI | 25 | 2 | 0 |
| Anthropic | 6 | 1 | 0 |
| Vercel | 67 | 4 | 0 |
| Discord | 33 | 2 | 0 |

OpenAI incidents remain UNKNOWN. These figures come from the morning fixture, not
from a new network request; later live readings may differ.

The initial test run failed with the module absent. Six new tests and the existing
11 pass. Long-label tests reconstruct 2,700 and 1,900 characters across subpages;
100 seeded generated cases exercise Unicode, control characters and HTML-like text.
Three isolated mutations were rejected: force one subpage (drops overflow), render
missing incidents as zero, and hide the stale label. Temporary copies isolated the
mutations from the working tree.

## Remaining application work

This reference only creates provider data grids. It does not implement the P100
index, P199 about page, browser navigation, accessible detail view, cache or Worker.
Kiro still must substantially develop the application with genuine specs/hooks and
produce actual device proof and a demonstration. No competition submission occurred.
