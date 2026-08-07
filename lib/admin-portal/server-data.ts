import "server-only";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AddressSuggestion,
  AuditEntry,
  BankAccount,
  CalEvent,
  Community,
  Doc,
  LedgerEntry,
  Owner,
  Payment,
  Staff,
  StaffRole,
  WorkOrder,
  WorkStatus,
} from "./types";

export type { AddressSuggestion };

/**
 * Reads the admin portal's collections from the database and maps them onto
 * the portal's domain types.
 *
 * Only the sections whose tables exist are loaded. The rest — violations,
 * architectural applications, bookings, vendors, legal cases, meetings,
 * directors and portfolios — have no schema yet, so they resolve to empty
 * arrays rather than fixtures: an empty section is honest, invented rows are
 * not. See PORTAL_SECTIONS_WITHOUT_TABLES below.
 */

export const PORTAL_SECTIONS_WITHOUT_TABLES = [
  "violations",
  "arc",
  "bookings",
  "vendors",
  "legal",
  "board",
  "portfolio",
] as const;

export type PortalData = {
  owners: Owner[];
  work: WorkOrder[];
  docs: Doc[];
  staff: Staff[];
  calendar: CalEvent[];
  payments: Payment[];
  communities: Community[];
  ledger: LedgerEntry[];
  bankAccounts: BankAccount[];
  audit: AuditEntry[];
  /** Known addresses from the lots roster, for add-form autofill. */
  addressBook: AddressSuggestion[];
  /** Dashboard tiles, computed from the same reads. */
  metrics: { label: string; value: string; note: string }[];
};

const EMPTY: PortalData = {
  owners: [],
  work: [],
  docs: [],
  staff: [],
  calendar: [],
  payments: [],
  communities: [],
  addressBook: [],
  ledger: [],
  bankAccounts: [],
  audit: [],
  metrics: [],
};

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

/** work_orders.status → the portal's four-state ladder. */
function toWorkStatus(s: string): WorkStatus {
  if (s === "completed" || s === "cancelled") return "Closed";
  if (s === "in_progress") return "In progress";
  if (s === "assigned" || s === "pending") return "Scheduled";
  return "New";
}

const STAFF_ROLES: StaffRole[] = [
  "Administrator",
  "Community manager",
  "Assistant manager",
  "Maintenance tech",
  "Inspector",
  "Accounting",
  "Front desk",
];

function toStaffRole(s: string | null): StaffRole {
  const hit = STAFF_ROLES.find((r) => r.toLowerCase() === (s ?? "").toLowerCase());
  return hit ?? "Front desk";
}

type LotRow = {
  id: string;
  community: string | null;
  lot_number: string | null;
  block: string | null;
  street_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  owner_profile_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  role: string | null;
  staff_role: string | null;
};

/* ─── Accounting: ledger, bank accounts, audit trail ───────────────── */

export type FinanceRow = {
  id: string;
  occurred_on: string | null;
  kind: string;
  category: string;
  description: string;
  amount_cents: number;
  source: string | null;
  bank_account_id: string | null;
  pending: boolean | null;
  created_at: string;
};

type BankAccountRow = {
  id: string;
  name: string;
  institution_name: string;
  mask: string;
  account_type: string;
  current_balance_cents: number | null;
  status: string;
  last_synced_at: string | null;
};

const usdExact = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Matches the client store's stamp() format: "Aug 7, 1:23 PM". */
function stampTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export function mapBankAccountRow(b: BankAccountRow): BankAccount {
  return {
    id: b.id,
    name: b.name,
    institution: b.institution_name,
    mask: b.mask,
    type: b.account_type,
    balance: b.current_balance_cents == null ? "—" : usdExact(b.current_balance_cents),
    balanceCents: b.current_balance_cents,
    lastSync: stampTime(b.last_synced_at),
    status: b.status === "disconnected" ? "disconnected" : "active",
  };
}

export function mapLedgerRow(
  r: FinanceRow,
  bankNames: Map<string, string>,
): LedgerEntry {
  const date = r.occurred_on ?? r.created_at.slice(0, 10);
  const kind = r.kind === "income" || r.kind === "transfer" ? r.kind : "expense";
  return {
    id: r.id,
    date,
    dateLabel: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    kind,
    category: r.category || "Other",
    description: r.description || "(no description)",
    amount: usdExact(r.amount_cents ?? 0),
    amountCents: r.amount_cents ?? 0,
    source: r.source === "bank" ? "bank" : "manual",
    account: (r.bank_account_id && bankNames.get(r.bank_account_id)) || "",
    pending: Boolean(r.pending),
  };
}

