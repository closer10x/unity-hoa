import type { SectionConfig } from "@/components/portal/record-section";

/**
 * Section configs for the admin portal, from docs/design/handoff.md.
 * Seed rows are fixture data — representative samples, not seed data.
 */

const req = (draft: Record<string, string>, ...names: string[]) =>
  names.find((n) => !(draft[n] ?? "").trim());

const id = (prefix: string, n: number) => `${prefix}-${n}`;

/* ---------------------------------------------------------------- §5 ARC */

export type ArcStatus =
  | "submitted"
  | "in_review"
  | "more_info"
  | "approved"
  | "approved_conditions"
  | "denied";

type ArcRow = {
  id: string;
  status: ArcStatus;
  ref: string;
  title: string;
  owner: string;
  submitted: string;
  due: string;
};

export const ARCHITECTURAL: SectionConfig<ArcRow, ArcStatus> = {
  group: "Property",
  title: "Architectural",
  lead: "Applications run on a 30-day statutory clock. Compute the due date server-side from the submitted timestamp.",
  searchPlaceholder: "Reference, owner, address or project",
  searchable: (r) => [r.ref, r.title, r.owner],
  addLabel: "Log an application",
  addHeading: "Log an architectural application",
  submitLabel: "Log application",
  fields: [
    { name: "owner", label: "Owner" },
    { name: "title", label: "Project" },
    { name: "type", label: "Project type", type: "select", options: ["Paint", "Fence", "Roof", "Patio", "Pool", "Solar", "Other"] },
    { name: "submitted", label: "Submitted", type: "date" },
    { name: "contractor", label: "Contractor", optional: true },
    { name: "notes", label: "Scope notes", type: "textarea", optional: true },
  ],
  build: (d) => {
    const missing = req(d, "owner", "title", "submitted");
    if (missing) return `Add the ${missing === "title" ? "project" : missing}.`;
    const n = Math.floor(Math.random() * 9000) + 1000;
    return {
      id: id("ARC", n),
      status: "submitted",
      ref: id("ARC", n),
      title: d.title,
      owner: d.owner,
      submitted: d.submitted,
      due: "30 days from submission",
    };
  },
  statusLabels: {
    submitted: "Submitted",
    in_review: "In review",
    more_info: "More info requested",
    approved: "Approved",
    approved_conditions: "Approved with conditions",
    denied: "Denied",
  },
  statusTone: {
    submitted: "neutral",
    in_review: "attention",
    more_info: "attention",
    approved: "positive",
    approved_conditions: "positive",
    denied: "critical",
  },
  transitions: {
    submitted: ["in_review", "more_info", "approved", "approved_conditions", "denied"],
    in_review: ["more_info", "approved", "approved_conditions", "denied"],
    more_info: ["in_review", "approved", "approved_conditions", "denied"],
    approved: [],
    approved_conditions: [],
    denied: ["in_review"],
  },
  consequences: {
    submitted: "This returns the application to the queue.",
    in_review: "This sends it to the Architectural Committee for their next sitting.",
    more_info: "This emails the owner asking for more detail. The 30-day clock keeps running.",
    approved: "This notifies the owner that work may begin immediately.",
    approved_conditions: "This approves the application subject to the stated conditions and notifies the owner.",
    denied: "This denies the application, states the reason, and notifies the owner of their appeal rights within 30 days.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "in_review", label: "In review" },
    { value: "more_info", label: "More info" },
    { value: "approved", label: "Approved" },
    { value: "denied", label: "Denied" },
  ],
  columns: [
    { ref: (r) => r.ref, primary: (r) => r.title, secondary: (r) => r.owner },
    { cell: (r) => ({ label: "Submitted", value: r.submitted, mono: true }) },
    { cell: (r) => ({ label: "Decision due", value: r.due, mono: true }) },
  ],
  seed: [
    { id: "ARC-2291", status: "in_review", ref: "ARC-2291", title: "Rear patio extension", owner: "Dana Whitfield · 7880 Morrison Road", submitted: "Jul 11", due: "Aug 10" },
    { id: "ARC-2288", status: "submitted", ref: "ARC-2288", title: "Roof replacement — architectural shingle", owner: "Priya Raman · 7912 Morrison Road", submitted: "Jul 28", due: "Aug 27" },
    { id: "ARC-2280", status: "approved_conditions", ref: "ARC-2280", title: "Six-foot cedar fence", owner: "Marcus Bell · 204 Lakebend Drive", submitted: "Jun 30", due: "Jul 30" },
  ],
};

