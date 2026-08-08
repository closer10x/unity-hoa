export type Scope = string; // "all" | portfolio id | community id

export interface AuditEntry { id: string; text: string; who: string; time: string; }

export interface Address {
  streetNo: string; street: string; unit: string;
  city: string; state: string; zip: string;
}

export interface Owner {
  id: string; name: string; address: string; contact: string;
  balance: string; status: string; scope: string;
  flag: "current" | "delinquent" | "tenant"; account: string;
}

export interface WorkOrder {
  id: string; ref: string; title: string; detail: string;
  assignee: string; status: WorkStatus;
  /** Scheduling: which tech, and the day the job is due. Both optional so
      work orders created in-session before a schedule is set still type. */
  assigneeId?: string | null;
  dueAt?: string | null;
  priority?: string | null;
}
export type WorkStatus = "New" | "Scheduled" | "In progress" | "Closed";

export interface Violation {
  id: string; date: string; title: string; detail: string; status: ViolationStatus;
  photos: string[]; mailings: Mailing[]; notes: CaseNote[]; activity: AuditEntry[];
}
export type ViolationStatus =
  | "Reported" | "Courtesy sent" | "Notice sent" | "Hearing set" | "Resolved";

export interface Mailing {
  kind: string; method: string; sent: string; tracking: string; status: string;
}
export interface CaseNote { author: string; time: string; text: string; }

export interface ArcApp {
  id: string; ref: string; title: string; owner: string; submitted: string;
  due: string; status: ArcStatus; decisionNote?: string; thread: ThreadMsg[];
}
export type ArcStatus =
  | "Awaiting decision" | "Approved" | "Approved with conditions"
  | "Denied" | "More information needed";

export interface ThreadMsg {
  from: string; mine: boolean; time: string; body: string; attachment?: string;
}

export interface Booking {
  id: string; date: string; amenity: string; detail: string;
  deposit: string; status: BookingStatus;
}
export type BookingStatus = "Requested" | "Approved" | "Completed" | "Cancelled";

export interface Meeting {
  id: string; date: string; title: string; detail: string;
  status: MeetingStatus; notice: string; noticeOk: boolean; minutes: Minutes | null;
}
export type MeetingStatus =
  | "Scheduled" | "Agenda draft" | "Agenda published" | "Held"
  | "Minutes draft" | "Minutes approved" | "Cancelled";

export interface Minutes {
  attendance: string; body: string; motions: string; published: boolean;
}

export interface Director {
  id: string; name: string; role: string; address: string; term: string;
  /** ISO end date when the seat has been closed out; null while seated. */
  termEnd: string | null;
}

export interface LegalCase {
  id: string; owner: string; address: string; balance: string;
  stage: LegalStage; counsel: string;
  /** The board vote that authorized a lien, suit or foreclosure. */
  boardVoteOn: string | null;
}
export type LegalStage =
  | "Referred to counsel" | "Lien filed" | "Suit filed" | "Judgment"
  | "Foreclosure scheduled" | "Payment plan" | "Closed";

export interface Vendor {
  id: string; name: string; trade: string; contract: string;
  spend: string; insurance: string; ok: boolean;
  /** Deactivated vendors stay on the roster but drop out of assignment lists. */
  active: boolean;
  contact: string;
}

export interface Doc {
  id: string; title: string; meta: string; published: boolean;
}

export interface Community {
  id: string; name: string; location: string; doors: string;
  dues: string; cadence: string; stage: OnboardStage; portfolio: string;
}
export type OnboardStage = "Onboarding" | "Records transfer" | "Active" | "Offboarding";

export interface Portfolio { id: string; name: string; members: string[]; }

export interface Staff {
  id: string; name: string; email: string; role: StaffRole;
  communities: string[]; active: boolean; load: number;
  /** Backing rows: an employees record, a portal sign-in (profiles/auth), or both. */
  employeeId: string | null;
  profileId: string | null;
  /** Custom section override an Administrator granted; null = role default. */
  sections: string[] | null;
  /** Signed URL for the profile photo; null when none is on file. */
  photoUrl: string | null;
}
export type StaffRole =
  | "Owner" | "Administrator" | "Community manager" | "Assistant manager"
  | "Maintenance tech" | "Inspector" | "Accounting" | "Front desk";

export type CalKind = "Meeting" | "Inspection" | "Booking" | "Legal" | "Community";

export interface CalEvent {
  id: string; date: string; title: string; detail: string;
  /** One of CalKind; typed loosely so custom categories can be added. */
  kind: string;
  community: string;
}

export interface Payment { id: string; date: string; label: string; amount: string; }

/** One line in the general ledger (finance_transactions). */
export interface LedgerEntry {
  id: string;
  /** ISO date the money moved (occurred_on). */
  date: string;
  dateLabel: string;
  kind: "income" | "expense" | "transfer";
  category: string;
  description: string;
  amount: string;
  amountCents: number;
  source: "manual" | "bank";
  /** Bank account label for imported rows; "" for manual entries. */
  account: string;
  pending: boolean;
  /** The owner (lot) this money belongs to, when linked — e.g. an HOA fee. */
  ownerId: string | null;
  ownerName: string;
}

/** A named fee from the association's fee schedule (quick-picks on forms). */
export interface Fee {
  id: string;
  name: string;
  category: string;
  amount: string;
  amountCents: number;
  active: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  mask: string;
  type: string;
  balance: string;
  balanceCents: number | null;
  lastSync: string;
  status: "active" | "disconnected";
}

export interface Delinquent {
  id: string; owner: string; address: string; balance: string; stage: string;
}

/** A single valid next state for an action dropdown, with its confirmation copy. */
export interface ActionStep<T extends string = string> {
  id: T;
  label: string;
  confirmLabel: string;
  /** "{name}" is replaced with the record's display name. */
  confirm: string;
  after?: string;
}

export interface PendingConfirm {
  id: string; next: string; label: string; text: string;
}

/** A known address from the lots roster, used to autofill add-forms. */
export interface AddressSuggestion {
  streetNo: string;
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  /** "1420 Willow Bend Ln · Lot 12" — what the picker shows. */
  label: string;
  /** True when a lot already has an owner linked. */
  taken: boolean;
}

/* ─── Financial reports ─────────────────────────────────────────────── */

export type ReportType = "income-statement" | "general-ledger" | "cash-bank" | "owner-charges";

export interface ReportSection {
  title: string;
  columns: string[];
  rows: string[][];
  /** Footer row, e.g. ["Total income", "", "$4,200.00"]. */
  total?: string[];
}

export interface ReportData {
  type: ReportType;
  title: string;
  community: string;
  periodLabel: string;
  start: string;
  end: string;
  generatedAt: string;
  generatedBy: string;
  summary: { label: string; value: string; note?: string }[];
  sections: ReportSection[];
  /** Honest empty-period note instead of invented rows. */
  note?: string;
}

/** One sign-in, sign-out or reset attempt, shown in Team. */
export interface SignInEvent {
  id: string;
  event: string;
  who: string;
  succeeded: boolean;
  reason: string | null;
  ip: string;
  device: string;
  at: string;
}

/** One message inside a resident conversation. */
export interface ResidentThreadMsg {
  id: string;
  from: string;
  /** Authored by staff (right-aligned in the admin view). */
  fromStaff: boolean;
  time: string;
  body: string;
}

/** A resident's conversation with the office, shown in Communications. */
export interface ResidentThread {
  id: string;
  resident: string;
  party: string;
  subject: string;
  status: string;
  date: string;
  /** The resident spoke last and the thread is open. */
  awaitingReply: boolean;
  messages: ResidentThreadMsg[];
}