export function bankAccountLabel(b: BankAccount): string {
  const base = b.institution || b.name;
  return b.mask ? `${base} ····${b.mask}` : base;
}

/** Ledger + bank accounts together so imported rows carry their account label. */
export async function loadAccounting(
  db: SupabaseClient,
): Promise<{ ledger: LedgerEntry[]; bankAccounts: BankAccount[] }> {
  const [ftRes, baRes] = await Promise.all([
    db
      .from("finance_transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    db.from("bank_accounts").select("*").order("created_at", { ascending: true }),
  ]);
  const bankAccounts = ((baRes.data ?? []) as BankAccountRow[]).map(mapBankAccountRow);
  const names = new Map(bankAccounts.map((b) => [b.id, bankAccountLabel(b)]));
  const ledger = ((ftRes.data ?? []) as FinanceRow[]).map((r) => mapLedgerRow(r, names));
  return { ledger, bankAccounts };
}

export async function loadAuditTrail(db: SupabaseClient): Promise<AuditEntry[]> {
  const res = await db
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);
  return ((res.data ?? []) as {
    id: string;
    action: string;
    actor_name: string;
    created_at: string;
  }[]).map((a) => ({
    id: a.id,
    text: a.action,
    who: a.actor_name,
    time: stampTime(a.created_at),
  }));
}

