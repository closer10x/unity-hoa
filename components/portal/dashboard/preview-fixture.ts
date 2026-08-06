import type {
  CalendarItem,
  CollectionRow,
  Kpi,
  QueueItem,
} from "@/components/portal/dashboard/admin-dashboard";

/**
 * Fixture for the DEV-ONLY /preview/admin route, so the dashboard can be
 * reviewed at full density without a Supabase connection. Never imported by
 * the real admin page, which reads live aggregates.
 */
export const PREVIEW_DASHBOARD: {
  summary: string;
  kpis: Kpi[];
  queue: QueueItem[];
  collections: CollectionRow[];
  calendar: CalendarItem[];
} = {
  summary: "3 communities · 750 doors · 61 accounts carrying a balance",
  kpis: [
    {
      label: "Receivables",
      value: "$184,220",
      note: "Across 3 communities · 61 accounts with a balance",
    },
    {
      label: "Open work orders",
      value: "23",
      note: "6 assigned to vendors · 4 past their target date",
    },
    {
      label: "Pending architectural",
      value: "8",
      note: "2 inside the last week of the 30-day clock",
    },
    {
      label: "Delinquency rate",
      value: "6.4%",
      note: "Down from 7.1% last quarter",
    },
  ],
  queue: [
    {
      kind: "Architectural",
      title: "ARC-2291 — rear patio extension",
      detail: "Statutory decision due in 4 days · 7880 Morrison Road",
      age: "26d open",
      href: "/preview/admin",
    },
    {
      kind: "Legal",
      title: "Lien authorization — 204 Lakebend Drive",
      detail: "Board vote recorded Aug 2 · awaiting counsel referral",
      age: "9d open",
      href: "/preview/admin",
    },
    {
      kind: "Work order",
      title: "WO-4417 — north gate operator failure",
      detail: "Vendor assigned, no schedule confirmed",
      age: "5d open",
      href: "/preview/admin",
    },
    {
      kind: "Accounting",
      title: "3 payments unapplied",
      detail: "Received by check, no account matched",
      age: "3d open",
      href: "/preview/admin",
    },
    {
      kind: "Violations",
      title: "V-1180 — cure period expired",
      detail: "Courtesy notice sent Jul 18 · no response",
      age: "2d open",
      href: "/preview/admin",
    },
  ],
  collections: [
    { name: "Sofi Lakes", rate: "94.2%", pct: 94, detail: "$12,480 outstanding · 18 accounts" },
    { name: "Morrison Crossing", rate: "91.8%", pct: 92, detail: "$9,140 outstanding · 14 accounts" },
    { name: "Lakebend", rate: "88.1%", pct: 88, detail: "$6,220 outstanding · 29 accounts" },
  ],
  calendar: [
    { date: "Sep 9", title: "Sofi Lakes board meeting", detail: "6:30 PM · agenda published" },
    { date: "Sep 12", title: "Inspection route — Morrison Crossing", detail: "Assigned to R. Alvarado" },
    { date: "Sep 15", title: "Insurance renewal — Lakebend", detail: "Certificate expires" },
    { date: "Sep 22", title: "Annual meeting notice due", detail: "10-day statutory window opens" },
  ],
};
