# Handoff: Unity Grid Resident Portal & Management Admin Portal

## Overview

Two authenticated web applications for Unity Grid Management, an HOA management company operating in greater Houston, Texas.

- **Resident Portal** — the homeowner's account: pay HOA fees, file maintenance requests, submit architectural applications, reserve amenities, manage guests and gate codes, read notices, message management, and maintain household/pet/lease records.
- **Admin Portal** — the internal staff application: accounting and payment processing, owner records, work orders, architectural review, violations and inspections, amenity bookings, communications, board and meeting management, legal and lien tracking, vendors, documents, community onboarding, a synced calendar, and staff/role administration.

A third file, the public marketing site, is included for visual reference only. It is not part of this build.

## About the Design Files

The \`.dc.html\` files in this bundle are **design references created in HTML**. They are prototypes that demonstrate intended layout, copy, and interaction behavior. They are **not production code to copy directly** — they hold their entire state in memory, have no backend, and use a proprietary template runtime (\`support.js\`).

Your task is to **recreate these designs in the target codebase's existing environment** — React, Vue, Rails views, whatever the project already uses — following its established routing, data-fetching, form, and component conventions. If no codebase exists yet, choose an appropriate stack (a React + TypeScript SPA against a REST or GraphQL API is a natural fit for this application) and implement the designs there.

Open each \`.dc.html\` file directly in a browser to interact with the prototype. Every flow described in this document is clickable.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interaction states are final and intentional. Recreate the UI to match, using the codebase's existing component library where equivalents exist. Two deliberate exceptions:

- **Photography is placeholder.** Every image is a labeled diagonal-striped block. Real photography will be supplied separately; keep the aspect ratios.
- **Data is fixture data.** Names, addresses, amounts, and dates are representative samples, not seed data.

---

## Design Tokens

### Color

All colors are authored in \`oklch()\`. Use these values directly — they are perceptually uniform and the palette depends on it. Hex approximations are given for tooling that requires them.

| Token | Value | Approx. hex | Usage |
| --- | --- | --- | --- |
| \`bg\` | \`oklch(0.972 0.006 130)\` | \`#f6f6f0\` | Page background (warm stone) |
| \`surface\` | \`oklch(0.99 0.004 130)\` | \`#fcfcf9\` | Cards, panels, inputs |
| \`surface-sunken\` | \`oklch(0.985 0.005 135)\` | \`#f9f9f4\` | Inline form drawers, nested fields |
| \`surface-muted\` | \`oklch(0.978 0.006 140)\` | \`#f5f6f0\` | Table headers, summary blocks |
| \`hairline\` | \`oklch(0.9 0.01 140)\` | \`#dfe1d8\` | Card borders |
| \`hairline-soft\` | \`oklch(0.95 0.006 140)\` | \`#eff0ea\` | Row dividers |
| \`border-input\` | \`oklch(0.86 0.012 145)\` | \`#d3d6ca\` | Input and select borders |
| \`accent\` | \`oklch(0.42 0.05 155)\` | \`#3f5c46\` | Primary buttons, links, active nav (sage) |
| \`accent-hover\` | \`oklch(0.34 0.05 155)\` | \`#314a37\` | Primary button hover |
| \`accent-tint\` | \`oklch(0.955 0.018 150)\` | \`#eaf2e9\` | Selected rows, active nav background, own chat bubbles |
| \`accent-tint-border\` | \`oklch(0.89 0.022 150)\` | \`#d6e3d4\` | Border on tinted surfaces |
| \`chip-on\` | \`oklch(0.93 0.03 152)\` | \`#dcecd9\` | Selected chip fill |
| \`ink\` | \`oklch(0.26 0.014 150)\` | \`#33372f\` | Primary text |
| \`ink-secondary\` | \`oklch(0.45 0.012 150)\` | \`#5f6459\` | Field labels |
| \`ink-tertiary\` | \`oklch(0.52 0.012 150)\` | \`#71766a\` | Supporting copy |
| \`ink-quaternary\` | \`oklch(0.56 0.015 150)\` | \`#7c8174\` | Eyebrow labels, timestamps |
| \`footer-bg\` | \`oklch(0.28 0.022 152)\` | \`#353b31\` | Public site footer only |

**Status colors**

| Meaning | Value | Usage |
| --- | --- | --- |
| Positive / resolved | \`oklch(0.45 0.06 155)\` | Paid, closed, approved, insurance current |
| Attention / pending | \`oklch(0.5 0.09 60)\` | Awaiting review, notice sent, overloaded staff |
| Critical / overdue | \`oklch(0.48 0.11 30)\` | Past due, hearing set, expired insurance, validation errors |
| Destructive action text | \`oklch(0.5 0.09 30)\` | Remove links |
| Neutral / informational | \`oklch(0.5 0.03 155)\` | Default badge and meta text |

**Calendar category colors** (dot fill, text, and 5%-tint background per category)

| Category | Text / dot | Tint background |
| --- | --- | --- |
| Meeting | \`oklch(0.5 0.06 155)\` | \`oklch(0.955 0.022 155)\` |
| Inspection | \`oklch(0.52 0.08 250)\` | \`oklch(0.95 0.025 250)\` |
| Booking | \`oklch(0.5 0.03 155)\` | \`oklch(0.96 0.012 155)\` |
| Legal | \`oklch(0.48 0.11 30)\` | \`oklch(0.955 0.035 30)\` |
| Community | \`oklch(0.55 0.09 60)\` | \`oklch(0.96 0.035 70)\` |

### Typography

Two families, loaded from Google Fonts:

- **Instrument Sans** — all UI text. Weights 400, 500, 600.
- **IBM Plex Mono** — labels, reference numbers, dates, currency amounts, statuses, and timestamps. Weight 400 only.

The mono/sans split is a load-bearing part of the visual identity. Anything machine-generated or scannable (a work order ref, a dollar figure, a timestamp, an uppercase eyebrow label) is mono; anything written for a human to read is sans.

| Role | Family | Size | Weight | Letter-spacing | Notes |
| --- | --- | --- | --- | --- | --- |
| Page title (h1) | Sans | \`clamp(24px, 5vw, 32px)\` | 600 | \`-0.024em\` | |
| Section heading (h2) | Sans | 17px | 600 | — | Card headers |
| Card metric | Sans | 24–34px | 600 | \`-0.02em\` | Dashboard figures |
| Body | Sans | 15–16px | 400 | — | \`line-height: 1.55–1.6\` |
| Row primary | Sans | 16px | 500 | — | |
| Row secondary | Sans | 14px | 400 | — | \`ink-tertiary\` |
| Field label | Sans | 14px | 400 | — | \`ink-secondary\`, 8px bottom margin |
| Eyebrow label | Mono | 10–11px | 400 | \`0.12em\` | \`text-transform: uppercase\` |
| Status / meta | Mono | 12–13px | 400 | — | Color carries the status |
| Amount | Mono | 14–15px | 400 | — | Right-aligned in tables |
| Small print | Sans | 13px | 400 | — | \`ink-quaternary\` |

Minimum body size is 13px; nothing smaller except the 10–11px uppercase mono eyebrows, which are tracked out for legibility.

### Spacing, radius, shadow

- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 56, 64px.
- **Fluid padding:** page shell \`clamp(16px, 3vw, 32px)\`; card headers and rows \`clamp(16px, 2.4vw, 24px)\`; section gaps \`clamp(20px, 3vw, 28px)\`.
- **Radius:** 5px (event pill) · 8px (small control) · 10px (input, button, nav item) · 12px (form drawer, mobile toggle) · 14px (chat bubble, mobile sheet) · 16px (card) · 18px (hero image) · \`999px\` (chip, pill button, badge).
- **Shadow:** used sparingly, only on overlays. \`0 12px 32px oklch(0.4 0.02 150 / 0.1)\` (mobile nav sheet) and \`0 14px 36px oklch(0.4 0.02 150 / 0.12)\` (typeahead dropdown).

---

## Layout System

### Application shell

Both portals share one shell:

1. **Sticky header** (\`position: sticky; top: 0\`, \`z-index: 20\`) — \`surface\` background, bottom hairline, \`padding: 14px clamp(16px, 3vw, 32px)\`. Contains the wordmark on the left and a scope switcher plus identity block on the right. The inner row is \`display: flex; flex-wrap: wrap; min-width: 0\` so it degrades on narrow screens instead of overflowing.
2. **Alert band** (conditional) — full-width, sits directly below the header, shown only when an emergency notice is active.
3. **Body** — \`display: flex; flex-wrap: wrap; align-items: flex-start; gap: clamp(20px, 3vw, 40px); padding: clamp(16px, 3vw, 32px)\`.
   - **Sidebar** \`flex: 1 1 200px\`, sticky at \`top: 88px\`, \`max-width: 236px\`.
   - **Main** \`flex: 999 1 420px; min-width: 0\` — the lopsided grow factor keeps the sidebar at its natural width on desktop and forces a clean wrap below roughly 700px.

Content columns share one container width and one left edge: **1200px** on the public site, **1440–1520px** in the portals.

### Data rows — the critical pattern

Every list row uses:

\`\`\`css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
justify-items: start;
gap: 8px 18px;
align-items: baseline;
\`\`\`

This is **not** a cosmetic choice. Fixed pixel column tracks were tried and repeatedly collapsed cells to unreadable widths at laptop and tablet sizes. \`auto-fit\` with a 170px floor lets columns reflow into fewer, wider tracks as space shrinks, and \`justify-items: start\` keeps text from stretching. Where a row has a genuinely narrow leading cell (a date, a checkbox), use a wrapping flex row with \`flex: 0 0 auto\` on the narrow item and \`flex: 1 1 220px; min-width: 0\` on the text, rather than a fixed grid track.

Card summary tiles use the same rule with a 180–320px floor and a 12px gap.

### Responsive behavior

No media queries. Layout is intrinsic (\`clamp()\`, \`auto-fit\`, \`flex-wrap\`), with one JavaScript breakpoint: a \`resize\` listener stores \`window.innerWidth\` in state and swaps the desktop sidebar for a mobile nav sheet below **760px**.

**Mobile navigation** (both portals):

- A full-width toggle button showing the current section's **group name** (mono, 10px, uppercase) above its **section name** (17px, 600). Right side shows an aggregate open-item count and a "Menu" / "Close" label.
- Tapping it opens a grouped sheet: \`max-height: 66vh; overflow-y: auto\`, 14px radius, overlay shadow. Sections are labeled with mono uppercase headings. The current item is tinted \`accent-tint\`, set to weight 600, and marked "viewing" in mono.
- Selecting an item navigates, closes the sheet, and scrolls to top.
- All tap targets are ≥ 40px tall; primary controls are ≥ 44px.

**Nav groups**

- *Resident Portal:* Your home (Overview, Payments) · Requests (Maintenance, Architectural, Compliance) · Neighborhood (Amenities, Access & guests, Community) · Inbox & records (Messages, Documents, Account)
- *Admin Portal:* Today (Dashboard, Calendar) · Money (Accounting, Legal & liens) · Property (Work orders, Architectural, Violations, Bookings, Vendors) · People (Owners, Communications, Board & meetings) · Office (Documents, Communities, Team)

On mobile the calendar month grid switches from titled event pills to colored 9px dots (the full list sits below the grid), and day cells shrink to \`min-height: clamp(72px, 13vw, 108px)\`.

---

## Product Rules

These are non-negotiable and apply across both portals. Several were established after review feedback; violating them is a regression.

1. **Add-forms go on top.** Any "Add / New / Invite / Schedule / Log / Book" control sits at the **top** of its card or list, never at the bottom. A user must never scroll past a list to create something. Collapsed by default as a single button; expands into an inline drawer with a Cancel link in its header.
2. **Actions are dropdowns, not buttons.** Every status change — approve, close, resolve, escalate, publish, advance a stage — is a \`<select>\` labeled "Take action…" listing **every valid next state**, not a single-purpose button. This lets staff move a record backward as well as forward.
3. **Confirm before applying.** Choosing an action opens an inline confirmation bar (\`oklch(0.965 0.014 148)\` background, spans the row) stating the consequence in plain language — "Are you sure this is completed? Closing notifies the resident and locks the work order." — with Cancel and a specifically labeled confirm button ("Yes, close it", never "OK"). Consequential actions (lien, foreclosure, suit) use stronger wording and name the board authorization requirement.
4. **Record who did it.** Every create, status change, mailing, note, and payment is stamped with the acting staff account and a timestamp. Entries appear both in the record's own case file and in a global, non-editable audit trail at **Team → Audit trail**.
5. **Search and filters on every list.** Each list carries a search input plus status filter chips ("All" first). Community-scoped lists add a community selector.
6. **Addresses are structured everywhere.** Never a single free-text address field. Always: street number, street name, unit/lot, city, state (Texas is the default and, for properties, the only option), ZIP — as separate inputs. Mailing addresses lead with a "Same as property" toggle and only reveal their own fields when the user chooses "Different address". This applies to owners, vendors, and communities alike.
7. **Say "HOA fee," never "assessment"** in any resident- or staff-facing copy. The one exception is "Special assessment", which is a distinct legal instrument.
8. **Portfolios are never deleted.** They can be created and scoped; no delete affordance exists in the UI.

---

## Resident Portal — Screens

### Shell

Header carries the Unity Grid wordmark, a **property switcher** (a resident may own in more than one community), and the resident's name. The switcher is a dropdown listing each owned property with its community, address, and current balance; selecting one re-scopes the whole portal.

### 1. Overview

Landing view. Balance-due card with the amount (mono, large), due date, and cadence ("Quarterly HOA fee"); a primary "Pay now" action; open request summaries; next community event; and recent notices. Every tile links into its full section.

### 2. Payments

- **Balance card** — amount due, due date, and a breakdown by charge type.
- **Payment form** — amount (full balance, minimum, or custom), method (saved card, saved bank account, or new), and a card-fee disclosure. Card payments show a 2.95% processor fee added to the total; ACH and check show none.
- **Autopay** — enroll/unenroll with the draft date and the amount rule stated plainly.
- **Saved methods** — list with add and remove.
- **Ledger** — a four-column table (Date · Description · Amount · Balance) using a \`88px minmax(120px, 1fr) 96px 96px\` grid with right-aligned mono amounts. Debits and credits are color-differentiated.

### 3. Maintenance

Request form at the top: location (dropdown of common areas plus "my unit"), category, urgency, description, and photo drop zone. Validation requires a location and a description. Below, the resident's open and past requests with status, assigned party, and a timeline of updates.

### 4. Architectural

Application form at the top: project type, description, contractor, estimated dates, and a document drop zone for plans and neighbor consent. Below, submitted applications with their review stage, the 30-day statutory clock, committee correspondence, and the final decision with any conditions.

### 5. Amenities

Reservation form at the top: amenity, date, time window, guest count, event type, and requirement flags (alcohol served, certificate of insurance, outside vendors, after-hours access). Selecting "alcohol served" surfaces the insurance requirement and blocks submission until the certificate flag is set. Below, the resident's reservations with deposit status and the house rules.

### 6. Access & guests

Gate code display with a regenerate action, guest pass issuance (name, dates, vehicle), a list of active passes, and registered vehicles.

### 7. Community

Events with RSVP, the current ballot with a vote action, the resident directory (opt-in), and community announcements.

### 8. Compliance

Any open violations against the property with the cure deadline, the notice history, a photo of the finding, and a "report a concern" form for reporting others' violations.

### 9. Documents

Governing documents (CC&Rs, bylaws, rules), financials, meeting minutes, and the resident's own statements. Searchable, grouped by category.

### 10. Messages

Two-pane threaded messaging with management: thread list on the left, conversation on the right. Own messages are right-aligned with an \`accent-tint\` bubble; management messages are left-aligned on \`surface-sunken\`. Attachments render as bordered mono chips. Composer at the bottom.

### 11. Account

- **Contact information** — email, mobile, mailing address (structured, with "Same as property").
- **Notification preferences** — a matrix of notice types × delivery channel (Email / Text) as toggle chips. On narrow screens this becomes a wrapping flex row so the label never collapses.
- **SMS opt-in** — an explicit "Permission to receive text messages" consent control, separate from the channel toggles, with the carrier-charges disclosure.
- **Household members** — add or remove additional people (spouse, adult children, caretakers) with name, relationship, email/mobile, and portal-access level. Requires at least an email or a mobile per person.
- **Pets** — register a pet with type, breed, weight, color, rabies tag number, vet, and a **112px photo slot**.
- **Tenants & leases** — register a lease with tenant names, term dates, contact details, and a lease-document upload. Sets the property's occupancy to "Leased".
- **Security** — password and sign-in management.

---

## Admin Portal — Screens

### Shell

Header carries the wordmark, a **scope switcher** (All communities / a portfolio / a single community — re-scopes every list, metric, and calendar in the app), and the acting staff account with role.

### 1. Dashboard

Metric tiles (receivables, open work orders, pending architectural reviews, delinquency rate) and a prioritized action queue. Each queue item routes to its own section.

### 2. Accounting

- **Take a payment** — at the top, collapsed behind an "Add a payment" button. Opens a form for phone, walk-in, or mailed payments: owner typeahead (searches name, address, and account number; shows each match's address, balance, and status), amount, what to apply it to, and method (card / ACH / check / money order / cash). Card selection reveals card fields and a 2.95% fee line; check and money order reveal reference number and received date. Card-not-present requires the "Owner authorized by phone" flag before the charge button will fire. On success: a receipt panel, a new ledger entry, a reduced owner balance, and an audit-trail stamp. Card details are never stored — the processor returns a token and last four.
- **Aging summary** — current / 1–30 / 31–60 / 61–90 / 90+ tiles.
- **Delinquent accounts** — with a collection-stage action dropdown (reminder → late notice → final notice → 90+ → lien → payment plan), each with its own confirmation copy.
- **Recent payments** ledger and **budget vs. actual** for the year to date.

### 3. Owners

Search plus status and community filters. **Add a homeowner** form at the top: owner and co-owner names, community, structured property address, account number (auto-assigned if blank), email, mobile, closing/move-in date, occupancy, opening balance, and a structured mailing address behind a "Same as property" toggle. On-save flags control whether to send the portal invite, mail the welcome packet, and offer autopay enrollment. A CSV roster import sits alongside. Each row shows the owner, address, contact, balance, status, and account number.

### 4. Work orders

Search plus status and in-house/vendor filters. **New work order** form at the top: community, location, priority, title, scope notes, and an assignee chosen from active in-house techs or contracted vendors. Rows show the reference, title, detail, assignee with an in-house/vendor tag, and status, plus a "Take action…" dropdown (back to new / assign & schedule / mark in progress / close out) and an inline **Reassign** control that swaps the assignee without changing status.

### 5. Architectural

Each application is a card: reference, title, owner, submitted date, and the statutory due date. A "Take action…" dropdown offers approve, approve with conditions, deny, request more information, and send back to the committee — each with tailored confirmation copy (approval warns that work may begin immediately; denial notes appeal rights and the 30-day window). An **Open thread** toggle reveals the full case correspondence: owner messages, staff replies, committee notes, and attachments, with a composer that targets the owner, the committee, or an internal-only note. Internal notes are explicitly labeled "Staff only — never shown to the owner."

### 6. Violations

Search plus status filters. **Log a finding** form at the top: community, address or lot, violation type, source (inspection / resident report / board referral / vendor report), inspector, cure period, notes, and timestamped inspection photos. A separate "Start an inspection run" action opens the same form in route mode. Rows carry a "Take action…" dropdown (courtesy notice → formal notice → board hearing → resolved, plus reopen) with plain-language confirmations.

Each violation opens a **case file** containing:
- **Photos and attachments** — inspection photos with timestamps.
- **Mailing record** — every notice sent, with kind, method (first-class / certified / email + portal), date sent, tracking number, and delivery status. New mailings can be recorded inline.
- **Management notes** — staff notes, each stamped with author and time.
- **Activity log** — every status change with the acting account and timestamp. Not editable.

### 7. Bookings

Search plus status and deposit filters. **Book for a resident** form at the top (for phone and walk-in requests): resident, amenity, date, time, guests, phone, event type, setup/teardown window, deposit state, office notes, and requirement flags. Alcohol without a certificate of insurance is blocked. Rows carry an action dropdown (requested / approved / completed / cancelled).

### 8. Communications

Announcement composer at the top: subject, body, audience (all communities, one community, delinquent accounts, board members), and channel toggles (email, SMS, portal). Sending stamps the audit trail. Below, the send history with audience, channels, and recipient counts.

### 9. Board & meetings

- **Directors** — seat a director (name, role, structured address, term start and end) or end a term. Both stamp the audit trail.
- **Meetings** — schedule a meeting with **separate start time, location, and address fields** (a single "time & place" field was explicitly rejected), plus community, meeting type, and notice requirements. Each meeting carries a "Take action…" dropdown through its lifecycle (scheduled → agenda draft → agenda published → held → minutes draft → minutes approved, plus cancel). Publishing the agenda confirms the statutory notice window — 144 hours for a regular meeting, 10 days for the annual.
- **Minutes** — attached per meeting: an editable notes field, attendance, motions and votes, and a publish action that makes them visible in every resident portal.

### 10. Legal & liens

Cases with owner, address, balance, and stage, each with a "Take action…" dropdown covering refer to counsel, file a lien, authorize suit, record judgment, schedule a foreclosure sale, record a payment plan, and close the matter. The consequential stages carry emphatic confirmations naming the recorded board vote requirement. Also lists counsel contacts and upcoming legal dates.

### 11. Vendors

Search plus insurance-status filters. **Add a vendor** form at the top: company, trade, contact, contract term, insurance expiry, structured business address, and a drop zone for the W-9, certificate of insurance, and signed contract. Rows show the vendor, trade and contact, contract term, year-to-date spend, and insurance status colored by whether it is current.

### 12. Documents

Search plus published/draft filters. Rows show the title, metadata, and a publish/unpublish toggle — publishing makes the document visible in every resident portal, and the toggle stamps the audit trail.

### 13. Communities

- **Portfolios** — create a portfolio and assign communities to it. No delete.
- **Communities** — onboard a community: name, structured address, door count, HOA fee, cadence, and portfolio assignment. Each community carries an onboarding-stage dropdown (onboarding → records transfer → active, plus offboarding) with confirmations; going active triggers portal invites and starts billing on the next cycle.

### 14. Calendar

A real month grid, not a list.

- **Header** — previous/next month arrows, the month and year, a "Today" button, and category filter chips each carrying its category's color dot.
- **Grid** — seven columns, weekday headers in mono uppercase on \`surface-muted\`, day cells at \`min-height: clamp(72px, 13vw, 108px)\`. Today's cell is tinted and labeled. Each cell shows up to three event pills tinted by category, then "+N more".
- **Click a day** to open the add-event form with that date pre-filled.
- **Drag an event to another day** to reschedule it. The dragged pill drops to 40% opacity; the move is written to the audit trail with the acting account.
- **Agenda list** below the grid: everything in the visible month, or just the selected day, sorted by date, with the category and whether the event is synced to Google.
- **Google Calendar sync** — a status strip (account, last sync, direction, event count) with "Sync now" and a "Manage sync" panel: per-feed toggles (meetings, inspections, bookings, legal dates, community events), push-only vs. two-way direction, a reminder lead time, an iCal subscribe link, and per-community Google calendar mappings scoped to the communities the signed-in staff member covers. Two-way sync states that deletions in Google remove only the calendar entry, never the underlying record.

Events are aggregated from meetings, legal dates, approved bookings, inspection routes, and manually added entries.

### 15. Team

- **Staff accounts** — name, email, role, communities covered, and current open-item load (colored when overloaded). Each row can be disabled/enabled or removed. **Invite a team member** form at the top: name, work email, role, and community assignment chips, with the selected role's permissions summarized live.
- **Audit trail** — the global log of every action in the portal, each entry showing what happened, which account did it, and when. Explicitly non-editable.
- **Role matrix** — what each of the seven roles can reach: Administrator, Community manager, Assistant manager, Maintenance tech, Inspector, Accounting, Front desk.

---

## Interactions & Behavior

### Inline form drawers

Collapsed to a single pill button. Expanding reveals a \`surface-sunken\` panel with a 12px radius, a heading, a Cancel link in the top-right, fields in \`repeat(auto-fit, minmax(180px, 1fr))\` grids, and a primary submit. Errors render as a single line of critical-red text above the submit button, replacing any prior error. Successful submission collapses the drawer, clears the fields, prepends the new record to its list, and writes an audit entry.

### Action dropdown + confirmation

\`<select>\` with a placeholder "Take action…" option and one option per valid next state (the current state is excluded). Selecting an option sets a pending-confirmation object keyed to that record's id; the row then renders a confirmation bar spanning its full width. Cancel clears the pending object; confirm applies the state change, clears it, and writes the audit entry. Only one confirmation is open at a time per list.

### Typeahead

Free-text input; matches appear in an absolutely positioned dropdown (\`z-index: 20\`, overlay shadow) showing each result's name and a metadata line. Selecting one collapses the dropdown into a confirmation chip with a "Change" link. A no-match state offers guidance rather than an empty box.

### Chips

Toggle chips carry the selection state in fill and border: on is \`chip-on\` with \`oklch(0.82 0.04 152)\` border and \`oklch(0.36 0.05 155)\` text; off is \`surface-sunken\` with \`hairline\` border and \`ink-tertiary\` text. Used for filters, multi-select assignment, and boolean requirement flags.

### Hover

Primary buttons darken to \`accent-hover\`. Outline buttons shift their border to \`oklch(0.5 0.04 155)\`. Rows and menu items tint to \`oklch(0.965 0.01 145)\`. No transitions are specified; instant state changes are intentional.

### Validation

Client-side, on submit, one message at a time, in field order. Messages name the fix, not the failure: "Add an email or a mobile — the portal invite needs one," not "Invalid input." Cross-field rules are enforced where they carry legal or financial weight: card payments require the authorization flag; alcohol bookings require the insurance flag; a differing mailing address must be complete.

---

## State Management

The prototypes hold everything in one component's state. In production, split by concern:

**Server state** (fetch, cache, invalidate on mutation): owners, properties, ledger entries and payments, work orders, architectural applications with their threads, violations with case files, bookings, meetings with minutes, legal cases, vendors, documents, communities and portfolios, staff accounts and roles, calendar events, message threads, and the audit log.

**Client state:** current scope (all / portfolio / community), current section, mobile viewport width and nav sheet open/closed, which inline form is expanded, all form field drafts, the pending confirmation object per list, per-list search text and filter selections, calendar month/year and selected day, drag-in-progress event, and typeahead query and selection.

**Notes for the real implementation:**

- The scope selection is global and must survive navigation. Put it in a URL segment or a persisted store, not local component state.
- The audit log is append-only. Write it server-side inside the same transaction as the mutation it records, never from the client — the client-side implementation in the prototype exists only to demonstrate the surface.
- Payment processing must be server-side and tokenized. The prototype's card fields are illustrative; PCI scope means the real form should use a hosted field or tokenization SDK.
- Calendar drag-and-drop should optimistically update, then reconcile against the server response.
- The 30-day architectural review clock and violation cure periods are legally significant. Compute them server-side from authoritative timestamps.

---

## Assets

**No production imagery exists yet.** Every photo is a labeled placeholder: a diagonal-striped block (\`repeating-linear-gradient(135deg, oklch(0.91 0.016 148) 0 10px, oklch(0.955 0.012 145) 10px 20px)\` over \`oklch(0.955 0.012 145)\`) with a bordered mono caption naming what belongs there. Preserve the aspect ratios: the public site hero is 21:9; pet photos are 112px squares; community and amenity images are 16:9.

Fonts load from Google Fonts (Instrument Sans, IBM Plex Mono). Self-host them in production.

No icon set is used. Status is carried by color and mono text labels, not glyphs. There are no emoji anywhere, by design.

---

## Files

| File | Contents |
| --- | --- |
| \`Resident Portal.dc.html\` | Resident portal — 11 sections |
| \`Unity Grid Admin.dc.html\` | Admin portal — 15 sections |
| \`Unity Grid Home.dc.html\` | Public marketing site — visual reference only, not in scope |
| \`Mobile Preview.html\` | All three files side by side in 390px phone frames |
| \`support.js\` | Prototype template runtime. Required to open the files; **do not port it.** |

Open any \`.dc.html\` file directly in a browser. Each is self-contained apart from \`support.js\` and the Google Fonts link.

## Open Questions

1. **Real photography** — placeholders are labeled with what each slot needs.
2. **Payment processor** — the 2.95% card fee and the tokenization flow assume a processor has been selected. Confirm which, and whether ACH fees apply.
3. **Google Calendar** — the sync panel describes intended behavior; the OAuth scope and per-community calendar provisioning need an implementation decision.
4. **SMS provider** — the opt-in consent language should be reviewed against the chosen provider's compliance requirements and TCPA.
5. **Texas statutory dates** — notice windows (144 hours / 10 days), the 30-day architectural clock, and violation cure periods are drawn from Texas Property Code as represented in the design. Have counsel confirm before they drive automated deadlines.
