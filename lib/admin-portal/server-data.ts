import "server-only";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AddressSuggestion,
  ArcApp,
  Booking,
  Director,
  LegalCase,
  Meeting,
  Portfolio,
  Vendor,
  Violation,
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

/** Every portal domain now has a table; nothing is fixture-only. */
export const PORTAL_SECTIONS_WITHOUT_TABLES = [] as const;

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
  violations: Violation[];
  arcApps: ArcApp[];
  bookings: Booking[];
  vendors: Vendor[];
  legalCases: LegalCase[];
  meetings: Meeting[];
  directors: Director[];
  portfolios: Portfolio[];
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
  violations: [],
  arcApps: [],
  bookings: [],
  vendors: [],
  legalCases: [],
  meetings: [],
  directors: [],
  portfolios: [],
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
  "Owner",
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

/* ─── Staff: employees + portal sign-ins, linked by email ──────────── */

type StaffProfileRow = {
  id: string;
  role: string | null;
  staff_role: string | null;
  display_name: string | null;
  section_access: string[] | null;
  communities: string[] | null;
};

/**
 * One row per person. An employees record and a portal sign-in (auth user +
 * profile) are the same person when their emails match; either can also
 * stand alone — a tech who never logs in, or the original Administrator
 * account that predates the employees table.
 */
export async function loadStaff(db: SupabaseClient): Promise<Staff[]> {
  const [empRes, profRes] = await Promise.all([
    db.from("employees").select("*").order("name", { ascending: true }),
    db.from("profiles").select("*"),
  ]);

  // auth is the only place emails live for sign-in accounts.
  const emailByProfile = new Map<string, string>();
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
    for (const u of data?.users ?? []) {
      if (u.email) emailByProfile.set(u.id, u.email.toLowerCase());
    }
  } catch {
    // Without auth admin access, sign-in rows simply show no email.
  }

  const adminProfiles = ((profRes.data ?? []) as StaffProfileRow[]).filter(
    (p) => p.role === "admin",
  );
  const profileByEmail = new Map(
    adminProfiles
      .map((p) => [emailByProfile.get(p.id) ?? "", p] as const)
      .filter(([e]) => e),
  );

  const staff: Staff[] = ((empRes.data ?? []) as {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    active: boolean | null;
    communities: string[] | null;
  }[]).map((e) => {
    const linked = e.email ? profileByEmail.get(e.email.toLowerCase()) : undefined;
    return {
      id: e.id,
      name: linked?.display_name?.trim() || e.name || "Unnamed",
      email: e.email ?? "—",
      role: toStaffRole(linked?.staff_role ?? e.role),
      communities: linked?.communities ?? e.communities ?? [],
      active: Boolean(e.active),
      load: 0,
      employeeId: e.id,
      profileId: linked?.id ?? null,
      sections: linked?.section_access ?? null,
    };
  });

  const covered = new Set(staff.map((s) => s.profileId).filter(Boolean));
  for (const p of adminProfiles) {
    if (covered.has(p.id)) continue;
    staff.push({
      id: p.id,
      name: p.display_name?.trim() || "Administrator",
      email: emailByProfile.get(p.id) ?? "—",
      role: toStaffRole(p.staff_role),
      communities: p.communities ?? [],
      active: true,
      load: 0,
      employeeId: null,
      profileId: p.id,
      sections: p.section_access ?? null,
    });
  }

  return staff;
}

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
  lot_id: string | null;
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
  ownerNames: Map<string, string>,
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
    ownerId: r.lot_id,
    ownerName: (r.lot_id && ownerNames.get(r.lot_id)) || "",
  };
}

export function bankAccountLabel(b: BankAccount): string {
  const base = b.institution || b.name;
  return b.mask ? `${base} ····${b.mask}` : base;
}

/** "Maria Alvarez · Lot 12" or just "Lot 12" when no owner is on file. */
export async function loadOwnerNames(db: SupabaseClient): Promise<Map<string, string>> {
  const [lotsRes, profRes] = await Promise.all([
    db.from("lots").select("id, lot_number, owner_profile_id"),
    db.from("profiles").select("id, display_name"),
  ]);
  const nameByProfile = new Map(
    ((profRes.data ?? []) as { id: string; display_name: string | null }[]).map((p) => [
      p.id,
      p.display_name?.trim() ?? "",
    ]),
  );
  return new Map(
    ((lotsRes.data ?? []) as {
      id: string;
      lot_number: string | null;
      owner_profile_id: string | null;
    }[]).map((l) => {
      const owner = l.owner_profile_id ? nameByProfile.get(l.owner_profile_id) : "";
      const lot = l.lot_number ? `Lot ${l.lot_number}` : "";
      return [l.id, owner && lot ? `${owner} · ${lot}` : owner || lot || "Lot"];
    }),
  );
}

