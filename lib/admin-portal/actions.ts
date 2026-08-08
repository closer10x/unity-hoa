import type {
  ActionStep, ArcStatus, BookingStatus, LegalStage, MeetingStatus,
  OnboardStage, ViolationStatus, WorkStatus,
} from "./types";

/**
 * Product rule: every status change is a "Take action…" dropdown listing every
 * valid next state, and every choice opens a confirmation stating the
 * consequence in plain language. Confirm labels are specific — never "OK".
 */

export const VIOLATION_STEPS: ActionStep<ViolationStatus>[] = [
  { id: "Courtesy sent", label: "Send courtesy notice", confirmLabel: "Send courtesy",
    confirm: "Send a courtesy notice for {name}? No fine attaches — the owner gets the cure period to fix it." },
  { id: "Notice sent", label: "Send formal notice", confirmLabel: "Send notice",
    confirm: "Send a formal violation notice for {name}? This starts the fine clock and is written to the owner's file." },
  { id: "Hearing set", label: "Set a board hearing", confirmLabel: "Set hearing",
    confirm: "Set a board hearing for {name}? Fines are suspended until the board rules." },
  { id: "Resolved", label: "Mark resolved", confirmLabel: "Yes, mark resolved",
    confirm: "Are you sure this is completed? Marking {name} resolved closes the file, drops any pending fine and notifies the owner." },
  { id: "Reported", label: "Reopen as reported", confirmLabel: "Reopen",
    confirm: "Reopen {name}? The file goes back to reported and the notice ladder starts over." },
];

export const WORK_STEPS: ActionStep<WorkStatus>[] = [
  { id: "New", label: "Send back to new", confirmLabel: "Send back",
    confirm: "Send \u201C{name}\u201D back to new? The current assignment is cleared." },
  { id: "Scheduled", label: "Assign & schedule", confirmLabel: "Schedule it",
    confirm: "Schedule \u201C{name}\u201D? The assignee is notified and the resident sees a scheduled date." },
  { id: "In progress", label: "Mark in progress", confirmLabel: "Mark in progress",
    confirm: "Mark \u201C{name}\u201D in progress? Are you sure the crew is on site?" },
  { id: "Closed", label: "Close out", confirmLabel: "Yes, close it",
    confirm: "Are you sure \u201C{name}\u201D is completed? Closing notifies the resident and locks the work order." },
];

export const ARC_STEPS: ActionStep<ArcStatus>[] = [
  { id: "Approved", label: "Approve", confirmLabel: "Yes, approve",
    confirm: "Approve {name}? Are you sure — the owner may start work as soon as the decision posts.",
    after: "Approved · decision sent to the owner" },
  { id: "Approved with conditions", label: "Approve with conditions", confirmLabel: "Approve with conditions",
    confirm: "Approve {name} with conditions? Write the conditions in the thread before you send — they become part of the approval.",
    after: "Conditions sent to the owner" },
  { id: "Denied", label: "Deny", confirmLabel: "Yes, deny",
    confirm: "Deny {name}? Are you sure — the owner gets the reason and their appeal rights, and the file stays open for 30 days.",
    after: "Denial and appeal rights sent" },
  { id: "More information needed", label: "Request more information", confirmLabel: "Request info",
    confirm: "Ask the owner for more information on {name}? The 30-day clock pauses until they respond.",
    after: "Waiting on the owner" },
  { id: "Awaiting decision", label: "Send back to the committee", confirmLabel: "Send back",
    confirm: "Put {name} back on the committee docket?", after: "Back on the docket" },
];

export const BOOKING_STEPS: ActionStep<BookingStatus>[] = [
  { id: "Requested", label: "Send back to requested", confirmLabel: "Send back",
    confirm: "Move \u201C{name}\u201D back to requested? The resident is told it needs review again." },
  { id: "Approved", label: "Approve booking", confirmLabel: "Approve",
    confirm: "Approve \u201C{name}\u201D? The space is held and the resident gets a confirmation." },
  { id: "Completed", label: "Mark completed", confirmLabel: "Yes, mark completed",
    confirm: "Are you sure \u201C{name}\u201D is finished? Deposits are released after a clean walk-through." },
  { id: "Cancelled", label: "Cancel booking", confirmLabel: "Cancel booking",
    confirm: "Cancel \u201C{name}\u201D? The resident is notified and any deposit is refunded." },
];

export const LEGAL_STEPS: ActionStep<LegalStage>[] = [
  { id: "Referred to counsel", label: "Refer to counsel", confirmLabel: "Refer",
    confirm: "Refer {name} to counsel? Attorney fees start accruing to the account." },
  { id: "Lien filed", label: "File a lien", confirmLabel: "File lien",
    confirm: "File a lien against {name}? This records against the property and needs the board's authorization on file." },
  { id: "Suit filed", label: "Authorize suit", confirmLabel: "Authorize suit",
    confirm: "Authorize suit against {name}? Are you sure — this is a board decision that must be minuted." },
  { id: "Judgment", label: "Record judgment", confirmLabel: "Record judgment",
    confirm: "Record a judgment for {name}?" },
  { id: "Foreclosure scheduled", label: "Schedule foreclosure sale", confirmLabel: "Yes, schedule the sale",
    confirm: "Schedule a foreclosure sale for {name}? Are you certain — this requires a recorded board vote and cannot be undone without counsel." },
  { id: "Payment plan", label: "Record a payment plan", confirmLabel: "Record plan",
    confirm: "Record a payment plan for {name}? Collection activity pauses while payments are current." },
  { id: "Closed", label: "Close the matter", confirmLabel: "Close matter",
    confirm: "Close the matter for {name}? Are you sure the balance and fees are settled?" },
];

