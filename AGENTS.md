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

Three more that are rules, not niceties:

- **A field employee always has a job board.** Creating a Maintenance tech or
  an Inspector mints their `/crew/<token>` link in the same call
  (`ensureCrewLink`), and the link goes out in their welcome text. A tech must
  never exist without somewhere to see their work, and nobody should have to
  remember a second step. The helper is idempotent, so call it freely from any
  new path that creates field staff.

- **Every dollar belongs to a company.** The office keeps books for two legal
  entities: the HOA fee and fines are **Sofi Lakes Residential Association
  Inc.**; certificates and the other management fees are **Unity Grid
  Management LLC**. Revenue is assigned on the fee, the invoice copies it from
  its lines, and the ledger entry copies it from the invoice — *copied at each
  step, never looked up later*, so re-pointing a fee at the other company next
  year cannot restate last year's books. A mixed invoice is left unassigned
  rather than guessed at. Anything new that creates money must carry
  `entity_key` forward, or it lands in neither return.

- **Never ship a fixture standing in for a record.** `fixtures.ts` already said
  so in its own docstring and was violated anyway: empty arrays fed two cards
  that could never render, and a hard-coded `AGING` constant displayed five
  confident `$0` tiles as the association's receivables position — worse than
  an empty card, because an empty card is visibly empty. Sections read from the
  database or say plainly that there is nothing. What is left in `fixtures.ts`
  is navigation, month names and one fallback display name; keep it to that.

Two more that are easy to miss:

- **No icons and no emoji, anywhere, by design.** Status is carried by color and
  mono text labels. Do not reach for an icon font. The single sanctioned
  exception is the weather glyph in the header, added at the owner's request —
  weather is the one thing on screen that is not association data. Adding a
  second exception is a design decision, not a styling tweak: raise it rather
  than reaching for one because a row is crowded.
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
widths.

Two things that follow from that grid and cost an afternoon each:

- **A cell budget, not a column count.** At laptop width the row fits about
  five tracks. A sixth cell does not squeeze — it wraps to a second line, and
  the one that wraps is whichever came last, usually the action cluster. Before
  adding a cell, pair it with an existing one instead: the invoice row carries
  amount over status in a single track for exactly this reason.
- **Right-aligning needs the last track, not `justify-self`.** `justify-self:
  end` only reaches the right of an item's *own* column, and `auto-fit` makes
  more tracks than most rows have cells — so a cluster sits mid-row with empty
  columns beyond it. Use `gridColumn: "-2 / -1"` *and* `justifySelf: "end"`.

**Card summary tiles are the exception**: `Tiles` lays out with `flex-wrap` and
`flex: 1 1 <min>px`, not `auto-fit`. `auto-fit` computes a fixed column count,
and any tile that does not divide into it is stranded one column wide with the
rest of the row empty beside it — five metrics in 942px made four columns and
orphaned the fifth. flex-wrap grows whatever lands on the final row to fill it,
at any count and any width. The floor stays in the 170–320px band. Still
intrinsic, still no media queries.

## Money

Amounts are `bigint` cents in the database and formatted at the edge — never
floats, never dollars in a column. Invoices sit in front of the ledger: issuing
one bills the household and touches nothing, and only collecting it writes a
ledger entry, so the books record money rather than expectations.

Reports live in `report-actions.ts` and are computed from live rows at the
moment they run. Two habits there are load-bearing:

- **Receivables are read across all time, not the reporting period.** A debt is
  owed today regardless of the month it was raised; an aging report scoped to
  the last 30 days shows a clean book on an association owed for two years.
- **A report states what it does not cover, on the report itself.** A balance
  sheet with no liabilities section is wrong unless it says so, and whoever
  reads the printed copy will not have the screen in front of them. Use
  `caveats` — it prints. Budget-vs-actual and aged payables are absent because
  the budget and vendor-bill tables do not exist; an invented number in a
  financial statement is worse than an absent one.
