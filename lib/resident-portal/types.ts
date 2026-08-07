/** Domain types for the resident portal. Mirrors the admin portal's style. */

export type PendingConfirm = {
  id: string;
  next: string;
  label: string;
  text: string;
};

/** The signed-in resident's property, as resolved from the lots roster. */
export type Property = {
  /** Lot id, or "none" when the office hasn't linked a lot yet. */
  id: string;
  /** Community display name, e.g. "Sofi Lakes". */
  name: string;
  /** One-line address, e.g. "1420 Willow Bend Ln · Lot 214". */
  address: string;
  /** Full postal line, no lot number: "1420 Willow Bend Ln, Katy, Texas 77493". */
  mailingAddress: string;
  /** Account reference shown in mono. Empty when unassigned. */
  account: string;
  /** "$285.00" — or empty when no balance is on file. */
  balance: string;
  balanceCents: number | null;
  /** Next due date, e.g. "October 1" — empty when billing is unconfigured. */
  due: string;
  /** The last due date passed with no payment recorded on this lot. */
  overdue: boolean;
  /** "Quarterly", "Monthly", … — empty when billing is unconfigured. */
  cadence: string;
  /** Active emergency notice for the alert band; empty when none. */
  alert: string;
};

export type LedgerLine = {
  id: string;
  date: string;
  label: string;
  /** Display amount, e.g. "$285.00" or "−$285.00". */
  amount: string;
  /** Running balance display, or "—" when not tracked. */
  balance: string;
  credit: boolean;
};

export type PaymentRecord = {
  id: string;
  date: string;
  label: string;
  amount: string;
  status: string;
};

export type MaintStatus = "Received" | "Scheduled" | "In progress" | "Closed";

export type MaintReq = {
  id: string;
  ref: string;
  title: string;
  detail: string;
  status: MaintStatus;
  open: boolean;
};

export type ResArcApp = {
  id: string;
  ref: string;
  title: string;
  detail: string;
  status: string;
  ok: boolean;
};

export type Reservation = {
  id: string;
  date: string;
  label: string;
  status: string;
  deposit: string;
};

export type GuestPass = {
  id: string;
  name: string;
  detail: string;
  code: string;
};

export type Vehicle = {
  id: string;
  label: string;
  tag: string;
};

/** A compliance notice against the resident's own property. */
export type ComplianceNotice = {
  id: string;
  date: string;
  title: string;
  detail: string;
  status: string;
  ok: boolean;
};

export type DocItem = {
  id: string;
  title: string;
  meta: string;
  category: string;
};

export type ChatMsg = {
  id: string;
  from: string;
  mine: boolean;
  time: string;
  body: string;
  attachment?: string;
};

export type Thread = {
  id: string;
  party: string;
  subject: string;
  date: string;
  unread: boolean;
  status: "Open" | "Closed";
  messages: ChatMsg[];
};

export type HouseholdMember = {
  id: string;
  name: string;
  role: string;
  contact: string;
  /** The owner of record cannot be removed. */
  locked?: boolean;
};

export type Pet = {
  id: string;
  name: string;
  detail: string;
  status: string;
  ok: boolean;
};

export type Lease = {
  id: string;
  tenant: string;
  detail: string;
  status: string;
  ok: boolean;
  locked?: boolean;
};

export type EventItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
};

export type Announcement = {
  id: string;
  meta: string;
  title: string;
  body: string;
};

/** Notice type id → delivery channels. */
export type NotifyPrefs = Record<string, { email: boolean; text: boolean }>;

export const NOTIFY_TYPES = [
  { id: "billing", label: "Billing & statements" },
  { id: "maintenance", label: "Maintenance updates" },
  { id: "arc", label: "Architectural decisions" },
  { id: "compliance", label: "Compliance notices" },
  { id: "community", label: "Community news & events" },
  { id: "meetings", label: "Meeting agendas & minutes" },
] as const;

export const DEFAULT_NOTIFY: NotifyPrefs = {
  billing: { email: true, text: false },
  maintenance: { email: true, text: false },
  arc: { email: true, text: false },
  compliance: { email: true, text: false },
  community: { email: true, text: false },
  meetings: { email: false, text: false },
};