export const MEETING_STEPS: ActionStep<MeetingStatus>[] = [
  { id: "Scheduled", label: "Back to scheduled", confirmLabel: "Send back",
    confirm: "Move {name} back to scheduled?" },
  { id: "Agenda draft", label: "Draft the agenda", confirmLabel: "Start draft",
    confirm: "Start the agenda for {name}?" },
  { id: "Agenda published", label: "Publish agenda & notice", confirmLabel: "Publish notice",
    confirm: "Publish the agenda and notice for {name}? Are you sure the statutory notice window is met — 144 hours for a regular meeting, 10 days for the annual." },
  { id: "Held", label: "Mark held", confirmLabel: "Mark held", confirm: "Mark {name} as held?" },
  { id: "Minutes draft", label: "Draft minutes", confirmLabel: "Start minutes",
    confirm: "Start minutes for {name}?" },
  { id: "Minutes approved", label: "Approve & publish minutes", confirmLabel: "Yes, publish",
    confirm: "Approve and publish the minutes for {name}? Are you sure — owners can read them in the portal immediately." },
  { id: "Cancelled", label: "Cancel meeting", confirmLabel: "Cancel meeting",
    confirm: "Cancel {name}? Owners who were noticed get a cancellation notice." },
];

export const ONBOARD_STEPS: ActionStep<OnboardStage>[] = [
  { id: "Onboarding", label: "Send back to onboarding", confirmLabel: "Send back",
    confirm: "Move {name} back to onboarding?" },
  { id: "Records transfer", label: "Start records transfer", confirmLabel: "Start transfer",
    confirm: "Start the records transfer for {name}? The prior manager gets the document request list." },
  { id: "Active", label: "Mark active", confirmLabel: "Yes, go live",
    confirm: "Are you sure {name} is ready to go live? Owners get portal invites and billing starts on the next cycle." },
  { id: "Offboarding", label: "Begin offboarding", confirmLabel: "Begin offboarding",
    confirm: "Begin offboarding {name}? Are you sure — billing stops and records are packaged for handover." },
];

export const DELINQ_STEPS: ActionStep[] = [
  { id: "1–30 days", label: "Send a reminder", confirmLabel: "Send reminder",
    confirm: "Send a payment reminder to {name}? Email and portal only — no fee." },
  { id: "31–60 days", label: "Send a late notice", confirmLabel: "Send notice",
    confirm: "Send a late notice to {name}? A late fee attaches per the collection policy." },
  { id: "61–90 days", label: "Send a final notice", confirmLabel: "Send final notice",
    confirm: "Send the final notice to {name}? Certified mail, and the next step is a legal referral." },
  { id: "90+ days", label: "Escalate to 90+ days", confirmLabel: "Escalate",
    confirm: "Escalate {name} to 90+ days? Are you sure — this flags the account for board review." },
  { id: "Lien filed", label: "File a lien", confirmLabel: "Yes, file the lien",
    confirm: "File a lien against {name}? Are you certain — this records against the property and needs the board's authorization on file." },
  { id: "Payment plan", label: "Record a payment plan", confirmLabel: "Record plan",
    confirm: "Record a payment plan for {name}? Collections pause while payments stay current." },
];

export const ROLE_MATRIX: { role: string; access: string }[] = [
  { role: "Accounting", access: "Ledgers, payments, delinquencies, budgets and statements across every community." },
  { role: "Maintenance tech", access: "Work orders assigned to them, amenity schedules and vendor contacts. No owner financials." },
  { role: "Inspector", access: "Inspection routes, violation logging with photos, and read-only owner files." },
  { role: "Front desk", access: "Owner lookup, bookings, guest passes and message intake. No financial edits." },
  { role: "Assistant manager", access: "Same as a manager minus legal referrals, lien filings and fee waivers." },
  { role: "Community manager", access: "Full access to their assigned communities: accounting, owners, work orders, violations, board and communications." },
  { role: "Administrator", access: "Everything, plus staff accounts, billing setup and community onboarding." },
  { role: "Owner", access: "The business owner's account. Everything, with no restrictions — new sections are included automatically." },
];

export const ROLE_HINTS: Record<string, string> = {
  "Community manager": "Full access to assigned communities, including financials and board tools.",
  "Assistant manager": "Manager access minus legal referrals, liens and fee waivers.",
  "Maintenance tech": "Sees only work orders assigned to them, plus vendor contacts.",
  Inspector: "Inspection routes and violation logging. Owner files are read-only.",
  Accounting: "Ledgers, payments and budgets across every community.",
  "Front desk": "Owner lookup, bookings and message intake. No financial edits.",
  Administrator: "Everything, including staff accounts and community onboarding.",
  Owner: "The business owner's account — everything, always, including sections added later.",
};

export const PAY_METHODS = [
  { id: "card", label: "Credit or debit card" },
  { id: "ach", label: "Bank transfer (ACH)" },
  { id: "check", label: "Check" },
  { id: "money", label: "Money order" },
  { id: "cash", label: "Cash" },
] as const;

/** Card-not-present processor fee. Confirm against the chosen processor. */
export const CARD_FEE_RATE = 0.0295;
