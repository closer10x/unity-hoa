import "server-only";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Announcement, ChatMsg, ComplianceNotice, DocItem, EventItem, GuestPass,
  LedgerLine, MaintReq, MaintStatus, NotifyPrefs, PaymentRecord, Pet, Property,
  ResArcApp, Reservation, Thread, Vehicle,
} from "./types";
import { DEFAULT_NOTIFY } from "./types";

/**
 * Reads the signed-in resident's records. Every query is scoped to the
 * resident — their profile id, their lot, their email — and read with the
 * service client server-side, so RLS policies written for the admin surface
 * don't silently blank a resident's own data.
 *
 * Missing tables resolve to empty collections: an empty section is honest,
 * invented rows are not.
 */

export type ResidentData = {
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
  /** Conversations with the office, incoming replies included. */
  threads: Thread[];
  /** Gate passes still live, and the vehicles on file. */
  guestPasses: GuestPass[];
  vehicles: Vehicle[];
  /** Pets registered to this household. */
  pets: Pet[];
  /** Some communities prohibit leasing; hides lease registration. */
  leasesAllowed: boolean;
  /** Communities without gates hide the gate-code card. */
  gateCodesAllowed: boolean;
  /** Communities that don't issue guest passes hide that card. */
  guestPassesAllowed: boolean;
};

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

const EMPTY: ResidentData = {
  property: NO_PROPERTY,
  ledger: [],
  payments: [],
  requests: [],
  arcApps: [],
  notices: [],
  reservations: [],
  docs: [],
  events: [],
  announcements: [],
  notify: DEFAULT_NOTIFY,
  smsOptIn: false,
  threads: [],
  guestPasses: [],
  vehicles: [],
  pets: [],
  leasesAllowed: true,
  gateCodesAllowed: true,
  guestPassesAllowed: true,
};

const usdExact = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * A date-only string is a calendar day, not an instant.
 *
 * `new Date("2026-08-12")` is midnight UTC, which is the 11th anywhere west
 * of Greenwich — so a due date rendered this way reads a day early for every
 * resident in Texas. Anchoring at noon UTC puts it far enough from either
 * midnight that no timezone can move it. Timestamps that already carry a
 * time are left alone.
 */
const shortDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

const longDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

const kb = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** work_orders.status → the resident-facing ladder. */
function toMaintStatus(s: string): MaintStatus {
  if (s === "completed" || s === "cancelled") return "Closed";
  if (s === "in_progress") return "In progress";
  if (s === "assigned" || s === "pending") return "Scheduled";
  return "Received";
}

/** Community slug → display name (the lots roster stores slugs). */
function communityName(slug: string | null): string {
  if (!slug) return "Unity Grid";
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const CADENCE: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

/** The due-date boundaries around today for a frequency + day-of-month rule. */
function dueBoundaries(
  frequency: string | null,
  dueDay: number | null,
  dueMonth: number | null = null,
): { next: Date | null; last: Date | null } {
  if (!frequency || !CADENCE[frequency]) return { next: null, last: null };
  const day = dueDay && dueDay >= 1 && dueDay <= 28 ? dueDay : 1;
  // Annual billing anchors to the configured due month (defaults to January).
  const anchor = dueMonth && dueMonth >= 1 && dueMonth <= 12 ? dueMonth - 1 : 0;
  const now = new Date();
  const months =
    frequency === "monthly"
      ? Array.from({ length: 26 }, (_, i) => i - 13)
      : frequency === "quarterly"
        ? [-12, -9, -6, -3, 0, 3, 6, 9, 12].map((m) => m + anchor)
        : frequency === "annual"
          ? [anchor - 12, anchor, anchor + 12]
          : [];
  let next: Date | null = null;
  let last: Date | null = null;
  for (const m of months) {
    const d = new Date(now.getFullYear(), m, day);
    if (d >= now) {
      if (!next) next = d;
    } else {
      last = d;
    }
  }
  return { next, last };
}

async function safe<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    // Missing table, missing column, network — the section simply loads empty.
    return fallback;
  }
}

