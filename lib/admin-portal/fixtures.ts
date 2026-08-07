import type {
  ArcApp, Booking, CalEvent, Community, Delinquent, Director, Doc, LegalCase,
  Meeting, Owner, Payment, Portfolio, Staff, Vendor, Violation, WorkOrder,
} from "./types";

/**
 * Production-empty data. The portal launched with no records — every list
 * starts blank and fills as the office works (or as sections get wired to
 * Supabase). Do not add representative sample rows here; the client wants no
 * fabricated data anywhere.
 */

/** In production this comes from the session. */
export const CURRENT_USER = "Unity Grid administrator";

export const NAV: ReadonlyArray<{
  id: string;
  label: string;
  group: string;
  /** Live open-item count once sections are wired to real data. */
  badge?: string;
}> = [
  { id: "dashboard", label: "Dashboard", group: "Today" },
  { id: "owners", label: "Owners", group: "People" },
  { id: "calendar", label: "Calendar", group: "Today" },
  { id: "accounting", label: "Accounting", group: "Money" },
  { id: "legal", label: "Legal & liens", group: "Money" },
  { id: "work", label: "Work orders", group: "Property" },
  { id: "arc", label: "Architectural", group: "Property" },
  { id: "violations", label: "Violations", group: "Property" },
  { id: "bookings", label: "Bookings", group: "Property" },
  { id: "vendors", label: "Vendors", group: "Property" },
  { id: "comms", label: "Communications", group: "People" },
  { id: "board", label: "Board & meetings", group: "People" },
  { id: "docs", label: "Documents", group: "Office" },
  { id: "portfolio", label: "Communities", group: "Office" },
  { id: "team", label: "Team", group: "Office" },
];

export const NAV_GROUPS = ["Today", "Money", "Property", "People", "Office"] as const;

export const COMMUNITIES: Community[] = [
  { id: "sofi", name: "Sofi Lakes", location: "Katy, Texas 77493", doors: "—", dues: "—", cadence: "—", stage: "Active", portfolio: "" },
];

export const PORTFOLIOS: Portfolio[] = [];

export const OWNERS: Owner[] = [];

export const PAYMENTS: Payment[] = [];

export const DELINQUENTS: Delinquent[] = [];

export const AGING = [
  { label: "Current", amount: "$0" },
  { label: "1–30 days", amount: "$0" },
  { label: "31–60 days", amount: "$0" },
  { label: "61–90 days", amount: "$0" },
  { label: "90+ days", amount: "$0" },
];

export const BUDGET: { label: string; budget: string; actual: string; note: string }[] = [];

export const WORK: WorkOrder[] = [];

export const VIOLATIONS: Violation[] = [];

export const ARC_APPS: ArcApp[] = [];

export const BOOKINGS: Booking[] = [];

export const MEETINGS: Meeting[] = [];

export const DIRECTORS: Director[] = [];

export const LEGAL_CASES: LegalCase[] = [];

export const COUNSEL: { firm: string; contact: string; scope: string }[] = [];

export const LEGAL_CALENDAR: CalEvent[] = [];

export const VENDORS: Vendor[] = [];

export const DOCS: Doc[] = [];

export const STAFF: Staff[] = [];

export const ADMIN_CALENDAR: CalEvent[] = [];

export const SENT_HISTORY: { date: string; subject: string; meta: string }[] = [];

export const QUEUE: { id: string; label: string; detail: string; target: string }[] = [];

export const METRICS = [
  { label: "Receivables", value: "$0", note: "No transactions yet" },
  { label: "Open work orders", value: "0", note: "None open" },
  { label: "Pending reviews", value: "0", note: "None pending" },
  { label: "Delinquency rate", value: "—", note: "No accounts yet" },
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Calendar's initial "today". Use new Date() in production. */
export const TODAY = { year: 2026, month: 7, day: 7 };
