"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { MOBILE_BREAKPOINT } from "@/lib/admin-portal/tokens";
import { DEFAULT_NOTIFY } from "./types";
import type {
  Announcement, ComplianceNotice, DocItem, EventItem, GuestPass,
  HouseholdMember, Lease, LedgerLine, MaintReq, NotifyPrefs, PaymentRecord,
  Pet, Property, ResArcApp, Reservation, Thread, Vehicle,
} from "./types";

/**
 * Client store for the resident portal. Server records arrive through
 * `initialData` (read in server-data.ts, scoped to the signed-in resident);
 * UI state — section, drawers, drafts, pending confirmations — lives here.
 *
 * Mutations are optimistic client appends for now, mirroring how the admin
 * portal was built up domain by domain; persistence lands per-domain via
 * server actions. Nothing here invents records: every list starts from the
 * database or empty.
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

const NO_PROPERTY: Property = {
  id: "none",
  name: "Unity Grid",
  address: "No property linked yet",
  mailingAddress: "",
  account: "",
  balance: "",
  balanceCents: null,
  due: "",
  overdue: false,
  cadence: "",
  alert: "",
};

interface Store {
  // navigation
  view: string;
  setView: (v: string) => void;
  isMobile: boolean;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;

  // identity & property
  residentName: string;
  residentEmail: string;
  residentPhone: string;
  property: Property;

  // records
  ledger: LedgerLine[];
  payments: PaymentRecord[];
  requests: MaintReq[];
  setRequests: React.Dispatch<React.SetStateAction<MaintReq[]>>;
  arcApps: ResArcApp[];
  setArcApps: React.Dispatch<React.SetStateAction<ResArcApp[]>>;
  notices: ComplianceNotice[];
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  guestPasses: GuestPass[];
  setGuestPasses: React.Dispatch<React.SetStateAction<GuestPass[]>>;
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  docs: DocItem[];
  threads: Thread[];
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
  events: EventItem[];
  announcements: Announcement[];
  household: HouseholdMember[];
  setHousehold: React.Dispatch<React.SetStateAction<HouseholdMember[]>>;
  pets: Pet[];
  setPets: React.Dispatch<React.SetStateAction<Pet[]>>;
  leases: Lease[];
  setLeases: React.Dispatch<React.SetStateAction<Lease[]>>;
  notify: NotifyPrefs;
  setNotify: React.Dispatch<React.SetStateAction<NotifyPrefs>>;
  autopay: boolean;
  setAutopay: (v: boolean) => void;
  smsOptIn: boolean;
  setSmsOptIn: (v: boolean) => void;
  gateCode: string;
  setGateCode: (v: string) => void;

  // community policy — what this community offers
  leasesAllowed: boolean;
  gateCodesAllowed: boolean;
  guestPassesAllowed: boolean;

  // helpers
  stamp: () => string;
  uid: (prefix: string) => string;
  unreadCount: number;
  openRequestCount: number;
}

const Ctx = createContext<Store | null>(null);

export type ResidentInitialData = Partial<{
  property: Property;
  ledger: LedgerLine[];
  payments: PaymentRecord[];
  requests: MaintReq[];
  arcApps: ResArcApp[];
  notices: ComplianceNotice[];
  reservations: Reservation[];
  docs: DocItem[];
  events: EventItem[];
  announcements: Announcement[];
  notify: NotifyPrefs;
  smsOptIn: boolean;
  threads: Thread[];
  guestPasses: GuestPass[];
  vehicles: Vehicle[];
  pets: Pet[];
  leasesAllowed: boolean;
  gateCodesAllowed: boolean;
  guestPassesAllowed: boolean;
}>;

export function StoreProvider({
  children,
  residentName,
  residentEmail,
  residentPhone = "",
  initialData,
}: {
  children: React.ReactNode;
  residentName: string;
  residentEmail: string;
  residentPhone?: string;
  initialData?: ResidentInitialData;
}) {
  const [view, setViewRaw] = useState("overview");
  const [vw, setVw] = useState(1200);
  const [navOpen, setNavOpen] = useState(false);

  const property = initialData?.property ?? NO_PROPERTY;
  const ledger = initialData?.ledger ?? [];
  const payments = initialData?.payments ?? [];
  const [requests, setRequests] = useState<MaintReq[]>(initialData?.requests ?? []);
  const [arcApps, setArcApps] = useState<ResArcApp[]>(initialData?.arcApps ?? []);
  const notices = initialData?.notices ?? [];
  const [reservations, setReservations] = useState<Reservation[]>(initialData?.reservations ?? []);
  /* Seeded from the server like every other collection. These two were
     initialised empty, so a pass issued in one session was gone by the next
     even once it was being written down. */
  const [guestPasses, setGuestPasses] = useState<GuestPass[]>(initialData?.guestPasses ?? []);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialData?.vehicles ?? []);
  const docs = initialData?.docs ?? [];
  const [threads, setThreads] = useState<Thread[]>(initialData?.threads ?? []);
  const events = initialData?.events ?? [];
  const announcements = initialData?.announcements ?? [];
  const [household, setHousehold] = useState<HouseholdMember[]>(() =>
    residentName
      ? [{ id: "owner", name: residentName, role: "Owner of record", contact: residentEmail, locked: true }]
      : [],
  );
  const [pets, setPets] = useState<Pet[]>(initialData?.pets ?? []);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [notify, setNotify] = useState<NotifyPrefs>(initialData?.notify ?? DEFAULT_NOTIFY);
  const [autopay, setAutopay] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(initialData?.smsOptIn ?? false);
  const [gateCode, setGateCode] = useState("");

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setView = useCallback((v: string) => {
    setViewRaw(v);
    setNavOpen(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  const unreadCount = useMemo(() => threads.filter((t) => t.unread).length, [threads]);
  const openRequestCount = useMemo(() => requests.filter((r) => r.open).length, [requests]);

  const value: Store = {
    view, setView, isMobile: vw < MOBILE_BREAKPOINT, navOpen, setNavOpen,
    residentName, residentEmail, residentPhone, property,
    ledger, payments, requests, setRequests, arcApps, setArcApps, notices,
    reservations, setReservations, guestPasses, setGuestPasses,
    vehicles, setVehicles, docs, threads, setThreads, events, announcements,
    household, setHousehold, pets, setPets, leases, setLeases,
    notify, setNotify, autopay, setAutopay, smsOptIn, setSmsOptIn,
    gateCode, setGateCode,
    leasesAllowed: initialData?.leasesAllowed ?? true,
    gateCodesAllowed: initialData?.gateCodesAllowed ?? true,
    guestPassesAllowed: initialData?.guestPassesAllowed ?? true,
    stamp, uid, unreadCount, openRequestCount,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResident(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResident must be used inside <StoreProvider>");
  return v;
}

/** Search + status-filter for a list. Product rule: every list has both. */
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