export async function loadPortalData(): Promise<PortalData> {
  if (!isSupabaseConfigured()) return EMPTY;

  const db = createServiceClient();

  // Fetched together; a failure on any one table leaves that section empty
  // rather than failing the whole portal.
  const [lotsRes, profilesRes, woRes, docsRes, empRes, eventsRes, payRes, metricsRes, accounting, audit] =
    await Promise.all([
      db.from("lots").select("*").order("lot_number", { ascending: true }).limit(1000),
      db.from("profiles").select("*"),
      db.from("work_orders").select("*").order("created_at", { ascending: false }),
      db.from("documents").select("*").order("created_at", { ascending: false }),
      db.from("employees").select("*").order("name", { ascending: true }),
      db.from("community_events").select("*").order("starts_at", { ascending: true }),
      db.from("resident_payments").select("*").order("created_at", { ascending: false }).limit(50),
      db.from("hoa_dashboard_metrics").select("*").maybeSingle(),
      loadAccounting(db),
      loadAuditTrail(db),
    ]);

  const lots = (lotsRes.data ?? []) as LotRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const byProfile = new Map(profiles.map((p) => [p.id, p]));

  const owners: Owner[] = lots.map((l) => {
    const p = l.owner_profile_id ? byProfile.get(l.owner_profile_id) : undefined;
    const street = [l.street_number, l.street_name].filter(Boolean).join(" ");
    const cityLine = [l.city, [l.state, l.zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    return {
      id: l.id,
      name: p?.display_name?.trim() || "Unassigned lot",
      address: [street, cityLine].filter(Boolean).join(", ") || "No address recorded",
      contact: p?.phone?.trim() || "—",
      // Per-account balances are not tracked yet — no ledger per lot.
      balance: "—",
      status: p ? "Owner on file" : "No owner linked",
      scope: l.community ?? "all",
      flag: p ? "current" : "tenant",
      account: l.lot_number ? `Lot ${l.lot_number}` : l.id.slice(0, 8),
    };
  });

  const employeeNames = new Map(
    (empRes.data ?? []).map((e) => [e.id as string, (e.name as string) ?? "Unnamed"]),
  );

  const work: WorkOrder[] = (woRes.data ?? []).map((w) => ({
    id: w.id,
    ref: w.work_order_number ?? w.id.slice(0, 8),
    title: w.title ?? "Untitled",
    detail: w.location ?? w.description ?? "No detail recorded",
    assignee: w.assigned_to
      ? (employeeNames.get(w.assigned_to) ?? "Assigned")
      : "Unassigned",
    assigneeId: w.assigned_to ?? null,
    dueAt: w.due_at ?? null,
    priority: w.priority ?? null,
    status: toWorkStatus(w.status ?? "open"),
  }));

  const docs: Doc[] = (docsRes.data ?? []).map((d) => ({
    id: d.id,
    title: d.title ?? "Untitled",
    meta: [d.category_id ? "Categorised" : null, shortDate(d.created_at)]
      .filter(Boolean)
      .join(" · "),
    published: Boolean(d.is_published ?? d.published ?? false),
  }));

  const staff: Staff[] = (empRes.data ?? []).map((e) => ({
    id: e.id,
    name: e.name ?? "Unnamed",
    email: e.email ?? "—",
    role: toStaffRole(e.role),
    communities: [],
    active: Boolean(e.active),
    load: 0,
  }));

  // Staff accounts also exist as admin profiles; include any not already listed.
  for (const p of profiles) {
    if (p.role !== "admin") continue;
    if (staff.some((s) => s.name === (p.display_name ?? ""))) continue;
    staff.push({
      id: p.id,
      name: p.display_name?.trim() || "Administrator",
      email: "—",
      role: toStaffRole(p.staff_role),
      communities: [],
      active: true,
      load: 0,
    });
  }

  const calendar: CalEvent[] = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    date: (e.starts_at ?? e.created_at ?? "").slice(0, 10),
    title: e.title ?? "Untitled",
    detail: e.location ?? "",
    kind: "Community",
    community: "all",
  }));

  const payments: Payment[] = (payRes.data ?? []).map((p) => ({
    id: p.id,
    date: shortDate(p.paid_at ?? p.created_at),
    label: p.payer_name ?? p.unit_label ?? "Resident payment",
    amount: usd(p.amount_cents ?? 0),
  }));

  const m = metricsRes.data as
    | { outstanding_dues_cents?: number; overdue_accounts?: number; total_units?: number }
    | null;

  const openWork = work.filter((w) => w.status !== "Closed").length;
  const doors = m?.total_units ?? lots.length;
  const overdue = m?.overdue_accounts ?? 0;

  /* Communities are derived from the lots roster: there is no communities
     table yet, but scope filtering keys off these ids, so an empty list would
     hide every owner. Dues come from hoa_dashboard_metrics. */
  const byCommunity = new Map<string, LotRow[]>();
  for (const l of lots) {
    const key = l.community ?? "all";
    byCommunity.set(key, [...(byCommunity.get(key) ?? []), l]);
  }
  const feeCents = (m as { hoa_fee_amount_cents?: number } | null)?.hoa_fee_amount_cents;
  const communities: Community[] = [...byCommunity.entries()].map(([id, rows]) => {
    const first = rows[0];
    const place = [first?.city, first?.state].filter(Boolean).join(", ");
    return {
      id,
      name: id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      location: place || "No address recorded",
      doors: `${rows.length} lots`,
      dues: feeCents ? usd(feeCents) : "Not set",
      cadence: "",
      stage: "Active",
      portfolio: "",
    };
  });

  /* Autofill source: every address already on the roster, so staff type a
     street number and the rest of the address completes from real data
     instead of being retyped (and mistyped). */
  const addressBook: AddressSuggestion[] = lots.map((l) => {
    const streetNo = l.street_number ?? "";
    const street = l.street_name ?? "";
    const lotNo = l.lot_number ? `Lot ${l.lot_number}` : "";
    return {
      streetNo,
      street,
      unit: l.lot_number ?? "",
      city: l.city ?? "",
      state: l.state ?? "Texas",
      zip: l.zip ?? "",
      label: [[streetNo, street].filter(Boolean).join(" "), lotNo]
        .filter(Boolean)
        .join(" · "),
      taken: Boolean(l.owner_profile_id),
    };
  });

  const metrics = [
    {
      label: "Receivables",
      value: usd(m?.outstanding_dues_cents ?? 0),
      note: payments.length
        ? `${payments.length} payment${payments.length === 1 ? "" : "s"} recorded`
        : "No transactions yet",
    },
    {
      label: "Open work orders",
      value: String(openWork),
      note: openWork ? `${work.length} total` : "None open",
    },
    {
      label: "Lots on roster",
      value: String(lots.length),
      note: lots.length
        ? `${owners.filter((o) => o.flag === "current").length} with an owner linked`
        : "No lots registered",
    },
    {
      label: "Delinquency rate",
      value: doors > 0 && overdue > 0 ? `${((overdue / doors) * 100).toFixed(1)}%` : "—",
      note: doors > 0 && overdue > 0 ? `${overdue} of ${doors} doors` : "No accounts yet",
    },
  ];

  return {
    owners,
    work,
    docs,
    staff,
    calendar,
    payments,
    communities,
    addressBook,
    ledger: accounting.ledger,
    bankAccounts: accounting.bankAccounts,
    audit,
    metrics,
  };
}
