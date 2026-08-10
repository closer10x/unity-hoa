"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { Invoice, InvoiceLine } from "./types";

/**
 * Invoices sit in front of the ledger, not beside it.
 *
 * Issuing one bills the household — it does not touch the ledger. What is
 * owed lives on the invoice until the money actually arrives; only then does
 * a ledger entry appear, for the amount collected. The books therefore record
 * money, not expectations, and an unpaid invoice never inflates income.
 *
 * A sent invoice is never edited or deleted. It has gone out; the record of
 * what was billed has to keep saying what was billed. Corrections are a void
 * with a reason, then a fresh invoice.
 */

type Fail = { ok: false; error: string };
type Ok<T> = { ok: true } & T;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const dateLabel = (d: string | null) =>
  d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
      })
    : "—";

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can work with invoices.");
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

type InvoiceRow = {
  id: string;
  invoice_number: string;
  lot_id: string | null;
  bill_to_name: string | null;
  issued_on: string;
  due_on: string | null;
  status: string;
  memo: string | null;
  total_cents: number;
  paid_on: string | null;
  entity_key: string | null;
  payment_deposited: boolean | null;
  payment_deposited_on: string | null;
  void_reason: string | null;
  created_by_name: string | null;
};

function toInvoice(r: InvoiceRow, address: string, lines: InvoiceLine[]): Invoice {
  const overdue =
    r.status === "sent" &&
    Boolean(r.due_on) &&
    new Date(`${r.due_on}T23:59:59Z`).getTime() < Date.now();
  return {
    id: r.id,
    number: r.invoice_number,
    lotId: r.lot_id,
    billTo: r.bill_to_name?.trim() || "Unassigned lot",
    address,
    issued: dateLabel(r.issued_on),
    due: dateLabel(r.due_on),
    dueOn: r.due_on,
    status: (["draft", "sent", "paid", "void"].includes(r.status)
      ? r.status
      : "draft") as Invoice["status"],
    overdue,
    memo: r.memo ?? "",
    total: usd(r.total_cents ?? 0),
    totalCents: r.total_cents ?? 0,
    paidOn: r.paid_on ? dateLabel(r.paid_on) : null,
    entity: r.entity_key ?? null,
    deposited: r.payment_deposited ?? null,
    depositedOn: r.payment_deposited_on ? dateLabel(r.payment_deposited_on) : null,
    voidReason: r.void_reason ?? null,
    createdBy: r.created_by_name?.trim() || "the office",
    lines,
  };
}

/** Every invoice with its lines, newest first. */
export async function loadInvoices(
  db: ReturnType<typeof requireServiceSupabase>,
): Promise<Invoice[]> {
  const [invRes, lineRes, lotRes] = await Promise.all([
    db.from("invoices").select("*").order("issued_on", { ascending: false }).limit(500),
    db.from("invoice_lines").select("*").order("created_at", { ascending: true }).limit(4000),
    db.from("lots").select("id, street_number, street_name, account_number").limit(2000),
  ]);

  const addressByLot = new Map(
    (lotRes.data ?? []).map((l) => [
      l.id as string,
      [
        [l.street_number, l.street_name].filter(Boolean).join(" "),
        l.account_number,
      ].filter(Boolean).join(" · "),
    ]),
  );

  const linesByInvoice = new Map<string, InvoiceLine[]>();
  for (const l of lineRes.data ?? []) {
    const list = linesByInvoice.get(l.invoice_id as string) ?? [];
    list.push({
      id: l.id as string,
      description: (l.description as string) ?? "",
      quantity: Number(l.quantity) || 1,
      amount: usd(Number(l.amount_cents) || 0),
      amountCents: Number(l.amount_cents) || 0,
    });
    linesByInvoice.set(l.invoice_id as string, list);
  }

  return ((invRes.data ?? []) as InvoiceRow[]).map((r) =>
    toInvoice(
      r,
      (r.lot_id && addressByLot.get(r.lot_id)) || "No property linked",
      linesByInvoice.get(r.id) ?? [],
    ),
  );
}

/**
 * Memos already used on invoices, most recent first. The office types the
 * same handful of phrases — "Paid via escrow", "Closing statement" — so they
 * come back as one-tap choices instead of being retyped.
 */
