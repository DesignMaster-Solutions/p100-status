# First working version

Audience: an agency operator checking whether a reported failure coincides with a
vendor incident. This is a vendor-status viewer, not active monitoring, an SLA
calculator or a claim about any particular customer's availability.

## Boundaries

Cloudflare Worker with server-side requests to the six fixed URLs in the manifest.
No API keys, paid model calls, user-supplied fetch targets, accounts or persistence.
One HTML client and `/api/pages`. The Worker fetches in parallel with a five-second
per-source timeout and a short cache lifetime. One failed provider cannot blank the
other five. Record retrieval and upstream-update timestamps separately.

A pure `buildPages(feeds, now)` transforms normalized inputs. Rendering uses plain
text nodes, not provider HTML. Sanitize control characters and normalize glyphs to
a documented monospace alphabet before wrapping; layout is measured after normalization.

## Screen contract for Kiro to implement

- P100 is the index, P101 GitHub, P102 Cloudflare, P103 OpenAI, P104 Anthropic,
  P105 Vercel, P106 Discord. P199 explains sources and limitations.
- Keep the vendor's base page stable even when it fails. A vendor can have subpages
  `1/N` selected with previous/next controls; do not steal another vendor's number.
- Exactly 24 rows of 40 cells, padded; reserve header, source-age and navigation rows.
- Show non-operational components before operational ones. Sort by documented severity,
  then stable component ID. Keep the aggregate counts and page position visible.
- Never truncate away an affected component: overflow goes onto the next subpage.
  Wrap long names and incident titles; retain full text in an accessible detail view.
- Show vendor overall severity, not a fabricated percentage of customers affected.
- Missing incidents are unavailable data, distinct from a present empty list.
- Unknown source status, invalid JSON, timeout and transport errors cannot produce green.
- Stale cached data retains the last successful retrieval time and a stale label.
  Do not stamp a cache hit with the current time as though the source was fetched again.

## Interaction and accessibility

Number keys and an on-screen remote select pages. Backspace edits, Escape cancels,
invalid numbers leave the current page with a readable error. Next/previous subpage
works by keyboard and touch. Status always has words, never color alone. Reduced
motion disables flashing and scanline animation; maintain contrast and visible focus.
At 360px, preserve readability and a usable remote rather than shrinking all controls.
Test phone, portrait tablet, landscape/notebook and wide desktop on real devices.

## End-to-end demo target

Open the live index, select one vendor with affected components, navigate the
subpages, then show a controlled source failure and the resulting unknown state.
The failure case must be explicitly labeled demo/test data, never impersonate a live
vendor outage. End on source attribution and freshness. Record only after the app works.

## Required build evidence

Actual Kiro-produced specs/steering/hooks, red-to-green tests for acceptance cases,
property checks for cell bounds and stable page numbers, successful real API fetches,
deployed URL, inspected device screenshots and a public demo. A saved preparation
fixture does not satisfy any claim that the app is running or Kiro was used.
