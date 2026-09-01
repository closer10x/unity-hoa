"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";

import { loadInvoices } from "./invoice-actions";
import type {
  AuditEntry, FineNotice, FineNoticeItem, FineNoticeStatus, Invoice, Mailing,
} from "./types";

/**
 * Fine notices: the letter, and the bill behind it.
 *
 * Drafting writes the notice and nothing else — a draft has not been read by
 * anyone and owes nobody anything. Recording it as sent is the moment it
 * becomes real: the invoice is raised and issued against the household, the
 * mailing lands on the violation's case file, and the violation moves up the
 * notice ladder. That ordering matters. A fine that was billed before the
 * letter went out is a fine the recipient first hears about from a balance.
 *
 * The notice never carries a paid flag. What is owed lives on the invoice, in
 * front of the ledger, exactly as every other charge does.
 */

type Fail = { ok: false; error: string };
type Ok<T> = { ok: true } & T;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Fines are levied under the deed restrictions, so they are the association's
   income. Held as the key rather than looked up, for the same reason the
   column is: re-pointing something at the other company next year must not
   restate last year's books. */
const ASSOCIATION_ENTITY = "sofilakes";

const FINE_STATUSES: FineNoticeStatus[] = [
  "Drafted", "Sent", "Cured", "Escalated", "Waived",
];

const DELIVERY_METHODS = [
  "Certified mail", "Certified mail + return receipt", "First-class mail",
  "Email", "Email and certified mail", "Hand delivered", "Posted on the lot",
];

const NOTICE_LEVELS = ["1st notice", "2nd notice", "3rd notice", "Final notice"];

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const today = () => new Date().toISOString().slice(0, 10);

const dateLabel = (d: string | null) =>
  d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
      })
    : "—";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function stampTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can issue fines.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  action: string,
  actorName: string,
  actorId: string | null,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action, actor_name: actorName, actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

type NoticeRow = {
  id: string;
  reference: string;
  violation_id: string | null;
  lot_id: string | null;
  invoice_id: string | null;
  community: string | null;
  property_address: string;
  lot_number: string | null;
  block: string | null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_address: string | null;
  delivery_method: string | null;
  notice_level: string | null;
  notice_date: string;
  inspection_date: string | null;
  inspector: string | null;
  cure_date: string | null;
  observed: string | null;
  governing_section: string | null;
  cleanup_frequency: string | null;
  total_cents: number | null;
  continuing_cents: number | null;
  continuing_unit: string | null;
  admin_fee_pct: number | string | null;
  pay_days: number | null;
  dispute_days: number | null;
  remit_to: string | null;
  pay_link: string | null;
  copies_to: string | null;
  entity_key: string | null;
  status: string;
  sent_on: string | null;
  cured_on: string | null;
  waived_reason: string | null;
  created_by_name: string | null;
};

type ItemRow = {
  id: string;
  fine_notice_id: string;
  fee_id: string | null;
  observed_on: string | null;
  description: string;
  notice_level: string | null;
  amount_cents: number | null;
};

function toNotice(r: NoticeRow, items: FineNoticeItem[]): FineNotice {
  return {
    id: r.id,
    reference: r.reference,
    violationId: r.violation_id,
    lotId: r.lot_id,
    invoiceId: r.invoice_id,
    community: r.community ?? "",
    address: r.property_address,
    lotNumber: r.lot_number ?? "",
    block: r.block ?? "",
    recipient: r.recipient_name,
    recipientEmail: r.recipient_email ?? "",
    recipientAddress: r.recipient_address ?? "",
    delivery: r.delivery_method ?? "Certified mail",
    level: r.notice_level ?? "1st notice",
    noticeDate: r.notice_date,
    noticeDateLabel: dateLabel(r.notice_date),
    inspectionDate: r.inspection_date ?? "",
    inspector: r.inspector ?? "",
    cureDate: r.cure_date ?? "",
    observed: r.observed ?? "",
    section: r.governing_section ?? "",
    frequency: r.cleanup_frequency ?? "",
    total: usd(r.total_cents ?? 0),
    totalCents: r.total_cents ?? 0,
    continuingCents: r.continuing_cents ?? null,
    continuingUnit: r.continuing_unit ?? "",
    adminFeePct: r.admin_fee_pct == null ? null : Number(r.admin_fee_pct),
    payDays: r.pay_days ?? null,
    disputeDays: r.dispute_days ?? null,
    remitTo: r.remit_to ?? "",
    payLink: r.pay_link ?? "",
    copiesTo: r.copies_to ?? "",
    entity: r.entity_key ?? null,
    status: (FINE_STATUSES as string[]).includes(r.status)
      ? (r.status as FineNoticeStatus)
      : "Drafted",
    sentOn: r.sent_on ? dateLabel(r.sent_on) : null,
    createdBy: r.created_by_name?.trim() || "the office",
    items,
  };
}