/* --------------------------------------------------------- §6 VIOLATIONS */

export type VioStatus =
  | "open"
  | "courtesy"
  | "formal"
  | "hearing"
  | "resolved";

type VioRow = {
  id: string;
  status: VioStatus;
  ref: string;
  kind: string;
  address: string;
  source: string;
  cure: string;
};

export const VIOLATIONS: SectionConfig<VioRow, VioStatus> = {
  group: "Property",
  title: "Violations",
  lead: "Cure periods are legally significant — compute them server-side from the notice timestamp.",
  searchPlaceholder: "Reference, address or violation type",
  searchable: (r) => [r.ref, r.kind, r.address],
  addLabel: "Log a finding",
  addHeading: "Log a violation finding",
  submitLabel: "Log finding",
  fields: [
    { name: "address", label: "Address or lot" },
    { name: "kind", label: "Violation type", type: "select", options: ["Landscaping", "Trash containers", "Parking", "Unapproved structure", "Paint or siding", "Fence condition", "Other"] },
    { name: "source", label: "Source", type: "select", options: ["Inspection", "Resident report", "Board referral", "Vendor report"] },
    { name: "inspector", label: "Inspector" },
    { name: "cure", label: "Cure period (days)", type: "number", placeholder: "30" },
    { name: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  build: (d) => {
    const missing = req(d, "address", "kind", "source", "inspector");
    if (missing) return `Add the ${missing === "kind" ? "violation type" : missing}.`;
    const n = Math.floor(Math.random() * 9000) + 1000;
    return {
      id: id("V", n),
      status: "open",
      ref: id("V", n),
      kind: d.kind,
      address: d.address,
      source: d.source,
      cure: `${d.cure || 30} days`,
    };
  },
  statusLabels: {
    open: "Logged",
    courtesy: "Courtesy notice",
    formal: "Formal notice",
    hearing: "Board hearing",
    resolved: "Resolved",
  },
  statusTone: {
    open: "neutral",
    courtesy: "attention",
    formal: "attention",
    hearing: "critical",
    resolved: "positive",
  },
  transitions: {
    open: ["courtesy", "formal", "resolved"],
    courtesy: ["formal", "hearing", "resolved"],
    formal: ["hearing", "resolved"],
    hearing: ["resolved"],
    resolved: ["open"],
  },
  consequences: {
    open: "This reopens the case and restarts the cure period.",
    courtesy: "This mails a courtesy notice and starts the cure period. The owner is not yet fined.",
    formal: "This mails a formal notice by certified mail and records the tracking number. Fines may begin after the cure period.",
    hearing: "This refers the matter to a board hearing and notifies the owner of the date and their right to attend.",
    resolved: "This closes the case and notifies the owner that no further action is required.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "open", label: "Logged" },
    { value: "courtesy", label: "Courtesy" },
    { value: "formal", label: "Formal" },
    { value: "hearing", label: "Hearing" },
    { value: "resolved", label: "Resolved" },
  ],
  columns: [
    { ref: (r) => r.ref, primary: (r) => r.kind, secondary: (r) => r.address },
    { cell: (r) => ({ label: "Source", value: r.source }) },
    { cell: (r) => ({ label: "Cure period", value: r.cure, mono: true }) },
  ],
  seed: [
    { id: "V-1180", status: "courtesy", ref: "V-1180", kind: "Landscaping", address: "204 Lakebend Drive", source: "Inspection", cure: "30 days" },
    { id: "V-1176", status: "formal", ref: "V-1176", kind: "Trash containers", address: "7912 Morrison Road, Lot 22", source: "Resident report", cure: "14 days" },
    { id: "V-1170", status: "resolved", ref: "V-1170", kind: "Parking", address: "7880 Morrison Road", source: "Inspection", cure: "7 days" },
  ],
};

/* ----------------------------------------------------------- §11 VENDORS */

export type VendorStatus = "current" | "expiring" | "expired" | "inactive";

type VendorRow = {
  id: string;
  status: VendorStatus;
  company: string;
  trade: string;
  contact: string;
  term: string;
  spend: string;
};

export const VENDORS: SectionConfig<VendorRow, VendorStatus> = {
  group: "Property",
  title: "Vendors",
  lead: "Insurance status is colour-coded by whether the certificate is current.",
  searchPlaceholder: "Company, trade or contact",
  searchable: (r) => [r.company, r.trade, r.contact],
  addLabel: "Add a vendor",
  addHeading: "Add a vendor",
  submitLabel: "Add vendor",
  fields: [
    { name: "company", label: "Company" },
    { name: "trade", label: "Trade", type: "select", options: ["Landscaping", "Pool service", "Gate & access", "Electrical", "Plumbing", "Janitorial", "General contractor"] },
    { name: "contact", label: "Contact name" },
    { name: "phone", label: "Phone" },
    { name: "termStart", label: "Contract start", type: "date" },
    { name: "termEnd", label: "Contract end", type: "date" },
    { name: "insurance", label: "Insurance expiry", type: "date" },
  ],
  build: (d) => {
    const missing = req(d, "company", "trade", "contact");
    if (missing) return `Add the ${missing}.`;
    return {
      id: d.company,
      status: "current",
      company: d.company,
      trade: d.trade,
      contact: `${d.contact}${d.phone ? ` · ${d.phone}` : ""}`,
      term: d.termStart && d.termEnd ? `${d.termStart} – ${d.termEnd}` : "No term recorded",
      spend: "$0",
    };
  },
  statusLabels: {
    current: "Insurance current",
    expiring: "Expiring soon",
    expired: "Insurance expired",
    inactive: "Inactive",
  },
  statusTone: {
    current: "positive",
    expiring: "attention",
    expired: "critical",
    inactive: "neutral",
  },
  transitions: {
    current: ["expiring", "expired", "inactive"],
    expiring: ["current", "expired", "inactive"],
    expired: ["current", "inactive"],
    inactive: ["current"],
  },
  consequences: {
    current: "This records a valid certificate of insurance on file.",
    expiring: "This flags the vendor for renewal follow-up.",
    expired: "This blocks new work orders from being assigned to this vendor.",
    inactive: "This removes the vendor from assignment lists without deleting their history.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "current", label: "Current" },
    { value: "expiring", label: "Expiring" },
    { value: "expired", label: "Expired" },
    { value: "inactive", label: "Inactive" },
  ],
  columns: [
    { primary: (r) => r.company, secondary: (r) => r.trade },
    { cell: (r) => ({ label: "Contact", value: r.contact }) },
    { cell: (r) => ({ label: "Contract term", value: r.term, mono: true }) },
    { cell: (r) => ({ label: "YTD spend", value: r.spend, mono: true }) },
  ],
  seed: [
    { id: "Bayou Grounds", status: "current", company: "Bayou Grounds", trade: "Landscaping", contact: "Elena Ruiz · 281-555-0142", term: "Jan 2026 – Dec 2026", spend: "$48,200" },
    { id: "ClearWater Pools", status: "expiring", company: "ClearWater Pools", trade: "Pool service", contact: "Sam Ortiz · 713-555-0188", term: "Mar 2026 – Feb 2027", spend: "$19,400" },
    { id: "Gatewright Access", status: "expired", company: "Gatewright Access", trade: "Gate & access", contact: "Dev Patel · 832-555-0107", term: "Jun 2025 – Jun 2026", spend: "$12,850" },
  ],
};

/* ---------------------------------------------------------- §7 BOOKINGS */

export type BookingStatus = "requested" | "approved" | "completed" | "cancelled";

type BookingRow = {
  id: string;
  status: BookingStatus;
  resident: string;
  amenity: string;
  when: string;
  guests: string;
  deposit: string;
};

export const BOOKINGS: SectionConfig<BookingRow, BookingStatus> = {
  group: "Property",
  title: "Bookings",
  lead: "Alcohol without a certificate of insurance is blocked at submission.",
  searchPlaceholder: "Resident, amenity or date",
  searchable: (r) => [r.resident, r.amenity, r.when],
  addLabel: "Book for a resident",
  addHeading: "Book an amenity for a resident",
  submitLabel: "Create booking",
  fields: [
    { name: "resident", label: "Resident" },
    { name: "amenity", label: "Amenity", type: "select", options: ["Great Hall", "Clubhouse Annex", "Pool cabana", "Tennis courts", "Park pavilion"] },
    { name: "date", label: "Date", type: "date" },
    { name: "window", label: "Time window", placeholder: "5:00 PM – 10:00 PM" },
    { name: "guests", label: "Guest count", type: "number" },
    { name: "eventType", label: "Event type", type: "select", options: ["Private party", "Community event", "Meeting", "Other"] },
    { name: "deposit", label: "Deposit", type: "select", options: ["Not required", "Pending", "Held", "Returned"] },
  ],
  build: (d) => {
    const missing = req(d, "resident", "amenity", "date");
    if (missing) return `Add the ${missing}.`;
    return {
      id: `${d.resident}-${d.date}`,
      status: "requested",
      resident: d.resident,
      amenity: d.amenity,
      when: `${d.date}${d.window ? ` · ${d.window}` : ""}`,
      guests: `${d.guests || 0} guests`,
      deposit: d.deposit || "Not required",
    };
  },
  statusLabels: {
    requested: "Requested",
    approved: "Approved",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  statusTone: {
    requested: "attention",
    approved: "positive",
    completed: "neutral",
    cancelled: "critical",
  },
  transitions: {
    requested: ["approved", "cancelled"],
    approved: ["completed", "cancelled"],
    completed: [],
    cancelled: ["requested"],
  },
  consequences: {
    requested: "This returns the booking to the request queue.",
    approved: "This confirms the reservation, emails the resident and blocks the amenity for that window.",
    completed: "This closes the booking and releases any deposit hold.",
    cancelled: "This cancels the reservation, frees the amenity and notifies the resident.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "requested", label: "Requested" },
    { value: "approved", label: "Approved" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ],
  columns: [
    { primary: (r) => r.amenity, secondary: (r) => r.resident },
    { cell: (r) => ({ label: "When", value: r.when, mono: true }) },
    { cell: (r) => ({ label: "Guests", value: r.guests }) },
    { cell: (r) => ({ label: "Deposit", value: r.deposit }) },
  ],
  seed: [
    { id: "b1", status: "requested", resident: "Dana Whitfield", amenity: "Great Hall", when: "Sep 20 · 5:00 PM – 10:00 PM", guests: "60 guests", deposit: "Pending" },
    { id: "b2", status: "approved", resident: "Priya Raman", amenity: "Pool cabana", when: "Sep 14 · 1:00 PM – 5:00 PM", guests: "18 guests", deposit: "Held" },
    { id: "b3", status: "completed", resident: "Marcus Bell", amenity: "Clubhouse Annex", when: "Aug 2 · 6:00 PM – 9:00 PM", guests: "24 guests", deposit: "Returned" },
  ],
};

/* ------------------------------------------------------ §10 LEGAL & LIENS */

export type LegalStatus =
  | "review"
  | "counsel"
  | "lien"
  | "suit"
  | "judgment"
  | "plan"
  | "closed";

type LegalRow = {
  id: string;
  status: LegalStatus;
  owner: string;
  address: string;
  balance: string;
  opened: string;
};

export const LEGAL: SectionConfig<LegalRow, LegalStatus> = {
  group: "Money",
  title: "Legal & liens",
  lead: "Consequential stages require a recorded board vote. Confirmations name that requirement.",
  searchPlaceholder: "Owner, address or account",
  searchable: (r) => [r.owner, r.address],
  addLabel: "Open a matter",
  addHeading: "Open a legal matter",
  submitLabel: "Open matter",
  fields: [
    { name: "owner", label: "Owner" },
    { name: "address", label: "Property address" },
    { name: "balance", label: "Balance", type: "number", placeholder: "0.00" },
    { name: "opened", label: "Opened", type: "date" },
    { name: "notes", label: "Background", type: "textarea", optional: true },
  ],
  build: (d) => {
    const missing = req(d, "owner", "address", "balance");
    if (missing) return `Add the ${missing}.`;
    return {
      id: `${d.owner}-${d.address}`,
      status: "review",
      owner: d.owner,
      address: d.address,
      balance: `$${Number(d.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      opened: d.opened || "—",
    };
  },
  statusLabels: {
    review: "Under review",
    counsel: "Referred to counsel",
    lien: "Lien filed",
    suit: "Suit authorized",
    judgment: "Judgment recorded",
    plan: "Payment plan",
    closed: "Closed",
  },
  statusTone: {
    review: "neutral",
    counsel: "attention",
    lien: "critical",
    suit: "critical",
    judgment: "critical",
    plan: "positive",
    closed: "positive",
  },
  transitions: {
    review: ["counsel", "plan", "closed"],
    counsel: ["lien", "plan", "closed"],
    lien: ["suit", "plan", "closed"],
    suit: ["judgment", "plan", "closed"],
    judgment: ["plan", "closed"],
    plan: ["closed", "counsel"],
    closed: ["review"],
  },
  consequences: {
    review: "This returns the matter to internal review.",
    counsel: "This refers the file to association counsel and starts billing against the legal budget.",
    lien: "This files a lien against the property and clouds the title. It requires a recorded board vote authorizing the filing.",
    suit: "This authorizes litigation against the owner. It requires a recorded board vote and cannot be undone without dismissing the suit.",
    judgment: "This records a judgment against the owner.",
    plan: "This places the account on a written payment plan and suspends further collection action while payments are current.",
    closed: "This closes the matter and releases any collection hold.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "review", label: "Under review" },
    { value: "counsel", label: "Counsel" },
    { value: "lien", label: "Lien" },
    { value: "plan", label: "Payment plan" },
    { value: "closed", label: "Closed" },
  ],
  columns: [
    { primary: (r) => r.owner, secondary: (r) => r.address },
    { cell: (r) => ({ label: "Balance", value: r.balance, mono: true }) },
    { cell: (r) => ({ label: "Opened", value: r.opened, mono: true }) },
  ],
  seed: [
    { id: "l1", status: "counsel", owner: "Marcus Bell", address: "204 Lakebend Drive", balance: "$1,380.00", opened: "Aug 2" },
    { id: "l2", status: "plan", owner: "Priya Raman", address: "7912 Morrison Road, Lot 22", balance: "$425.00", opened: "Jun 14" },
  ],
};

/* --------------------------------------------------- §13 COMMUNITIES */

export type CommunityStatus =
  | "onboarding"
  | "records"
  | "active"
  | "offboarding";

type CommunityRow = {
  id: string;
  status: CommunityStatus;
  name: string;
  address: string;
  doors: string;
  fee: string;
};

export const COMMUNITIES_SECTION: SectionConfig<CommunityRow, CommunityStatus> = {
  group: "Office",
  title: "Communities",
  lead: "Portfolios can be created and scoped; they are never deleted.",
  searchPlaceholder: "Community name or address",
  searchable: (r) => [r.name, r.address],
  addLabel: "Onboard a community",
  addHeading: "Onboard a community",
  submitLabel: "Onboard community",
  fields: [
    { name: "name", label: "Community name" },
    { name: "address", label: "Address" },
    { name: "city", label: "City" },
    { name: "zip", label: "ZIP" },
    { name: "doors", label: "Door count", type: "number" },
    { name: "fee", label: "HOA fee", type: "number", placeholder: "0.00" },
    { name: "cadence", label: "Cadence", type: "select", options: ["Monthly", "Quarterly", "Semi-annual", "Annual"] },
  ],
  build: (d) => {
    const missing = req(d, "name", "address", "doors");
    if (missing) return `Add the ${missing === "doors" ? "door count" : missing}.`;
    return {
      id: d.name,
      status: "onboarding",
      name: d.name,
      address: `${d.address}${d.city ? `, ${d.city}` : ""}${d.zip ? ` ${d.zip}` : ""}`,
      doors: `${d.doors} doors`,
      fee: d.fee ? `$${d.fee} ${(d.cadence || "Monthly").toLowerCase()}` : "Not set",
    };
  },
  statusLabels: {
    onboarding: "Onboarding",
    records: "Records transfer",
    active: "Active",
    offboarding: "Offboarding",
  },
  statusTone: {
    onboarding: "attention",
    records: "attention",
    active: "positive",
    offboarding: "critical",
  },
  transitions: {
    onboarding: ["records", "active"],
    records: ["active"],
    active: ["offboarding"],
    offboarding: ["active"],
  },
  consequences: {
    onboarding: "This returns the community to onboarding.",
    records: "This marks records transfer as underway. Billing has not started.",
    active: "This sends portal invites to every owner and starts billing on the next cycle.",
    offboarding: "This begins offboarding. Billing stops at the end of the current cycle and owner portal access ends at handover.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "onboarding", label: "Onboarding" },
    { value: "records", label: "Records transfer" },
    { value: "active", label: "Active" },
    { value: "offboarding", label: "Offboarding" },
  ],
  columns: [
    { primary: (r) => r.name, secondary: (r) => r.address },
    { cell: (r) => ({ label: "Doors", value: r.doors, mono: true }) },
    { cell: (r) => ({ label: "HOA fee", value: r.fee, mono: true }) },
  ],
  seed: [
    { id: "Sofi Lakes", status: "active", name: "Sofi Lakes", address: "7880 Morrison Road, Katy 77493", doors: "390 doors", fee: "$425 quarterly" },
    { id: "Morrison Crossing", status: "records", name: "Morrison Crossing", address: "8100 Morrison Road, Katy 77493", doors: "212 doors", fee: "$310 quarterly" },
    { id: "Lakebend", status: "onboarding", name: "Lakebend", address: "1400 Lakebend Drive, Fulshear 77441", doors: "148 doors", fee: "Not set" },
  ],
};

/* ------------------------------------------------ §9 BOARD & MEETINGS */

export type MeetingStatus =
  | "scheduled"
  | "agenda_draft"
  | "agenda_published"
  | "held"
  | "minutes_draft"
  | "minutes_approved"
  | "cancelled";

type MeetingRow = {
  id: string;
  status: MeetingStatus;
  title: string;
  community: string;
  when: string;
  location: string;
};

export const MEETINGS: SectionConfig<MeetingRow, MeetingStatus> = {
  group: "People",
  title: "Board & meetings",
  lead: "Notice windows are statutory — 144 hours for a regular meeting, 10 days for the annual.",
  searchPlaceholder: "Meeting, community or location",
  searchable: (r) => [r.title, r.community, r.location],
  addLabel: "Schedule a meeting",
  addHeading: "Schedule a meeting",
  submitLabel: "Schedule meeting",
  fields: [
    { name: "title", label: "Meeting" },
    { name: "community", label: "Community", type: "select", options: ["Sofi Lakes", "Morrison Crossing", "Lakebend"] },
    { name: "type", label: "Meeting type", type: "select", options: ["Regular", "Annual", "Special", "Executive session"] },
    { name: "date", label: "Date", type: "date" },
    { name: "time", label: "Start time", placeholder: "6:30 PM" },
    { name: "location", label: "Location" },
    { name: "address", label: "Address" },
  ],
  build: (d) => {
    const missing = req(d, "title", "community", "date", "location");
    if (missing) return `Add the ${missing}.`;
    return {
      id: `${d.title}-${d.date}`,
      status: "scheduled",
      title: d.title,
      community: d.community,
      when: `${d.date}${d.time ? ` · ${d.time}` : ""}`,
      location: d.address ? `${d.location}, ${d.address}` : d.location,
    };
  },
  statusLabels: {
    scheduled: "Scheduled",
    agenda_draft: "Agenda draft",
    agenda_published: "Agenda published",
    held: "Held",
    minutes_draft: "Minutes draft",
    minutes_approved: "Minutes approved",
    cancelled: "Cancelled",
  },
  statusTone: {
    scheduled: "neutral",
    agenda_draft: "attention",
    agenda_published: "positive",
    held: "neutral",
    minutes_draft: "attention",
    minutes_approved: "positive",
    cancelled: "critical",
  },
  transitions: {
    scheduled: ["agenda_draft", "agenda_published", "cancelled"],
    agenda_draft: ["agenda_published", "cancelled"],
    agenda_published: ["held", "cancelled"],
    held: ["minutes_draft"],
    minutes_draft: ["minutes_approved"],
    minutes_approved: [],
    cancelled: ["scheduled"],
  },
  consequences: {
    scheduled: "This returns the meeting to scheduled.",
    agenda_draft: "This starts an agenda draft. Nothing is posted to residents yet.",
    agenda_published: "This posts the agenda to every resident portal and starts the statutory notice window — 144 hours for a regular meeting, 10 days for the annual.",
    held: "This marks the meeting as held and opens minutes drafting.",
    minutes_draft: "This starts a minutes draft, visible to staff only.",
    minutes_approved: "This publishes the approved minutes to every resident portal.",
    cancelled: "This cancels the meeting and notifies every owner who was given notice.",
  },
  filters: [
    { value: "all", label: "All" },
    { value: "scheduled", label: "Scheduled" },
    { value: "agenda_published", label: "Agenda published" },
    { value: "held", label: "Held" },
    { value: "minutes_approved", label: "Minutes approved" },
    { value: "cancelled", label: "Cancelled" },
  ],
  columns: [
    { primary: (r) => r.title, secondary: (r) => r.community },
    { cell: (r) => ({ label: "When", value: r.when, mono: true }) },
    { cell: (r) => ({ label: "Location", value: r.location }) },
  ],
  seed: [
    { id: "m1", status: "agenda_published", title: "September board meeting", community: "Sofi Lakes", when: "Sep 9 · 6:30 PM", location: "Clubhouse Annex, 7880 Morrison Road" },
    { id: "m2", status: "scheduled", title: "Annual homeowner meeting", community: "Sofi Lakes", when: "Nov 12 · 6:00 PM", location: "Great Hall, 7880 Morrison Road" },
    { id: "m3", status: "minutes_draft", title: "August board meeting", community: "Morrison Crossing", when: "Aug 12 · 6:30 PM", location: "Clubhouse Annex" },
  ],
};
