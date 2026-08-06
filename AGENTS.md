<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Unity Grid

## Read the handoff first

`docs/design/handoff.md` is the authoritative spec — tokens, layout system,
product rules, and a screen-by-screen description of all 26 portal sections.
Read the relevant section before building. Do not work from a paraphrase.

The `.dc.html` files in `docs/design/` are the interactive prototypes. Open one
in a browser to see the intended behavior. **They are references, not code to
copy** — they hold all state in memory and depend on the proprietary
`support.js` runtime, which must not be ported.

## Scope

The build is **two authenticated portals**:

- **Resident Portal** — 11 sections
- **Admin Portal** — 15 sections

The public marketing site is *visual reference only and not part of this build*
per the handoff. It exists in `app/(marketing)/` and has been partially rebuilt;
do not invest further there without asking.

## Non-negotiables

The eight product rules in the handoff are non-negotiable — violating one is a
regression. In short: add-forms on top; status changes are "Take action…"
dropdowns listing every valid next state; every action confirms inline with
plain-language consequences and a specifically labeled confirm button; every
mutation is stamped with the acting account and appears in Team → Audit trail;
every list has search + filter chips; addresses are always structured fields,
never free text; say "HOA fee" (never "assessment", except "Special
assessment"); portfolios are never deleted.

Two more that are easy to miss:

- **No icons and no emoji, anywhere, by design.** Status is carried by color and
  mono text labels. Do not reach for an icon font.
- **No media queries.** Layout is intrinsic — `clamp()`, `auto-fit`,
  `flex-wrap` — with a single JS breakpoint at 760px that swaps the sidebar for
  a mobile nav sheet.

## Design tokens

All tokens live in `app/globals.css` and are consumed only through semantic
Tailwind classes — never raw hex, never Tailwind's stock palette for neutrals or
brand color. The handoff's token table maps onto them; `--color-secondary` is
the sage accent, `--color-on-surface` is ink, `--color-outline-variant` is the
hairline.

Fonts: Instrument Sans for UI (`font-body`/`font-headline`), IBM Plex Mono for
labels, refs, amounts, dates, statuses and timestamps (`font-label`). The
mono/sans split is load-bearing: anything machine-generated or scannable is
mono.

## Data rows

Every list row uses `repeat(auto-fit, minmax(170px, 1fr))` with
`justify-items: start`. Fixed pixel tracks were tried and collapsed at laptop
widths. Card summary tiles use the same rule with a 180–320px floor.