/** Every fine notice with its charged violations, newest first. */
export async function loadFineNotices(
  db: ReturnType<typeof requireServiceSupabase>,
): Promise<FineNotice[]> {
  const [nRes, iRes] = await Promise.all([
    db.from("fine_notices").select("*").order("notice_date", { ascending: false }).limit(500),
    db.from("fine_notice_items").select("*").order("sort", { ascending: true }).limit(4000),
  ]);

  const itemsByNotice = new Map<string, FineNoticeItem[]>();
  for (const i of (iRes.data ?? []) as ItemRow[]) {
    const list = itemsByNotice.get(i.fine_notice_id) ?? [];
    list.push({
      id: i.id,
      observedOn: i.observed_on ?? "",
      description: i.description,
      level: i.notice_level ?? "",
      amount: usd(i.amount_cents ?? 0),
      amountCents: i.amount_cents ?? 0,
    });
    itemsByNotice.set(i.fine_notice_id, list);
  }

  return ((nRes.data ?? []) as NoticeRow[]).map((r) =>
    toNotice(r, itemsByNotice.get(r.id) ?? []),
  );
}

async function reloadNotices(db: ReturnType<typeof requireServiceSupabase>) {
  return loadFineNotices(db);
}

/**
 * Draft a notice. Nothing is billed and nothing is mailed — this is the
 * letter, saved, so it can be read back exactly as it will print.
 */
