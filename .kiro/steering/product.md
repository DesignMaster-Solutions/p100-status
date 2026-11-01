# Product steering — P100

## What it is
P100 resurrects 1980s **Teletext** (Ceefax / Oracle style TV text pages) as a live
status board for the internet services a small software agency depends on. During an
incident, opening six vendor status pages is slow. P100 puts a readable index and the
affected components behind numbered teletext pages, navigable by keyboard or an on-screen
remote.

## Audience
An agency operator checking whether a reported failure coincides with a vendor incident.
This is a **vendor-status viewer**, not active monitoring, not an SLA calculator, and not
a claim about any particular customer's availability.

## Kiroween category
Kiroween 2026 — **Resurrection**: bring dead technology back to life. The dead technology
is broadcast Teletext; the revival is a live, data-driven status desk on the open web.

## Hard product rules
- Real public data only: the six fixed Atlassian Statuspage `summary.json` feeds. No API
  keys, no accounts, no persistence, no user-supplied fetch targets, no paid calls.
- Every signal shows its **source** and its **retrieval time**. Upstream update time is a
  separate fact from retrieval time.
- An unavailable source stays visibly **NO SIGNAL**; a stale cache stays visibly **STALE**
  with its original retrieval time. Neither can render as green/operational.
- `incidents.length === 0` is **not** an all-clear. Missing incidents is unknown data,
  distinct from a present empty list. Affected components are shown before operational ones.
- Status is always conveyed with **words**, never colour alone.

## Page map
- P100 — service index (each vendor: page number + overall status + source age).
- P101 GitHub, P102 Cloudflare, P103 OpenAI, P104 Anthropic, P105 Vercel, P106 Discord.
  A vendor with many affected components spans subpages `n/N`; it never steals another
  vendor's number.
- P199 — sources and limitations (about).

## Out of scope (first version)
Historical graphs, alerting/notifications, authentication, multi-tenant config, writing to
any store.