export async function loadInvoiceMemos(
  db: ReturnType<typeof requireServiceSupabase>,
): Promise<string[]> {
  const { data } = await db
    .from("invoices")
    .select("memo, created_at")
    .not("memo", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const memo = ((r.memo as string) ?? "").trim();
    if (!memo) continue;
    const key = memo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(memo);
    if (out.length >= 12) break;
  }
  return out;
}

export async function createInvoice(input: {
  lotId: string;
  dueOn: string;
  memo: string;
  lines: { description: string; amount: string; quantity: string }[];
  /** Which company's revenue this is. "" falls back to what the fees say. */
  entity?: string;
}): Promise<Ok<{ invoices: Invoice[]; number: string }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    if (!UUID_RE.test(input.lotId)) {
      return { ok: false, error: "Pick the home this invoice is for." };
    }

    const lines = input.lines
      .map((l) => {
        const cents = parseDollarsToCents(l.amount);
        const qty = Math.max(1, parseInt(l.quantity, 10) || 1);
        return {
          description: l.description.trim(),
          quantity: qty,
          unit: cents,
          total: cents == null ? null : cents * qty,
        };
      })
      .filter((l) => l.description || l.unit != null);

    if (lines.length === 0) return { ok: false, error: "Add at least one line to the invoice." };
    for (const l of lines) {
      if (!l.description) return { ok: false, error: "Every line needs a description." };
      if (l.unit == null || l.unit < 0) {
        return { ok: false, error: `Enter an amount for “${l.description}”.` };
      }
    }

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("id, community, owner_profile_id, street_number, street_name")
      .eq("id", input.lotId)
      .maybeSingle();
    if (lotErr) throw new Error(lotErr.message);
    if (!lot) return { ok: false, error: "That home is no longer on the roster." };

    let billTo = "Unassigned lot";
    if (lot.owner_profile_id) {
      const { data: prof } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", lot.owner_profile_id)
        .maybeSingle();
      billTo = prof?.display_name?.trim() || billTo;
    }

    /* Which company this bills for. A line raised from the fee schedule
       carries that fee's entity; the invoice takes it when every line agrees.
       A mixed invoice is left unassigned rather than guessed at — it would
       have to be split before either company could book it, and silently
       picking one is how revenue ends up in the wrong return. */
    const { data: feeRows } = await db
      .from("fee_schedule")
      .select("id, name, entity_key");
    const feeByName = new Map(
      (feeRows ?? []).map((f) => [((f.name as string) ?? "").trim().toLowerCase(), f]),
    );
    const matched = lines.map((l) => feeByName.get(l.description.toLowerCase()));
    const entities = new Set(
      matched.map((f) => (f?.entity_key as string | undefined) ?? null).filter(Boolean),
    );
    const fromFees = entities.size === 1 ? [...entities][0] : null;
    /* The fee schedule is the default, not the verdict. A one-off charge has
       no fee behind it, and the office sometimes bills something on the other
       company's behalf, so whoever raises the invoice can say. */
    const entityKey = input.entity?.trim() || fromFees;

    const { data: inv, error } = await db
      .from("invoices")
      .insert({
        lot_id: lot.id,
        community: lot.community,
        bill_to_name: billTo,
        due_on: /^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) ? input.dueOn : null,
        memo: input.memo.trim() || null,
        status: "draft",
        entity_key: entityKey,
        created_by_name: actorName,
      })
      .select("invoice_number, id")
      .single();
    if (error) throw new Error(error.message);

    const { error: lineErr } = await db.from("invoice_lines").insert(
      lines.map((l, i) => ({
        invoice_id: inv.id as string,
        // Keeps the link back to the schedule the quick-pick came from.
        fee_id: (matched[i]?.id as string | undefined) ?? null,
        description: l.description,
        quantity: l.quantity,
        unit_amount_cents: l.unit as number,
        amount_cents: l.total as number,
      })),
    );
    if (lineErr) throw new Error(`The invoice saved but its lines did not: ${lineErr.message}`);

    const total = lines.reduce((s, l) => s + (l.total ?? 0), 0);
    await audit(
      db,
      `Invoices: drafted ${inv.invoice_number} for ${billTo} — ${usd(total)}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, invoices: await loadInvoices(db), number: inv.invoice_number as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Issuing the invoice is what makes it owed: the charge posts against the
 * household, so the owner balance and the dues lookup show it straight away.
 */
export async function sendInvoice(id: string): Promise<Ok<{ invoices: Invoice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: inv, error } = await db
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { ok: false, error: "That invoice no longer exists." };
    if (inv.status !== "draft") {
      return { ok: false, error: `This invoice is already ${inv.status}.` };
    }
    if (!inv.total_cents || inv.total_cents <= 0) {
      return { ok: false, error: "An invoice with no amount cannot be issued." };
    }

    /* Deliberately no ledger entry here. Issuing bills the household; the
       books stay quiet until the money turns up. */
    const { error: upErr } = await db
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: issued ${inv.invoice_number} to ${inv.bill_to_name ?? "owner"} — ${usd(inv.total_cents)} owed`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, invoices: await loadInvoices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Collecting it. This is the only point money enters the books: one ledger
 * entry for what was actually received, against the household that paid.
 */
export async function recordInvoicePayment(input: {
  id: string;
  paidOn: string;
  method: string;
  memo: string;
  /** Check number, wire reference or transaction id. */
  reference: string;
  /** Bank the check was drawn on. */
  bank: string;
  /** Whether it has reached the bank yet. */
  deposited: boolean;
  /** The day it was deposited — ignored unless `deposited`. */
  depositedOn: string;
}): Promise<Ok<{ invoices: Invoice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: inv, error } = await db
      .from("invoices")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { ok: false, error: "That invoice no longer exists." };
    if (inv.status === "paid") return { ok: false, error: "This invoice is already marked paid." };
    if (inv.status !== "sent") {
      return { ok: false, error: "Issue the invoice before recording a payment against it." };
    }

    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)
      ? input.paidOn
      : new Date().toISOString().slice(0, 10);

    const method = input.method.trim();
    const reference = input.reference.trim();
    const bank = input.bank.trim();
    const memo = input.memo.trim();

    /* A check without its number cannot be traced back to a statement later,
       which is the whole reason for writing it down. */
    if (method === "Check" && !reference) {
      return { ok: false, error: "Add the check number — it is what ties this payment to a statement." };
    }

    /* Deposited is its own day: a check handed over at the office sits in a
       drawer until someone banks it, and until then the money is recorded
       but not yet in the account. */
    const depositedOn =
      input.deposited && /^\d{4}-\d{2}-\d{2}$/.test(input.depositedOn)
        ? input.depositedOn
        : input.deposited
          ? paidOn
          : null;

    const detail = [
      method,
      reference ? (method === "Check" ? `check ${reference}` : `ref ${reference}`) : "",
      bank,
      input.deposited ? `deposited ${depositedOn}` : "not yet deposited",
      memo,
    ].filter(Boolean).join(" · ");

    const { data: tx, error: txErr } = await db
      .from("finance_transactions")
      .insert({
        occurred_on: paidOn,
        kind: "income",
        category: "HOA fees",
        description: `Payment received for ${inv.invoice_number}${detail ? ` — ${detail}` : ""}`,
        amount_cents: inv.total_cents,
        source: "manual",
        lot_id: inv.lot_id,
        owner_entry: "payment",
        /* The money goes to whichever company the invoice billed for. Copied,
           not looked up later: re-pointing a fee at the other company next
           year must not move last year's income across the books. */
        entity_key: inv.entity_key ?? null,
        entered_by_user_id: actorId,
        entered_by_name: actorName,
      })
      .select("id")
      .single();
    if (txErr) throw new Error(`The payment could not be posted: ${txErr.message}`);

    const { error: upErr } = await db
      .from("invoices")
      .update({
        status: "paid",
        paid_on: paidOn,
        payment_transaction_id: tx.id,
        payment_method: method || null,
        payment_memo: memo || null,
        payment_reference: reference || null,
        payment_bank: bank || null,
        payment_deposited: input.deposited,
        payment_deposited_on: depositedOn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: collected ${inv.invoice_number} — ${usd(inv.total_cents)} received${detail ? ` (${detail})` : ""}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, invoices: await loadInvoices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Editing what an invoice says.
 *
 * Drafts and issued invoices are both fully editable, at the owner's
 * direction — the office often catches a wrong figure before the household
 * has acted on it, and voiding and reissuing for a typo is heavy.
 *
 * The safeguard is the trail rather than the lock: changing what an issued
 * invoice bills is written to the audit log with the old and new figures, so
 * a record that no longer matches a notice already sent is always traceable
 * to who changed it and when. A collected invoice stays closed — money has
 * been recorded against it, and that is a refund, not an edit.
 */
export async function updateInvoice(input: {
  id: string;
  dueOn: string;
  memo: string;
  /** Draft only — ignored once the invoice has been issued. */
  lines?: { description: string; amount: string; quantity: string }[];
}): Promise<Ok<{ invoices: Invoice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: inv, error } = await db
      .from("invoices")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { ok: false, error: "That invoice no longer exists." };
    if (inv.status === "paid") {
      return { ok: false, error: "A collected invoice cannot be edited — the money has been recorded against it." };
    }
    if (inv.status === "void") {
      return { ok: false, error: "A void invoice cannot be edited. Raise a fresh one instead." };
    }

    const dueOn = /^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) ? input.dueOn : null;
    const memo = input.memo.trim() || null;
    const changes: string[] = [];
    if ((inv.due_on ?? null) !== dueOn) changes.push(`due ${dateLabel(dueOn)}`);
    if ((inv.memo ?? null) !== memo) changes.push("memo");

    if (input.lines) {
      const lines = input.lines
        .map((l) => {
          const cents = parseDollarsToCents(l.amount);
          const qty = Math.max(1, parseInt(l.quantity, 10) || 1);
          return {
            description: l.description.trim(),
            quantity: qty,
            unit: cents,
            total: cents == null ? null : cents * qty,
          };
        })
        .filter((l) => l.description || l.unit != null);

      if (lines.length === 0) return { ok: false, error: "An invoice needs at least one line." };
      for (const l of lines) {
        if (!l.description) return { ok: false, error: "Every line needs a description." };
        if (l.unit == null || l.unit < 0) {
          return { ok: false, error: `Enter an amount for “${l.description}”.` };
        }
      }

      const { error: delErr } = await db
        .from("invoice_lines")
        .delete()
        .eq("invoice_id", input.id);
      if (delErr) throw new Error(delErr.message);

      const { error: insErr } = await db.from("invoice_lines").insert(
        lines.map((l) => ({
          invoice_id: input.id,
          description: l.description,
          quantity: l.quantity,
          unit_amount_cents: l.unit as number,
          amount_cents: l.total as number,
        })),
      );
      if (insErr) throw new Error(`The lines could not be saved: ${insErr.message}`);

      const total = lines.reduce((a, l) => a + (l.total ?? 0), 0);
      if (total !== inv.total_cents) {
        changes.push(
          inv.status === "sent"
            ? `billed amount after issue ${usd(inv.total_cents)} → ${usd(total)}`
            : `${usd(inv.total_cents)} → ${usd(total)}`,
        );
      }
    }

    const { error: upErr } = await db
      .from("invoices")
      .update({ due_on: dueOn, memo, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: edited ${inv.invoice_number}${changes.length ? ` — ${changes.join(", ")}` : " — no change"}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, invoices: await loadInvoices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Voiding, not deleting — the invoice stays on the record with its reason.
 * A collected invoice cannot be voided: money changed hands, and that is a
 * refund, not an erasure.
 */
export async function voidInvoice(input: {
  id: string;
  reason: string;
}): Promise<Ok<{ invoices: Invoice[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const reason = input.reason.trim();
    if (!reason) return { ok: false, error: "Say why it is being voided — it stays on the record." };

    const { data: inv, error } = await db
      .from("invoices")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { ok: false, error: "That invoice no longer exists." };
    if (inv.status === "paid") {
      return {
        ok: false,
        error: "A collected invoice cannot be voided. Record a refund against it instead.",
      };
    }
    if (inv.status === "void") return { ok: false, error: "This invoice is already void." };

    /* Nothing to reverse: issuing never wrote to the ledger, so voiding is
       simply the invoice standing down. */

    const { error: upErr } = await db
      .from("invoices")
      .update({ status: "void", void_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: voided ${inv.invoice_number} — ${reason}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, invoices: await loadInvoices(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
