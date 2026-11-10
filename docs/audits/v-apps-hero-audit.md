# V apps hero audit

Document date: 10 November 2026.

## Purpose

Five live Project V product sites and the Project V home page use different hero patterns. This audit records the drift. It is the basis for the shared `ProductHero` in `@vvedantb/ui`.

## Source and method

- **Source:** live Playwright audit of the public sites, with notes in `/tmp/hero-audit/AUDIT_SUMMARY.md`. The audit run date is not recorded in those notes.
- **Viewports:** desktop 1440 px wide and mobile 390 px wide.
- **Screenshots:** stored as artefacts at `/opt/cursor/artifacts/hero-audit/{id}-{mobile|desktop}.png`. They are not committed to the repository.
- **Values:** computed styles read from the live DOM. A leading `~` marks a rounded value.
- **Redirects:** no site redirected to a forced sign-in page. `https://vmem.vedantb.com` redirects to `https://vmem.projectv.uk/`.
- **Not measured:** the notes hold no figures for page weight, load time or conversion. This document makes no claim on them.

The reference for title style is `PageTitle` (`pageTitleClass`): Instrument Sans, weight 600, `leading-tight`, `tracking-tight`.

## Drift comparison

| App | URL | Title | Title weight (computed) | Title size mobile / desktop | Max width (px) | Hero padding mobile / desktop (px, top/bottom) | Sign-in count (desktop viewport) | CTAs | Visual | Product-of in hero |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vibot | https://vibot.projectv.uk | Make a bot. Keep the chat going. | 500 (drift from `PageTitle` 600) | ~39 px / 72 px | ~1024 | 32/16 and 40/24 | 1 (nav only) | Primary pill "Try vibot free"; secondary text link "See what it does" | Small icon flow (not a concept visual) | No. Footer only: "{app} is a product of Project V." |
| Verve | https://verve.projectv.uk | Minimal by design, powerful by action | 500 (drift) | 48 / 72 | ~896 | 96/96 and 128/128 | 1 (nav) | Single "Get started" pill | None | No. Footer only |
| Velth | https://velth.projectv.uk | Your health, your control | 500 (drift) | 48 / 72 | ~896 | 96/96 and 128/128 | 0 (nav uses "Get the app") | "Get it on Google Play" pill; secondary text link "Try the demo" | None | No. Footer only |
| vmem | https://vmem.vedantb.com, redirects to https://vmem.projectv.uk/ | Memory your agents can actually use | 600 (matches) | ~38 / ~78 | 1152 (`landingShellClass`) | 48/64 and 96/96 | **2** (nav and hero) | "Get started" and "Sign in"; capability pills | App replica or screenshot mockup | No. Footer only |
| vhub | https://executor-convex.vercel.app (legacy host name) | Every agent. One hub. | 600 (matches) | ~38 / ~78 | 1152 | Same as vmem | **2** (nav and hero) | "Get started" and "Sign in"; capability pills | Grid and typography; not the Project V concept visual | No. Footer only |
| Project V (reference) | https://projectv.uk | PROJECT V wordmark | Not applicable (brand-led) | Brand-led | 1152 | Generous (no figure recorded) | 0 | "Meet vibot" | **Animated x.ai-style concept visual (the target)** | Not applicable |

Notes on the table:

- Hero padding for vibot is shown as mobile (top 32, bottom 16) and desktop (top 40, bottom 24). vmem is mobile (top 48, bottom 64) and desktop (96 and 96).
- The source notes for Verve and Velth state the title as 48 px on mobile and 72 px on desktop.
- The Verve live title may omit the space after the comma in the DOM text. The table uses the visible text.
- On mobile, the notes record 0 sign-in controls for vibot and Verve in the hero or nav audit (possibly in an overflow menu), and 1 to 2 for vmem. These are lower-confidence findings than the desktop counts.

## Alignment

All five product heroes centre the text in a single column. None has a side-by-side layout. The Project V reference places the animated visual below the wordmark.

## Taglines (live copy)

| App | Tagline |
| --- | --- |
| vibot | Each bot has its own ongoing chat and its own memory. vibot is your default bot. It sends each message to the bot that should answer. |
| Verve | verve replaces the five apps you switch between. Write with AI that knows your notes, track what you have to do, and keep the dates and habits that matter in view. |
| Velth | Log a blood pressure reading in ten seconds. Scan the meter instead of typing. Never miss a dose. Walk into your next appointment with the whole picture, not a vague memory. |
| vmem | Store context from chats and tools, connect it in a graph, and retrieve the slice that matters — with a Context Trace that shows why each memory matched. |
| vhub | Sign in, connect your MCP servers once (vmem, verve, vibot, velth, or any streamable-HTTP MCP) and keep agent API keys in an encrypted vault. Your agents get a single /mcp endpoint with only your tools. Everything is private to your account. |

## Findings

1. **Title weight.** vibot, Verve and Velth render the title at weight 500. `PageTitle` sets 600. vmem and vhub already use 600.
2. **Title scale.** Mobile sizes range from about 38 px to 48 px, and desktop sizes from about 72 px to 78 px. No two product groups share a scale.
3. **Width and padding.** Three widths (about 896, about 1024 and 1152 px) and three padding schemes are in use.
4. **Duplicate sign-in.** vmem and vhub show two sign-in controls on desktop (nav and hero). vibot and Verve show one. Velth shows none.
5. **Visual.** No product hero uses an animated concept visual. vmem shows an app replica, vibot a small icon flow, and Verve and Velth nothing.
6. **Product-of line.** No hero states that the app is a product of Project V. All five rely on the footer, which names the app.
7. **CTA pattern.** The primary action is a pill on every site. The secondary action is a text link on two sites, an outline button on two, and absent on one.

## Target for `ProductHero`

| Area | Target |
| --- | --- |
| Layout | Text first, then visual on mobile. Side by side from the `lg` breakpoint. `landingShellClass` width. |
| Title | One `h1`. `pageTitleClass` family, weight 600, leading and tracking, at a display scale. |
| Calls to action | Pill primary action. Optional secondary action. |
| Sign in | At most one control, in the hero. The page nav should not repeat it. |
| Visual | Animated concept visual, as on https://projectv.uk. Not an app replica or screenshot. |
| Product-of line | "a product of Project V", linked to https://projectv.uk. |
| Motion | Honour `prefers-reduced-motion: reduce`. |

## Open points

- Whether each app removes its nav sign-in or its hero sign-in is a decision for the app owners. `ProductHero` renders its own control only when `signIn` is set.
- The vhub URL is a legacy host name. Confirm the current public URL before the apps adopt the component.