/** Ledger + bank accounts together so imported rows carry their account label. */
export async function loadAccounting(
  db: SupabaseClient,
): Promise<{ ledger: LedgerEntry[]; bankAccounts: BankAccount[] }> {
  const [ftRes, baRes, ownerNames] = await Promise.all([
    db
      .from("finance_transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    db.from("bank_accounts").select("*").order("created_at", { ascending: true }),
    loadOwnerNames(db),
  ]);
  const bankAccounts = ((baRes.data ?? []) as BankAccountRow[]).map(mapBankAccountRow);
  const names = new Map(bankAccounts.map((b) => [b.id, bankAccountLabel(b)]));
  const ledger = ((ftRes.data ?? []) as FinanceRow[]).map((r) =>
    mapLedgerRow(r, names, ownerNames),
  );
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


/* ─── The eight domains added in 20260807250000 ─────────────────────── */

const money = (cents: number | null | undefined) => usdExact(cents ?? 0);
const dateLabel = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";

async function loadRemainingDomains(db: SupabaseClient) {
  const [vRes, aRes, bRes, venRes, lRes, mRes, dRes, pRes, pcRes] = await Promise.all([
    db.from("violations").select("*").order("opened_on", { ascending: false }),
    db.from("arc_applications").select("*").order("submitted_on", { ascending: false }),
    db.from("bookings").select("*").order("starts_at", { ascending: true }),
    db.from("vendors").select("*").order("name", { ascending: true }),
    db.from("legal_cases").select("*").order("opened_on", { ascending: false }),
    db.from("meetings").select("*").order("starts_at", { ascending: false }),
    db.from("directors").select("*").order("name", { ascending: true }),
    db.from("portfolios").select("*").order("name", { ascending: true }),
    db.from("portfolio_communities").select("*"),
  ]);

  const violations: Violation[] = (vRes.data ?? []).map((v) => ({
    id: v.id,
    date: dateLabel(v.opened_on),
    title: v.violation_type ?? "Violation",
    detail: [v.address, v.source, v.cure_days ? `cure in ${v.cure_days} days` : null]
      .filter(Boolean)
      .join(" · "),
    status: v.status ?? "Reported",
    photos: [],
    mailings: [],
    notes: [],
    activity: [],
  }));

  const arcApps: ArcApp[] = (aRes.data ?? []).map((a) => ({
    id: a.id,
    ref: a.reference ?? a.id.slice(0, 8),
    title: a.title ?? "Application",
    owner: [a.owner_name, a.address].filter(Boolean).join(" · "),
    submitted: dateLabel(a.submitted_on),
    due: dateLabel(a.due_on),
    status: a.status ?? "Awaiting decision",
    decisionNote: a.decision_note ?? undefined,
    thread: [],
  }));

  const bookings: Booking[] = (bRes.data ?? []).map((b) => ({
    id: b.id,
    date: b.starts_at
      ? new Date(b.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    amenity: b.amenity ?? "Amenity",
    detail: [b.resident_name, b.guest_count ? `${b.guest_count} guests` : null, b.event_type]
      .filter(Boolean)
      .join(" · "),
    deposit: b.deposit_status ?? "Not required",
    status: b.status ?? "Requested",
  }));

  const vendors: Vendor[] = (venRes.data ?? []).map((v) => {
    const expires = v.insurance_expires_on as string | null;
    const current = expires ? new Date(expires).getTime() > Date.now() : false;
    return {
      id: v.id,
      name: v.name,
      trade: v.trade ?? "—",
      contract:
        v.contract_start && v.contract_end
          ? `${dateLabel(v.contract_start)} – ${dateLabel(v.contract_end)}`
          : "No term recorded",
      spend: money(v.ytd_spend_cents),
      insurance: expires ? `Expires ${dateLabel(expires)}` : "Not on file",
      ok: current,
    };
  });

  const legalCases: LegalCase[] = (lRes.data ?? []).map((c) => ({
    id: c.id,
    owner: c.owner_name,
    address: c.address ?? "—",
    balance: money(c.balance_cents),
    stage: c.stage ?? "Referred to counsel",
    counsel: c.counsel ?? "Not assigned",
  }));

  const meetings: Meeting[] = (mRes.data ?? []).map((m) => ({
    id: m.id,
    date: m.starts_at
      ? new Date(m.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    title: m.title,
    detail: [m.location, m.address].filter(Boolean).join(", ") || "No location set",
    status: m.status ?? "Scheduled",
    notice: m.notice_required_hours ? `${m.notice_required_hours}h notice` : "Notice not set",
    /* Statutory window: notice must have gone out far enough ahead. */
    noticeOk: Boolean(
      m.notice_sent_at &&
        m.starts_at &&
        new Date(m.starts_at).getTime() - new Date(m.notice_sent_at).getTime() >=
          (m.notice_required_hours ?? 0) * 3600_000,
    ),
    minutes: null,
  }));

  const directors: Director[] = (dRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    role: d.role ?? "Director",
    address: [
      [d.street_number, d.street_name].filter(Boolean).join(" "),
      d.city,
      [d.state, d.zip].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ") || "No address recorded",
    term:
      d.term_start && d.term_end
        ? `${dateLabel(d.term_start)} – ${dateLabel(d.term_end)}`
        : "Term not recorded",
  }));

  const members = new Map<string, string[]>();
  for (const pc of (pcRes.data ?? []) as { portfolio_id: string; community_id: string }[]) {
    members.set(pc.portfolio_id, [...(members.get(pc.portfolio_id) ?? []), pc.community_id]);
  }
  const portfolios: Portfolio[] = (pRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    members: members.get(p.id) ?? [],
  }));

  return { violations, arcApps, bookings, vendors, legalCases, meetings, directors, portfolios };
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

  const staff = await loadStaff(db);

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

  const rest = await loadRemainingDomains(db);

  return {
    owners,
    work,
    docs,
    staff,
    calendar,
    payments,
    communities,
    ...rest,
    addressBook,
    ledger: accounting.ledger,
    bankAccounts: accounting.bankAccounts,
    audit,
    metrics,
  };
}
