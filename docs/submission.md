# Kiroween 2026 — submission package

Everything a submitter needs to paste into https://kiroween.devpost.com/ (deadline
2026-12-04 19:00 BRT). The only remaining actions are the two external logins
(Google for the YouTube upload, Devpost for the form) and the captcha.

## Fields

| Field | Value |
| --- | --- |
| Project name | P100 — DMS-TXT |
| Tagline | Teletext, resurrected as a live status desk |
| Category | Resurrection |
| Built with | Cloudflare Workers, TypeScript, Vitest, fast-check, Kiro |
| "Try it out" link | https://p100.designmaster.workers.dev |
| GitHub repo | https://github.com/DesignMaster-Solutions/p100-status |
| Video | `docs/demo.mp4` (2:37, narrated) — **needs the YouTube upload** |
| License | MIT, visible in the repo About box |
| `/.kiro` committed | `.kiro/steering`, `.kiro/specs/p100`, `.kiro/hooks/run-tests-on-save.kiro.hook` |

## Description (paste as is)

P100 brings back broadcast teletext — the 1980s TV text service that died with
analogue television — and puts it to work as a live status desk for the services a
small software agency depends on.

During an incident we open six vendor status pages, each with its own layout, its
own clock and its own idea of what "degraded" means. P100 gives them one shelf: a
numbered index (page 100), one page per vendor (101–106), and page 199 for the
limits. Every page is a strict 40×24 character teletext grid, navigated by page
number with a keyboard or the on-screen remote, exactly like a 1980s set.

- Six public Atlassian Statuspage `summary.json` feeds fetched server-side in
  parallel, 5-second timeout per source, 60-second cache.
- Affected components are listed before operational ones; a vendor with many
  affected components spans subpages without ever taking another vendor's page
  number.
- A failed or slow source renders **NO SIGNAL**; `incidents = []` is never shown as
  an all-clear. Age is time since retrieval, not time since the vendor changed.
- Authentic front end: the eight teletext colours, double-height header with a live
  clock, blocky mosaic logo, CRT scanlines, flashing status. Scales from a 360 px
  phone to a desktop and respects `prefers-reduced-motion`.

It is a vendor-status viewer: not active monitoring, not an SLA calculator, and not
a claim about any customer's availability. P199 says so on the page itself.

## How Kiro was used (paste as is)

- **Spec-driven development.** `.kiro/specs/p100/` holds requirements in EARS form
  (WHEN/WHILE/IF … THE SYSTEM SHALL …), a design that fixes the 40×24 grid rules and
  the fetch/cache contract, and a task plan worked through to completion. The EARS
  criteria map one-to-one onto the tests, so the spec is checkable rather than
  aspirational.
- **Steering.** `.kiro/steering/product.md`, `tech.md` and `structure.md` pin the
  product boundary (vendor viewer, no keys, honest status), the stack (Worker,
  TypeScript, no framework, pure `buildPages`) and the module layout. Keeping the
  boundaries in steering stopped the build from drifting into a monitoring service.
- **Agent hook.** `run-tests-on-save.kiro.hook` runs the suite whenever a `src/*.ts`
  file is saved, so the grid-bounds and status rules never went stale during edits.
- **Red before green.** The eight acceptance cases in `fixtures/cases.json` were
  encoded as tests first. Mutating the page builder (forcing one subpage, treating
  unknown incidents as green) turned the suite red — four failures — until the
  correct implementation was restored.
- **Property-based testing (fast-check).** For any generated feed input: every page
  is exactly 24 lines of 40 characters, vendor page numbers are unique and stable for
  the same service order, and unknown or failed feeds render NO SIGNAL without
  throwing. The 360 px clipping bug was found in a real screenshot, not by the PBT —
  the properties guard the grid, they do not replace reading the screen.
- **What would have been slower without the spec.** The subpage rule ("never take
  another vendor's page number") is the part a vibe-coded version gets wrong: without
  it written down as an acceptance criterion, pagination silently renumbers the
  neighbours.

## Bonus prizes — what is needed

- **Best Startup Project** (US$ 10,000): founder confirmation + LinkedIn profile +
  startup website (site: designmastersolutions.com).
- **Social Blitz** (US$ ?): one public post starting with `#KiroweenHackathon26`
  during the submission period, URL pasted into the form.
- **Best Demo**: automatic, no extra step.

## Remaining actions (not automatable here)

1. Sign in to the Google account (info@designmastersolutions.com) → YouTube Studio →
   upload `docs/demo.mp4` as public, title `P100 — Teletext, resurrected (Kiroween
   2026 demo)`, description from the section above.
2. Sign in to Devpost (same account, `designmastersolutions`) → Enter a Submission →
   paste the fields above → captcha → submit.
