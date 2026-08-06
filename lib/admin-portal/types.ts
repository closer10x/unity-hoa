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
}

export interface LegalCase {
  id: string; owner: string; address: string; balance: string;
  stage: LegalStage; counsel: string;
}
export type LegalStage =
  | "Referred to counsel" | "Lien filed" | "Suit filed" | "Judgment"
  | "Foreclosure scheduled" | "Payment plan" | "Closed";

export interface Vendor {
  id: string; name: string; trade: string; contract: string;
  spend: string; insurance: string; ok: boolean;
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
}
export type StaffRole =
  | "Administrator" | "Community manager" | "Assistant manager"
  | "Maintenance tech" | "Inspector" | "Accounting" | "Front desk";

export type CalKind = "Meeting" | "Inspection" | "Booking" | "Legal" | "Community";

export interface CalEvent {
  id: string; date: string; title: string; detail: string;
  /** One of CalKind; typed loosely so custom categories can be added. */
  kind: string;
  community: string;
}

export interface Payment { id: string; date: string; label: string; amount: string; }

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
