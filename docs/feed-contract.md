# Observed feed contract, 31 October 2026

All six fixed public endpoints returned HTTP 200. Raw bytes and capture timestamps
are in the manifest. A 200 alone does not prove the payload matches the adapter.

| Feed | Components | Incidents field | Overall indicator |
| --- | ---: | --- | --- |
| GitHub | 12 | present, empty array | none |
| Cloudflare | 481 | present, empty array | major |
| OpenAI | see raw capture | absent | none |
| Anthropic | 6 | present, empty array | none |
| Vercel | 67 | present, empty array | none |
| Discord | 33 | present, empty array | none |

Cloudflare has 414 operational, 37 degraded-performance, 27 major-outage and 3
maintenance components in this snapshot. There are no incident objects. Therefore,
`incidents.length === 0` is not an all-clear signal. The initial single-page brief
would hide most affected locations. Paginate the 67 affected components before the
414 operational ones, preserving complete coverage across subpages.

OpenAI omits `incidents`, while `components` and `status` remain valid. Retain the
available status information, label incident availability as unknown, and never call
`.map` or read `.length` on the missing field. The initial capture's shape assertion
failed here; the raw response is preserved as a regression fixture. Its upstream
`page.updated_at` is earlier than retrieval: that is not proof the request failed.

## Normalized input boundary

Each fixed provider has an ID, source URL, retrieval timestamp and one of:

- success: valid overall status, components, and incidentsAvailability=known/unknown;
- stale: cached successful payload with original retrieval time and failure reason;
- unavailable: no usable payload plus bounded failure reason.

Keep a missing or unrecognized overall indicator unknown. Unknown component statuses
remain visible and count separately. Do not default arbitrary strings to operational.
Source age refers to fetch time, upstream update age to the vendor's change time.

## Reproduction

Fetch the manifest URLs without authentication, parse JSON and compare field types.
Recheck captures when implementing; vendors can change schema. Use fixed captures
for deterministic unit tests and a separate live smoke test for upstream compatibility.
The manifest hash verifies byte identity, not vendor uptime or application correctness.