export async function loadResidentData(user: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<ResidentData> {
  if (!isSupabaseConfigured()) return EMPTY;

  const db = createServiceClient();
  const name = user.displayName?.trim() ?? "";
  const email = user.email?.trim() ?? "";

  /* ─── Property: the resident's lot + billing configuration ────────── */

  const lot = await safe(null as null | {
    id: string;
    community: string | null;
    lot_number: string | null;
    street_number: string | null;
    street_name: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  }, async () => {
    const { data, error } = await db
      .from("lots")
      .select("id, community, lot_number, street_number, street_name, city, state, zip")
      .eq("owner_profile_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

  /* This household's issued, uncollected invoices.
     Invoices sit in front of the ledger — issuing bills the household and
     writes nothing, only collecting posts an entry — so a resident's balance
     lives on their invoices. Reading the ledger shows them nothing owed
     while an invoice is sitting in their name. */
  const openInvoices = await safe([] as {
    total_cents: number; due_on: string | null; invoice_number: string; issued_on: string;
  }[], async () => {
    if (!lot) return [];
    const { data, error } = await db
      .from("invoices")
      .select("invoice_number, total_cents, due_on, issued_on")
      .eq("lot_id", lot.id)
      .eq("status", "sent")
      .order("due_on", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

  const owedCents = openInvoices.reduce((t, i) => t + Number(i.total_cents ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const invoicesOverdue = openInvoices.some((i) => i.due_on && i.due_on < today);
  /* Noon UTC, not midnight: a date-only string parsed as midnight lands on
     the previous day for anyone west of Greenwich, and a due date that reads
     a day early is worse than none. */
  const nextInvoiceDue = openInvoices[0]?.due_on
    ? longDate(new Date(`${openInvoices[0].due_on}T12:00:00Z`))
    : "";

  const billing = await safe(null as null | {
    hoa_fee_amount_cents: number | null;
    hoa_due_day_of_month: number | null;
    hoa_due_month: number | null;
    dues_frequency: string | null;
  }, async () => {
    const { data, error } = await db
      .from("hoa_dashboard_metrics")
      .select("hoa_fee_amount_cents, hoa_due_day_of_month, hoa_due_month, dues_frequency")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

  const streetLine = lot
    ? `${lot.street_number ?? ""} ${lot.street_name ?? ""}`.trim()
    : "";

  const boundaries = dueBoundaries(
    billing?.dues_frequency ?? null,
    billing?.hoa_due_day_of_month ?? null,
    billing?.hoa_due_month ?? null,
  );

  const property: Property = lot
    ? {
        id: lot.id,
        name: communityName(lot.community),
        address:
          streetLine + (lot.lot_number ? ` · Lot ${lot.lot_number}` : ""),
        mailingAddress: [
          streetLine,
          lot.city,
          [lot.state, lot.zip].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(", "),
        account: lot.lot_number ? `Lot ${lot.lot_number}` : "",
        /* What this household actually owes, not what the community's fee
           happens to be. It read the schedule's standard amount, so a
           resident with a $375 certificate invoice was shown the quarterly
           HOA fee — or nothing at all — and never the bill they had.
           Filled from their own invoices below; the fee is the fallback for
           a household with none, which is still the useful number to see. */
        balance:
          owedCents > 0
            ? usdExact(owedCents)
            : billing?.hoa_fee_amount_cents != null
              ? usdExact(billing.hoa_fee_amount_cents)
              : "",
        balanceCents: owedCents > 0 ? owedCents : billing?.hoa_fee_amount_cents ?? null,
        /* Their own invoice's due date beats the community's next boundary —
           that is the date they are actually being held to. */
        due: nextInvoiceDue || (boundaries.next ? longDate(boundaries.next) : ""),
        overdue: invoicesOverdue,
        cadence: billing?.dues_frequency
          ? CADENCE[billing.dues_frequency] ?? ""
          : "",
        alert: "",
      }
    : NO_PROPERTY;

  /* ─── Ledger: association transactions linked to this lot ─────────── */

  const ledger = await safe([] as LedgerLine[], async () => {
    if (!lot) return [];
    const { data, error } = await db
      .from("finance_transactions")
      .select("id, occurred_on, kind, description, amount_cents")
      .eq("lot_id", lot.id)
      .order("occurred_on", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      date: shortDate(r.occurred_on as string),
      label: (r.description as string) ?? "",
      amount:
        r.kind === "income"
          ? `−${usdExact(Number(r.amount_cents))}`
          : usdExact(Number(r.amount_cents)),
      // A running balance needs every line in order; these are the collected
      // rows only, so the column stays honest rather than guessing.
      balance: "—",
      credit: r.kind === "income",
    }));
  });

  /* An issued invoice is a charge the household can see coming. Without it
     their activity list is empty until somebody collects, which reads as
     "you owe nothing" at exactly the moment they do. Merged newest-first
     with the collected rows above. */
  const ledgerWithInvoices: LedgerLine[] = [
    ...openInvoices.map((i) => ({
      id: `inv-${i.invoice_number}`,
      date: shortDate(i.issued_on),
      label: `${i.invoice_number} issued${i.due_on ? ` · due ${shortDate(i.due_on)}` : ""}`,
      amount: usdExact(Number(i.total_cents ?? 0)),
      balance: "—",
      credit: false,
    })),
    ...ledger,
  ];

  /* ─── Late? The last due date passed with no payment on the lot ────── */

  if (lot && boundaries.last && ledger.length > 0) {
    const overdue = await safe(false, async () => {
      const { data, error } = await db
        .from("finance_transactions")
        .select("occurred_on")
        .eq("lot_id", lot.id)
        .eq("kind", "income")
        .gte("occurred_on", boundaries.last!.toISOString().slice(0, 10))
        .limit(1);
      if (error) throw error;
      return (data ?? []).length === 0;
    });
    if (overdue) {
      property.overdue = true;
      property.due = longDate(boundaries.last);
    }
  }

  /* ─── The resident's own portal payments ──────────────────────────── */

  const payments = await safe([] as PaymentRecord[], async () => {
    const { data, error } = await db
      .from("resident_payments")
      .select("id, amount_cents, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      date: shortDate(r.created_at as string),
      label: "Portal payment",
      amount: usdExact(Number(r.amount_cents)),
      status: (r.status as string) ?? "pending",
    }));
  });

  /* ─── Maintenance requests reported by this resident ──────────────── */

  const requests = await safe([] as MaintReq[], async () => {
    if (!email) return [];
    let rows: Record<string, unknown>[] | null = null;
    const first = await db
      .from("work_orders")
      .select("id, work_order_number, title, location, status, created_at, photo_path")
      .ilike("reported_by_email", email)
      .order("created_at", { ascending: false })
      .limit(40);
    if (first.error) {
      const retry = await db
        .from("work_orders")
        .select("id, work_order_number, title, location, status, created_at")
        .ilike("reported_by_email", email)
        .order("created_at", { ascending: false })
        .limit(40);
      if (retry.error) throw retry.error;
      rows = (retry.data ?? []) as Record<string, unknown>[];
    } else {
      rows = (first.data ?? []) as Record<string, unknown>[];
    }
    return rows.map((r) => {
      const status = toMaintStatus((r.status as string) ?? "open");
      const photoPath = typeof r.photo_path === "string" && r.photo_path ? r.photo_path : null;
      return {
        id: r.id as string,
        ref: (r.work_order_number as string) ?? "",
        title: (r.title as string) ?? "",
        detail: [
          r.location ? `At ${r.location}` : "",
          `Reported ${shortDate(r.created_at as string)}`,
        ]
          .filter(Boolean)
          .join(" · "),
        status,
        open: status !== "Closed",
        photoPath,
      };
    });
  });

  /* ─── Architectural applications ──────────────────────────────────── */

  const arcApps = await safe([] as ResArcApp[], async () => {
    if (!name && !streetLine) return [];
    let q = db
      .from("arc_applications")
      .select("id, reference, title, submitted_on, due_on, status, decision_note")
      .order("submitted_on", { ascending: false })
      .limit(40);
    if (name && streetLine) {
      q = q.or(`owner_name.ilike.%${name}%,address.ilike.%${streetLine}%`);
    } else if (name) {
      q = q.ilike("owner_name", `%${name}%`);
    } else {
      q = q.ilike("address", `%${streetLine}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const status = (r.status as string) ?? "Awaiting decision";
      const ok = /approved|completed/i.test(status);
      return {
        id: r.id as string,
        ref: (r.reference as string) ?? "",
        title: (r.title as string) ?? "",
        detail: [
          `Submitted ${shortDate(r.submitted_on as string)}`,
          r.due_on ? `answer due by ${shortDate(r.due_on as string)}` : "",
          (r.decision_note as string) ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
        status,
        ok,
      };
    });
  });

  /* ─── Compliance: violations against this property ────────────────── */

  const notices = await safe([] as ComplianceNotice[], async () => {
    if (!streetLine) return [];
    const { data, error } = await db
      .from("violations")
      .select("id, violation_type, opened_on, status, cure_days, notes")
      .ilike("address", `%${streetLine}%`)
      .order("opened_on", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const status = (r.status as string) ?? "Reported";
      const ok = /resolved|clear|closed/i.test(status);
      const cure = r.cure_days ? `${r.cure_days}-day cure period` : "";
      return {
        id: r.id as string,
        date: shortDate(r.opened_on as string),
        title: (r.violation_type as string) ?? "",
        detail: [cure, (r.notes as string) ?? ""].filter(Boolean).join(" · "),
        status,
        ok,
      };
    });
  });

  /* ─── Amenity reservations in this resident's name ────────────────── */

  const reservations = await safe([] as Reservation[], async () => {
    if (!name) return [];
    const { data, error } = await db
      .from("bookings")
      .select("id, amenity, starts_at, ends_at, event_type, deposit_status, status")
      .ilike("resident_name", `%${name}%`)
      .order("starts_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const t = (iso: string | null) =>
        iso
          ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "";
      return {
        id: r.id as string,
        date: shortDate(r.starts_at as string),
        label: [
          (r.amenity as string) ?? "",
          [t(r.starts_at as string), t(r.ends_at as string | null)].filter(Boolean).join("–"),
          (r.event_type as string) ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
        status: (r.status as string) ?? "Requested",
        deposit: (r.deposit_status as string) ?? "",
      };
    });
  });

  /* ─── Published documents residents may read ──────────────────────── */

  const docs = await safe([] as DocItem[], async () => {
    const { data, error } = await db
      .from("documents")
      .select(
        "id, title, file_type, file_size_bytes, version, effective_date, access_level, is_archived, document_categories(name)",
      )
      .eq("is_archived", false)
      .eq("assistant_only", false)
      .in("access_level", ["public", "resident"])
      .order("uploaded_at", { ascending: false })
      .limit(120);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const cat = (r.document_categories as { name?: string } | null)?.name ?? "General";
      const type = ((r.file_type as string) ?? "").includes("pdf") ? "PDF" : "File";
      return {
        id: r.id as string,
        title: (r.title as string) ?? "",
        meta: [
          type,
          kb(r.file_size_bytes as number),
          (r.version as string) ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
        category: cat,
      };
    });
  });

  /* ─── Published meeting minutes (approved by the board) ───────────── */

  const minutesDocs = await safe([] as DocItem[], async () => {
    const { data, error } = await db
      .from("meeting_minutes")
      .select("meeting_id, updated_at, meetings(title, starts_at)")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const meeting = r.meetings as { title?: string; starts_at?: string } | null;
      return {
        id: r.meeting_id as string,
        title: `Minutes — ${meeting?.title ?? "Board meeting"}`,
        meta: [
          meeting?.starts_at
            ? new Date(meeting.starts_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "",
          "Approved by the board",
        ]
          .filter(Boolean)
          .join(" · "),
        category: "Meeting minutes",
      };
    });
  });

  /* ─── Community events & announcements ────────────────────────────── */

  const events = await safe([] as EventItem[], async () => {
    const { data, error } = await db
      .from("community_events")
      .select("id, title, description, starts_at, location")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(12);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      date: shortDate(r.starts_at as string),
      title: (r.title as string) ?? "",
      detail: [
        new Date(r.starts_at as string).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        (r.location as string) ?? "",
        (r.description as string) ?? "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  });

  const announcements = await safe([] as Announcement[], async () => {
    const { data, error } = await db
      .from("announcements")
      .select("id, title, body, image_url, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      meta: shortDate(r.published_at as string),
      title: (r.title as string) ?? "",
      body: (r.body as string) ?? "",
      imageUrl: (r.image_url as string | null) ?? null,
    }));
  });

  /* ─── Notification preferences ────────────────────────────────────── */

  const prefs = await safe(
    { notify: DEFAULT_NOTIFY, smsOptIn: false },
    async () => {
      const { data, error } = await db
        .from("notification_preferences")
        .select("announcements, maintenance_updates, billing_reminders")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { notify: DEFAULT_NOTIFY, smsOptIn: false };
      // The stored schema is three booleans; map them onto the richer matrix
      // with email as the carrier until per-channel storage lands.
      const on = (v: boolean) => ({ email: v, text: false });
      return {
        notify: {
          billing: on(Boolean(data.billing_reminders)),
          maintenance: on(Boolean(data.maintenance_updates)),
          arc: on(true),
          compliance: on(true),
          community: on(Boolean(data.announcements)),
          meetings: { email: false, text: false },
        },
        smsOptIn: false,
      };
    },
  );

  /* ─── Conversations with the office ────────────────────────────────── */

  const threads = await safe([] as Thread[], async () => {
    const [tRes, mRes] = await Promise.all([
      db
        .from("resident_threads")
        .select("*")
        .eq("user_id", user.id)
        .order("last_activity_at", { ascending: false })
        .limit(100),
      db
        .from("resident_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1000),
    ]);
    if (tRes.error) throw tRes.error;
    if (mRes.error) throw mRes.error;

    const stampTime = (iso: string) => {
      const d = new Date(iso);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let h = d.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
    };

    const byThread = new Map<string, ChatMsg[]>();
    for (const m of (mRes.data ?? []) as {
      id: string; thread_id: string; author_name: string | null;
      is_resident: boolean; body: string | null; created_at: string;
      attachment_path: string | null;
    }[]) {
      const list = byThread.get(m.thread_id) ?? [];
      list.push({
        id: m.id,
        from: m.is_resident ? "You" : (m.author_name ?? "Management office"),
        mine: m.is_resident,
        time: stampTime(m.created_at),
        body: m.body ?? "",
        attachment: m.attachment_path ?? undefined,
      });
      byThread.set(m.thread_id, list);
    }

    return ((tRes.data ?? []) as {
      id: string; party: string | null; subject: string | null;
      status: string | null; resident_unread: boolean;
      last_activity_at: string | null; created_at: string;
    }[]).map((t) => ({
      id: t.id,
      party: t.party ?? "Management office",
      subject: t.subject ?? "(no subject)",
      date: shortDate(t.last_activity_at ?? t.created_at),
      unread: Boolean(t.resident_unread),
      status: (t.status === "Closed" ? "Closed" : "Open") as Thread["status"],
      messages: byThread.get(t.id) ?? [],
    }));
  });

  /* ─── Community policy: is leasing allowed here? ───────────────────── */

  const policy = await safe(
    { leasesAllowed: true, gateCodesAllowed: true, guestPassesAllowed: true },
    async () => {
      if (!lot?.community) {
        return { leasesAllowed: true, gateCodesAllowed: true, guestPassesAllowed: true };
      }
      const { data, error } = await db
        .from("community_policies")
        .select("allow_leases, allow_gate_codes, allow_guest_passes")
        .eq("community", lot.community)
        .maybeSingle();
      if (error) throw error;
      // No policy row means the defaults: everything is offered.
      return {
        leasesAllowed: data ? Boolean(data.allow_leases) : true,
        gateCodesAllowed: data ? Boolean(data.allow_gate_codes) : true,
        guestPassesAllowed: data ? Boolean(data.allow_guest_passes) : true,
      };
    },
  );

  /* ─── Gate access: passes still live, and vehicles on file ────────── */

  const guestPasses = await safe([] as GuestPass[], async () => {
    const { data, error } = await db
      .from("guest_passes")
      .select("id, guest_name, dates, plate, code")
      // A revoked pass is history, not access — the gate would turn it away.
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: (r.guest_name as string) ?? "",
      detail: [r.dates as string, r.plate as string | null].filter(Boolean).join(" · "),
      code: (r.code as string) ?? "",
    }));
  });

  const vehicles = await safe([] as Vehicle[], async () => {
    let rows: Record<string, unknown>[] | null = null;
    const first = await db
      .from("resident_vehicles")
      .select("id, description, plate, tag_status, photo_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (first.error) {
      const retry = await db
        .from("resident_vehicles")
        .select("id, description, plate, tag_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (retry.error) throw retry.error;
      rows = (retry.data ?? []) as Record<string, unknown>[];
    } else {
      rows = (first.data ?? []) as Record<string, unknown>[];
    }
    return rows.map((r) => ({
      id: r.id as string,
      label: [r.description as string, r.plate as string].filter(Boolean).join(" · "),
      tag: (r.tag_status as string) === "issued" ? "Issued" : "Pending",
      photoPath: typeof r.photo_path === "string" && r.photo_path ? r.photo_path : null,
    }));
  });

  const pets = await safe([] as Pet[], async () => {
    const { data, error } = await db
      .from("resident_pets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const detail = (typeof r.detail === "string" && r.detail.trim())
        ? r.detail.trim()
        : [
            r.pet_type as string | null,
            r.breed as string | null,
            r.weight_lb ? `${r.weight_lb} lb` : "",
            r.color as string | null,
            r.rabies_tag ? `rabies tag ${r.rabies_tag}` : "",
            r.vet ? `vet: ${r.vet}` : "",
          ].filter(Boolean).join(" · ");
      return {
        id: r.id as string,
        name: (r.name as string) ?? "",
        detail,
        status: (r.status as string) || "Registered",
        ok: r.ok !== false,
        photoPath: typeof r.photo_path === "string" && r.photo_path ? r.photo_path : null,
      };
    });
  });

  return {
    property,
    ledger: ledgerWithInvoices,
    payments,
    requests,
    arcApps,
    notices,
    reservations,
    docs: [...docs, ...minutesDocs],
    events,
    announcements,
    notify: prefs.notify,
    smsOptIn: prefs.smsOptIn,
    threads,
    guestPasses,
    vehicles,
    pets,
    ...policy,
  };
}

// Referenced so the import stays typed even though only types flow out today.
export type { SupabaseClient };
