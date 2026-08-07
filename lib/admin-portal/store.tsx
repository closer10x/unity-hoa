"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as fx from "./fixtures";
import { ALL_SECTIONS } from "./permissions";
import { MOBILE_BREAKPOINT } from "./tokens";
import type {
  ArcApp, AuditEntry, Booking, CalEvent, Community, Delinquent, Director, Doc,
  LegalCase, Meeting, Owner, Payment, PendingConfirm, Portfolio, Staff, Vendor,
  Violation, WorkOrder,
} from "./types";

/**
 * Client store for the prototype. In production, split this: server records
 * belong in a data-fetching layer (React Query / RSC + server actions) and only
 * UI state — scope, section, open drawer, pending confirmation, form drafts —
 * stays on the client.
 *
 * The audit log MUST be written server-side inside the same transaction as the
 * mutation it records. The client-side append here exists only to demonstrate
 * the surface.
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
  payments: Payment[];
  delinquents: Delinquent[];
  setDelinquents: React.Dispatch<React.SetStateAction<Delinquent[]>>;
  work: WorkOrder[];
  setWork: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
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
  customEvents: CalEvent[];
  setCustomEvents: React.Dispatch<React.SetStateAction<CalEvent[]>>;
  eventMoves: Record<string, string>;
  setEventMoves: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // audit
  auditLog: AuditEntry[];
  audit: (text: string) => void;
  stamp: () => string;
  uid: (prefix: string) => string;
  currentUser: string;

  /** Section ids this account may open; resolved server-side from staff_role. */
  allowedSections: string[];
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({
  children,
  allowedSections,
  currentUser,
}: {
  children: React.ReactNode;
  /** From the server session (sectionsForRole). Defaults to everything for
      contexts without a session, e.g. the unconfigured-dev fallback. */
  allowedSections?: string[];
  /** The signed-in account, used to stamp audit entries. */
  currentUser?: string;
}) {
  const allowed = allowedSections ?? [...ALL_SECTIONS];
  const actor = currentUser?.trim() || fx.CURRENT_USER;
  const [view, setViewRaw] = useState(allowed[0] ?? "dashboard");
  const [scope, setScope] = useState("all");
  const [vw, setVw] = useState(1200);
  const [navOpen, setNavOpen] = useState(false);

  const [owners, setOwners] = useState<Owner[]>(fx.OWNERS);
  const [payments, setPayments] = useState<Payment[]>(fx.PAYMENTS);
  const [delinquents, setDelinquents] = useState<Delinquent[]>(fx.DELINQUENTS);
  const [work, setWork] = useState<WorkOrder[]>(fx.WORK);
  const [violations, setViolations] = useState<Violation[]>(fx.VIOLATIONS);
  const [arcApps, setArcApps] = useState<ArcApp[]>(fx.ARC_APPS);
  const [bookings, setBookings] = useState<Booking[]>(fx.BOOKINGS);
  const [meetings, setMeetings] = useState<Meeting[]>(fx.MEETINGS);
  const [directors, setDirectors] = useState<Director[]>(fx.DIRECTORS);
  const [legalCases, setLegalCases] = useState<LegalCase[]>(fx.LEGAL_CASES);
  const [vendors, setVendors] = useState<Vendor[]>(fx.VENDORS);
  const [docs, setDocs] = useState<Doc[]>(fx.DOCS);
  const [communities, setCommunities] = useState<Community[]>(fx.COMMUNITIES);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(fx.PORTFOLIOS);
  const [staff, setStaff] = useState<Staff[]>(fx.STAFF);
  const [customEvents, setCustomEvents] = useState<CalEvent[]>([]);
  const [eventMoves, setEventMoves] = useState<Record<string, string>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
    owners, addOwner, payments, delinquents, setDelinquents,
    work, setWork, violations, setViolations, arcApps, setArcApps,
    bookings, setBookings, meetings, setMeetings, directors, setDirectors,
    legalCases, setLegalCases, vendors, setVendors, docs, setDocs,
    communities, setCommunities, portfolios, setPortfolios, staff, setStaff,
    customEvents, setCustomEvents, eventMoves, setEventMoves,
    auditLog, audit, stamp, uid, currentUser: actor,
    allowedSections: allowed,
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