export async function createFineNotice(input: {
  violationId: string;
  lotId: string;
  community: string;
  address: string;
  lotNumber: string;
  block: string;
  recipient: string;
  recipientEmail: string;
  recipientAddress: string;
  delivery: string;
  level: string;
  noticeDate: string;
  inspectionDate: string;
  inspector: string;
  cureDate: string;
  observed: string;
  section: string;
  frequency: string;
  continuing: string;
  continuingUnit: string;
  adminFeePct: string;
  payDays: string;
  disputeDays: string;
  remitTo: string;
  payLink: string;
  copiesTo: string;
  items: { description: string; observedOn: string; level: string; amount: string }[];
}): Promise<Ok<{ notices: FineNotice[]; notice: FineNotice }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const address = input.address.trim();
    const recipient = input.recipient.trim();
    if (!address) return { ok: false, error: "Pick the home this notice is about." };
    if (!recipient) return { ok: false, error: "Say who the notice is addressed to." };
    if (!ISO_DATE_RE.test(input.noticeDate)) {
      return { ok: false, error: "Pick the date on the letter." };
    }
    if (!DELIVERY_METHODS.includes(input.delivery)) {
      return { ok: false, error: "Pick how the notice is being delivered." };
    }
    if (!NOTICE_LEVELS.includes(input.level)) {
      return { ok: false, error: "Pick which notice in the ladder this is." };
    }

    const items = input.items
      .map((i, idx) => ({
        description: i.description.trim(),
        observedOn: ISO_DATE_RE.test(i.observedOn) ? i.observedOn : null,
        level: i.level.trim() || input.level,
        cents: parseDollarsToCents(i.amount),
        sort: (idx + 1) * 10,
      }))
      .filter((i) => i.description || i.cents != null);

    if (items.length === 0) {
      return { ok: false, error: "Add at least one violation to the notice." };
    }
    for (const i of items) {
      if (!i.description) return { ok: false, error: "Every violation on the notice needs a description." };
      if (i.cents == null || i.cents < 0) {
        return { ok: false, error: `Enter the fine for “${i.description}”.` };
      }
    }

    /* The letter quotes a cure date, and the letter is the thing that has to
       hold up. A notice with no date to correct by is not a notice. */
    if (!ISO_DATE_RE.test(input.cureDate)) {
      return { ok: false, error: "Pick the date the violation has to be corrected by." };
    }
    if (input.cureDate < input.noticeDate) {
      return { ok: false, error: "The cure date falls before the letter's own date." };
    }

    /* Fines are matched back to the posted schedule by name, the same way an
       invoice line is, so a notice keeps its link to the amount the board
       adopted. An off-schedule amount is allowed and simply has no fee. */
    const { data: feeRows } = await db
      .from("fee_schedule")
      .select("id, name");
    const feeByName = new Map(
      (feeRows ?? []).map((f) => [((f.name as string) ?? "").trim().toLowerCase(), f.id as string]),
    );

    const { data: notice, error } = await db
      .from("fine_notices")
      .insert({
        violation_id: UUID_RE.test(input.violationId) ? input.violationId : null,
        lot_id: UUID_RE.test(input.lotId) ? input.lotId : null,
        community: input.community.trim() || null,
        property_address: address,
        lot_number: input.lotNumber.trim() || null,
        block: input.block.trim() || null,
        recipient_name: recipient,
        recipient_email: input.recipientEmail.trim() || null,
        recipient_address: input.recipientAddress.trim() || null,
        delivery_method: input.delivery,
        notice_level: input.level,
        notice_date: input.noticeDate,
        inspection_date: ISO_DATE_RE.test(input.inspectionDate) ? input.inspectionDate : null,
        inspector: input.inspector.trim() || null,
        cure_date: input.cureDate,
        observed: input.observed.trim() || null,
        governing_section: input.section.trim() || null,
        cleanup_frequency: input.frequency.trim() || null,
        continuing_cents: parseDollarsToCents(input.continuing),
        continuing_unit: input.continuingUnit.trim() || null,
        admin_fee_pct: Number.isFinite(Number(input.adminFeePct)) && input.adminFeePct.trim()
          ? Number(input.adminFeePct)
          : null,
        pay_days: parseInt(input.payDays, 10) || null,
        dispute_days: parseInt(input.disputeDays, 10) || null,
        remit_to: input.remitTo.trim() || null,
        pay_link: input.payLink.trim() || null,
        copies_to: input.copiesTo.trim() || null,
        entity_key: ASSOCIATION_ENTITY,
        status: "Drafted",
        created_by_name: actorName,
      })
      .select("id, reference")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemErr } = await db.from("fine_notice_items").insert(
      items.map((i) => ({
        fine_notice_id: notice.id as string,
        fee_id: feeByName.get(i.description.toLowerCase()) ?? null,
        observed_on: i.observedOn,
        description: i.description,
        notice_level: i.level,
        amount_cents: i.cents as number,
        sort: i.sort,
      })),
    );
    if (itemErr) {
      throw new Error(`The notice saved but its violations did not: ${itemErr.message}`);
    }

    const total = items.reduce((s, i) => s + (i.cents ?? 0), 0);
    await audit(
      db,
      `Fines: drafted ${notice.reference} — ${input.level} for ${address}, ${usd(total)}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    const notices = await reloadNotices(db);
    const saved = notices.find((n) => n.id === notice.id);
    if (!saved) return { ok: false, error: "The notice saved but could not be read back." };
    return { ok: true, notices, notice: saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Record the notice as sent. This is where the fine becomes money: the
 * invoice is raised and issued against the household, so the balance the
 * owner sees matches the letter in their hand.
 */
export async function sendFineNotice(input: {
  id: string;
  sentOn: string;
  delivery: string;
  tracking: string;
}): Promise<
  | Ok<{
      notices: FineNotice[];
      invoices: Invoice[];
      invoiceNumber: string | null;
      /** For the violation's case file, when the notice came out of one. */
      violationId: string | null;
      mailing: Mailing | null;
      activity: AuditEntry | null;
      violationStatus: string | null;
    }>
  | Fail
> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That notice isn't saved yet." };
    if (!ISO_DATE_RE.test(input.sentOn)) {
      return { ok: false, error: "Pick the date the notice went out." };
    }
    if (!DELIVERY_METHODS.includes(input.delivery)) {
      return { ok: false, error: "Pick how the notice was delivered." };
    }

    const { data: row, error } = await db
      .from("fine_notices")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "That notice no longer exists." };
    const notice = row as NoticeRow;
    if (notice.status !== "Drafted") {
      return { ok: false, error: `This notice was already recorded as ${notice.status.toLowerCase()}.` };
    }

    const { data: itemRows, error: itemErr } = await db
      .from("fine_notice_items")
      .select("*")
      .eq("fine_notice_id", input.id)
      .order("sort", { ascending: true });
    if (itemErr) throw new Error(itemErr.message);
    const items = (itemRows ?? []) as ItemRow[];
    const total = items.reduce((s, i) => s + (i.amount_cents ?? 0), 0);
    if (total <= 0) {
      return { ok: false, error: "A notice with no fine on it cannot be issued." };
    }

    /* The bill. Raised and issued in one step because the letter itself says
       what is owed and when — a draft invoice sitting behind a sent letter is
       a balance the owner has been told about but cannot see. */
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    if (notice.lot_id) {
      const dueOn = notice.pay_days
        ? new Date(
            new Date(`${input.sentOn}T12:00:00Z`).getTime() + notice.pay_days * 86_400_000,
          ).toISOString().slice(0, 10)
        : null;

      const { data: inv, error: invErr } = await db
        .from("invoices")
        .insert({
          lot_id: notice.lot_id,
          community: notice.community,
          bill_to_name: notice.recipient_name,
          issued_on: input.sentOn,
          due_on: dueOn,
          memo: `Fine notice ${notice.reference} — ${notice.notice_level ?? "notice"}, ${notice.property_address}`,
          status: "sent",
          sent_at: new Date().toISOString(),
          entity_key: notice.entity_key ?? ASSOCIATION_ENTITY,
          created_by_name: actorName,
        })
        .select("id, invoice_number")
        .single();
      if (invErr) throw new Error(`The notice could not be billed: ${invErr.message}`);

      invoiceId = inv.id as string;
      invoiceNumber = inv.invoice_number as string;

      const { error: lineErr } = await db.from("invoice_lines").insert(
        items.map((i) => ({
          invoice_id: invoiceId as string,
          // Keeps the bill's link back to the posted schedule the fine came from.
          fee_id: i.fee_id,
          description: i.description,
          quantity: 1,
          unit_amount_cents: i.amount_cents ?? 0,
          amount_cents: i.amount_cents ?? 0,
        })),
      );
      if (lineErr) {
        throw new Error(`The invoice saved but its lines did not: ${lineErr.message}`);
      }
    }

    const { error: upErr } = await db
      .from("fine_notices")
      .update({
        status: "Sent",
        sent_on: input.sentOn,
        delivery_method: input.delivery,
        invoice_id: invoiceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    /* The case file is the evidence. A fine that does not appear in the
       mailing record cannot be proved to have been sent. */
    let mailing: Mailing | null = null;
    let violationStatus: string | null = null;
    if (notice.violation_id) {
      const { data: mailRow, error: mailErr } = await db
        .from("violation_mailings")
        .insert({
          violation_id: notice.violation_id,
          kind: `Fine assessed — ${notice.reference}`,
          method: input.delivery,
          sent_on: input.sentOn,
          tracking: input.tracking.trim() || null,
          delivery_status: "Sent",
        })
        .select("sent_on")
        .single();
      if (mailErr) throw new Error(mailErr.message);
      mailing = {
        kind: `Fine assessed — ${notice.reference}`,
        method: input.delivery,
        sent: dateLabel(mailRow.sent_on as string),
        tracking: input.tracking.trim() || "—",
        status: "Sent",
      };

      /* A fine is a formal notice. If the case is still sitting at reported
         or courtesy, the ladder has moved whether or not anyone remembers to
         change the dropdown. Cases already at a hearing stay there. */
      const { data: v } = await db
        .from("violations")
        .select("status")
        .eq("id", notice.violation_id)
        .maybeSingle();
      if (v && (v.status === "Reported" || v.status === "Courtesy sent")) {
        const { error: vErr } = await db
          .from("violations")
          .update({ status: "Notice sent" })
          .eq("id", notice.violation_id);
        if (vErr) throw new Error(vErr.message);
        violationStatus = "Notice sent";
      }
    }

    await audit(
      db,
      `Fines: sent ${notice.reference} to ${notice.recipient_name} by ${input.delivery.toLowerCase()} — ${usd(total)}`
        + (invoiceNumber ? ` billed as ${invoiceNumber}` : " (no home linked, not billed)"),
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      notices: await reloadNotices(db),
      invoices: await loadInvoices(db),
      invoiceNumber,
      violationId: notice.violation_id,
      mailing,
      activity: mailing
        ? {
            id: crypto.randomUUID(),
            text: `Fine notice ${notice.reference} sent by ${input.delivery.toLowerCase()} — ${usd(total)}`,
            who: actorName,
            time: stampTime(new Date().toISOString()),
          }
        : null,
      violationStatus,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Move a sent notice along: the violation was corrected, the board took it
 * up, or the fine was waived. Waiving voids the invoice, because a waived
 * fine that stays on the owner's balance is still being collected.
 */
export async function setFineNoticeStatus(input: {
  id: string;
  status: FineNoticeStatus;
  /** Required to waive — it stays on the record and prints on the ledger. */
  reason: string;
}): Promise<Ok<{ notices: FineNotice[]; invoices: Invoice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That notice isn't saved yet." };
    if (!FINE_STATUSES.includes(input.status)) {
      return { ok: false, error: "That isn't a valid state for a fine notice." };
    }
    if (input.status === "Drafted") {
      return { ok: false, error: "A notice that has gone out cannot go back to a draft." };
    }
    if (input.status === "Sent") {
      return { ok: false, error: "Use “Record it as sent” — that is what raises the bill." };
    }

    const { data: row, error } = await db
      .from("fine_notices")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "That notice no longer exists." };
    const notice = row as NoticeRow;
    if (notice.status === "Drafted") {
      return { ok: false, error: "Record the notice as sent before moving it along." };
    }

    const reason = input.reason.trim();
    if (input.status === "Waived" && !reason) {
      return { ok: false, error: "Say why the fine is being waived — it stays on the record." };
    }

    /* Waiving is not a label change: the household is still being billed
       until the invoice stands down with it. */
    if (input.status === "Waived" && notice.invoice_id) {
      const { data: inv } = await db
        .from("invoices")
        .select("status, invoice_number")
        .eq("id", notice.invoice_id)
        .maybeSingle();
      if (inv?.status === "paid") {
        return {
          ok: false,
          error: `${inv.invoice_number} has already been collected. Record a refund against it rather than waiving the fine.`,
        };
      }
      if (inv && inv.status !== "void") {
        const { error: voidErr } = await db
          .from("invoices")
          .update({
            status: "void",
            void_reason: `Fine ${notice.reference} waived — ${reason}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", notice.invoice_id);
        if (voidErr) throw new Error(voidErr.message);
      }
    }

    const { error: upErr } = await db
      .from("fine_notices")
      .update({
        status: input.status,
        cured_on: input.status === "Cured" ? today() : notice.cured_on ?? null,
        waived_reason: input.status === "Waived" ? reason : notice.waived_reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Fines: ${notice.reference} marked ${input.status.toLowerCase()}`
        + (reason ? ` — ${reason}` : ""),
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, notices: await reloadNotices(db), invoices: await loadInvoices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Throw away a draft. Only ever a draft: a notice that has gone out is the
 * record of what the recipient was told, and deleting it would leave the
 * invoice standing with nothing behind it.
 */
export async function discardFineDraft(
  id: string,
): Promise<Ok<{ notices: FineNotice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(id)) return { ok: false, error: "That notice isn't saved yet." };

    const { data: row, error } = await db
      .from("fine_notices")
      .select("reference, status, property_address")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "That notice no longer exists." };
    if (row.status !== "Drafted") {
      return {
        ok: false,
        error: "This notice has gone out. It stays on the record — waive the fine instead.",
      };
    }

    const { error: delErr } = await db.from("fine_notices").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);

    await audit(
      db,
      `Fines: discarded unsent draft ${row.reference} for ${row.property_address}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, notices: await reloadNotices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
