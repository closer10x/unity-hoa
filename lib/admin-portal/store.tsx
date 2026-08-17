"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as fx from "./fixtures";
import { ALL_SECTIONS } from "./permissions";
import { MOBILE_BREAKPOINT } from "./tokens";
import type {
  BillingEntity,
  MetricTone,
  AddressSuggestion, ArcApp, AuditEntry, BankAccount, Booking, CalEvent, Community, ConcernReport, Delinquent, Director, Doc, Fee, Invoice, LedgerEntry, LegalCase, Meeting, Owner, Payment, PendingConfirm, Portfolio, ResidentSignup, ResidentThread, SignInEvent, Staff, StaffRole, Vendor, Violation, WorkOrder,
} from "./types";

/**
 * Client store for the admin portal. Server records arrive as `initialData`
 * from the RSC layer and are mutated through server actions; what lives here
 * is that data plus the UI state around it — scope, section, open drawer,
 * pending confirmation, form drafts.
 *
 * The audit log is written server-side, inside the same action as the mutation
 * it records. The `audit()` append below is the optimistic echo of that write,
 * so the trail updates without waiting for a reload — it is never the record
 * itself.
 */

function stamp(): string {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

let seq = 0;
const uid = (p: string) => `${p}${Date.now()}${seq++}`;

interface Store {
  // navigation & scope
  view: string;
  setView: (v: string) => void;
  scope: string;
  setScope: (s: string) => void;
  scopeLabel: string;
  scopeCommunityIds: string[];
  isMobile: boolean;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;

  // records
  owners: Owner[];
  addOwner: (o: Owner) => void;
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>;
  payments: Payment[];
  delinquents: Delinquent[];
  setDelinquents: React.Dispatch<React.SetStateAction<Delinquent[]>>;
  work: WorkOrder[];
  setWork: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
  concerns: ConcernReport[];
  arcApps: ArcApp[];
  setArcApps: React.Dispatch<React.SetStateAction<ArcApp[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  directors: Director[];
  setDirectors: React.Dispatch<React.SetStateAction<Director[]>>;
  legalCases: LegalCase[];
  setLegalCases: React.Dispatch<React.SetStateAction<LegalCase[]>>;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  docs: Doc[];
  setDocs: React.Dispatch<React.SetStateAction<Doc[]>>;
  communities: Community[];
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  portfolios: Portfolio[];
  setPortfolios: React.Dispatch<React.SetStateAction<Portfolio[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  residentThreads: ResidentThread[];
  setResidentThreads: React.Dispatch<React.SetStateAction<ResidentThread[]>>;
  /** Households waiting on approval from the public sign-up form. */
  signups: ResidentSignup[];
  setSignups: React.Dispatch<React.SetStateAction<ResidentSignup[]>>;
  /** The public sign-up link the office hands out. */
  joinUrl: string;
  customEvents: CalEvent[];
  setCustomEvents: React.Dispatch<React.SetStateAction<CalEvent[]>>;
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  invoiceMemos: string[];
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  fees: Fee[];
  /** The companies the office keeps books for, in display order. */
  entities: BillingEntity[];
  setFees: React.Dispatch<React.SetStateAction<Fee[]>>;
  /** Set before jumping to Owners to open that owner in focus (search prefilled). */
  focusOwnerId: string | null;
  setFocusOwnerId: (id: string | null) => void;

  // audit
  auditLog: AuditEntry[];
  audit: (text: string) => void;
  stamp: () => string;
  uid: (prefix: string) => string;
  currentUser: string;
  /** The signed-in account's profile id, so the header can find its photo. */
  currentUserId: string | null;
  /** The signed-in account's staff role, from the server session. */
  currentRole: StaffRole | null;
  /** Destructive actions are Administrator-only. */
  isAdministrator: boolean;
  /** Known addresses from the lots roster, for add-form autofill. */
  addressBook: AddressSuggestion[];
  /** Recent sign-in activity, shown in Team. */
  signIns: SignInEvent[];
  /** Dashboard tiles computed server-side from live reads. */
  metrics: { label: string; value: string; note: string; tone?: MetricTone }[];

  /** Section ids this account may open; resolved server-side from staff_role. */
  allowedSections: string[];
  /** Whether this account may change the crew schedule; Schedule is read-only if not. */
  canEditSchedule: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({
  children,
  allowedSections,
  currentUser,
  currentUserId = null,
  currentRole = null,
  canEditSchedule = true,
  initialData,
}: {
  children: React.ReactNode;
  /** From the server session (sectionsForRole). Defaults to everything for
      contexts without a session, e.g. the unconfigured-dev fallback. */
  allowedSections?: string[];
  /** The signed-in account, used to stamp audit entries. */
  currentUser?: string;
  /** Their profile id, so the header can show their photo rather than initials. */
  currentUserId?: string | null;
  /** staff_role from the session; gates destructive actions. */
  currentRole?: StaffRole | null;
  /** Whether this account may change the crew schedule (view-only if not).
      Defaults true for the sessionless dev fallback. */
  canEditSchedule?: boolean;
  /**
   * Collections read from the database on the server. Sections whose tables
   * do not exist yet are simply absent here and stay empty — the fixtures are
   * no longer used as a fallback, because showing invented records against a
   * live database is worse than showing none.
   */
  initialData?: Partial<{
    owners: Owner[];
    work: WorkOrder[];
    docs: Doc[];
    staff: Staff[];
    calendar: CalEvent[];
    payments: Payment[];
    communities: Community[];
    ledger: LedgerEntry[];
    bankAccounts: BankAccount[];
    invoices: Invoice[];
    invoiceMemos: string[];
    fees: Fee[];
    entities: BillingEntity[];
    /** Server-written audit trail (admin_audit_log), newest first. */
    audit: AuditEntry[];
    metrics: { label: string; value: string; note: string; tone?: MetricTone }[];
    addressBook: AddressSuggestion[];
    signIns: SignInEvent[];
    violations: Violation[];
    concerns: ConcernReport[];
    arcApps: ArcApp[];
    bookings: Booking[];
    vendors: Vendor[];
    legalCases: LegalCase[];
    meetings: Meeting[];
    directors: Director[];
    portfolios: Portfolio[];
    residentThreads: ResidentThread[];
    signups: ResidentSignup[];
    joinUrl: string;
  }>;
}) {
  const allowed = allowedSections ?? [...ALL_SECTIONS];
  const account = currentUser?.trim() || fx.CURRENT_USER;
  /* Rule 4 wants who did it — the account and the capacity they acted in.
     Composed here rather than by each caller, so entries cannot drift into
     "someone@example.com" with the role missing. */
  const actor =
    currentRole && !account.includes(currentRole)
      ? `${account} · ${currentRole}`
      : account;
  /* Only Administrators may delete. Anything else — including an unset role —
     gets the read/act surface without the destructive one. */
  const isAdministrator = currentRole === "Administrator" || currentRole === "Owner";
  const [view, setViewRaw] = useState(allowed[0] ?? "dashboard");
  const [scope, setScope] = useState("all");
  const [vw, setVw] = useState(1200);
  const [navOpen, setNavOpen] = useState(false);

  const [owners, setOwners] = useState<Owner[]>(initialData?.owners ?? []);
  const [payments, setPayments] = useState<Payment[]>(initialData?.payments ?? []);
  const [delinquents, setDelinquents] = useState<Delinquent[]>([]);
  const [work, setWork] = useState<WorkOrder[]>(initialData?.work ?? []);
  const [violations, setViolations] = useState<Violation[]>(initialData?.violations ?? []);
  const concerns = initialData?.concerns ?? [];
  const [arcApps, setArcApps] = useState<ArcApp[]>(initialData?.arcApps ?? []);
  const [bookings, setBookings] = useState<Booking[]>(initialData?.bookings ?? []);
  const [meetings, setMeetings] = useState<Meeting[]>(initialData?.meetings ?? []);
  const [directors, setDirectors] = useState<Director[]>(initialData?.directors ?? []);
  const [legalCases, setLegalCases] = useState<LegalCase[]>(initialData?.legalCases ?? []);
  const [vendors, setVendors] = useState<Vendor[]>(initialData?.vendors ?? []);
  const [docs, setDocs] = useState<Doc[]>(initialData?.docs ?? []);
  const [communities, setCommunities] = useState<Community[]>(initialData?.communities ?? []);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialData?.portfolios ?? []);
  const [staff, setStaff] = useState<Staff[]>(initialData?.staff ?? []);
  const [residentThreads, setResidentThreads] = useState<ResidentThread[]>(initialData?.residentThreads ?? []);
  const [signups, setSignups] = useState<ResidentSignup[]>(initialData?.signups ?? []);
  const metrics = initialData?.metrics ?? [];
  const addressBook = initialData?.addressBook ?? [];
  const signIns = initialData?.signIns ?? [];
  const [customEvents, setCustomEvents] = useState<CalEvent[]>(initialData?.calendar ?? []);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialData?.ledger ?? []);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialData?.bankAccounts ?? []);
  const [invoices, setInvoices] = useState<Invoice[]>(initialData?.invoices ?? []);
  const [fees, setFees] = useState<Fee[]>(initialData?.fees ?? []);
  const [focusOwnerId, setFocusOwnerId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialData?.audit ?? []);

  useEffect(() => {
    /* Only the breakpoint matters, so listen for the boundary being crossed
       rather than every resize frame — dragging a window edge otherwise
       re-rendered the whole portal, list rows and all, at screen rate. */
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const apply = () => setVw(mq.matches ? MOBILE_BREAKPOINT - 1 : MOBILE_BREAKPOINT);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const audit = useCallback((text: string) => {
    setAuditLog((prev) => [{ id: uid("au"), text, who: actor, time: stamp() }, ...prev]);
  }, [actor]);

  const setView = useCallback((v: string) => {
    setViewRaw(v);
    setNavOpen(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  const addOwner = useCallback((o: Owner) => setOwners((prev) => [o, ...prev]), []);

  const scopeCommunityIds = useMemo(() => {
    if (scope === "all") return communities.map((c) => c.id);
    const pf = portfolios.find((p) => p.id === scope);
    if (pf) return pf.members;
    return [scope];
  }, [scope, communities, portfolios]);

  const scopeLabel = useMemo(() => {
    if (scope === "all") return "all communities";
    const pf = portfolios.find((p) => p.id === scope);
    if (pf) return pf.name;
    return communities.find((c) => c.id === scope)?.name ?? "all communities";
  }, [scope, communities, portfolios]);

  const value: Store = {
    view, setView, scope, setScope, scopeLabel, scopeCommunityIds,
    isMobile: vw < MOBILE_BREAKPOINT, navOpen, setNavOpen,
    owners, addOwner, setOwners, payments, delinquents, setDelinquents,
    work, setWork, violations, setViolations, concerns, arcApps, setArcApps,
    bookings, setBookings, meetings, setMeetings, directors, setDirectors,
    legalCases, setLegalCases, vendors, setVendors, docs, setDocs,
    communities, setCommunities, portfolios, setPortfolios, staff, setStaff,
    residentThreads, setResidentThreads, signups, setSignups,
    joinUrl: initialData?.joinUrl ?? "",
    customEvents, setCustomEvents,
    ledger, setLedger, bankAccounts, setBankAccounts,
    invoices, setInvoices, invoiceMemos: initialData?.invoiceMemos ?? [],
    fees, setFees, entities: initialData?.entities ?? [], focusOwnerId, setFocusOwnerId,
    auditLog, audit, stamp, uid, currentUser: actor, currentUserId, currentRole, isAdministrator, metrics, addressBook, signIns,
    allowedSections: allowed,
    canEditSchedule,
  };

  // setPayments is used by the payment flow via the exported hook below
  (value as Store & { setPayments: typeof setPayments }).setPayments = setPayments;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store & { setPayments: React.Dispatch<React.SetStateAction<Payment[]>> } {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v as Store & { setPayments: React.Dispatch<React.SetStateAction<Payment[]>> };
}

/**
 * Search + status-filter for a list. Product rule: every list has both.
 */
export function useSearchFilter<T>(
  list: T[],
  query: string,
  fields: (keyof T)[],
  extra?: (item: T) => boolean,
): T[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((item) => {
      if (extra && !extra(item)) return false;
      if (!q) return true;
      return fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q));
    });
  }, [list, query, fields, extra]);
}

/**
 * Drives an action dropdown + confirmation bar for one record.
 * Only one confirmation is open per list at a time.
 *
 * Not a hook — it calls nothing and is safe to invoke inside a .map over rows.
 */
export function buildActionMenu<S extends string>(
  steps: { id: S; label: string; confirmLabel: string; confirm: string }[],
  current: S,
  recordId: string,
  displayName: string,
  pending: PendingConfirm | null,
  setPending: (p: PendingConfirm | null) => void,
) {
  const isPending = pending?.id === recordId;
  return {
    options: steps.filter((s) => s.id !== current),
    onChoose: (id: string) => {
      if (!id) return;
      const step = steps.find((s) => s.id === id);
      if (!step) return;
      setPending({
        id: recordId, next: id,
        label: step.confirmLabel,
        text: step.confirm.replace("{name}", displayName),
      });
    },
    confirming: isPending,
    confirmText: isPending ? pending!.text : "",
    confirmLabel: isPending ? pending!.label : "",
    nextValue: isPending ? (pending!.next as S) : null,
    cancel: () => setPending(null),
  };
}
