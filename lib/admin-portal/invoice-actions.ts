"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { Invoice, InvoiceLine } from "./types";

/**
 * Invoices sit in front of the ledger, not beside it.
 *
 * Issuing one posts a charge against the household, which is what the owner
 * balance and the public dues lookup read. Collecting it posts the payment.
 * Both are ordinary finance_transactions rows carrying the invoice's number,
 * so there is one set of books and the invoice is the paperwork over it.
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
  void_reason: string | null;
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
    voidReason: r.void_reason ?? null,
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

export async function createInvoice(input: {
  lotId: string;
  dueOn: string;
  memo: string;
  lines: { description: string; amount: string; quantity: string }[];
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

    const { data: inv, error } = await db
      .from("invoices")
      .insert({
        lot_id: lot.id,
        community: lot.community,
        bill_to_name: billTo,
        due_on: /^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) ? input.dueOn : null,
        memo: input.memo.trim() || null,
        status: "draft",
        created_by_name: actorName,
      })
      .select("invoice_number, id")
      .single();
    if (error) throw new Error(error.message);

    const { error: lineErr } = await db.from("invoice_lines").insert(
      lines.map((l) => ({
        invoice_id: inv.id as string,
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

    const { data: tx, error: txErr } = await db
      .from("finance_transactions")
      .insert({
        occurred_on: inv.issued_on,
        kind: "income",
        category: "HOA fees",
        description: `${inv.invoice_number} issued to ${inv.bill_to_name ?? "owner"}`,
        amount_cents: inv.total_cents,
        source: "manual",
        lot_id: inv.lot_id,
        owner_entry: "charge",
        entered_by_user_id: actorId,
        entered_by_name: actorName,
      })
      .select("id")
      .single();
    if (txErr) throw new Error(`The charge could not be posted: ${txErr.message}`);

    const { error: upErr } = await db
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        charge_transaction_id: tx.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: issued ${inv.invoice_number} to ${inv.bill_to_name ?? "owner"} — ${usd(inv.total_cents)} charged`,
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

/** Collecting it: the payment lands in the ledger and clears the balance. */
export async function recordInvoicePayment(input: {
  id: string;
  paidOn: string;
  method: string;
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

    const { data: tx, error: txErr } = await db
      .from("finance_transactions")
      .insert({
        occurred_on: paidOn,
        kind: "income",
        category: "HOA fees",
        description: `Payment received for ${inv.invoice_number}${
          input.method.trim() ? ` — ${input.method.trim()}` : ""
        }`,
        amount_cents: inv.total_cents,
        source: "manual",
        lot_id: inv.lot_id,
        owner_entry: "payment",
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (upErr) throw new Error(upErr.message);

    await audit(
      db,
      `Invoices: collected ${inv.invoice_number} — ${usd(inv.total_cents)} received${
        input.method.trim() ? ` by ${input.method.trim()}` : ""
      }`,
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
 * Voiding, not deleting. An issued invoice's charge is reversed with an
 * opposing entry rather than erased, so the ledger still shows that it
 * happened and was undone.
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

    // Only an issued invoice put a charge on the books to reverse.
    if (inv.status === "sent" && inv.total_cents > 0) {
      const { error: txErr } = await db.from("finance_transactions").insert({
        occurred_on: new Date().toISOString().slice(0, 10),
        kind: "income",
        category: "HOA fees",
        description: `${inv.invoice_number} voided — ${reason}`,
        amount_cents: inv.total_cents,
        source: "manual",
        lot_id: inv.lot_id,
        owner_entry: "payment",
        entered_by_user_id: actorId,
        entered_by_name: actorName,
      });
      if (txErr) throw new Error(`The reversal could not be posted: ${txErr.message}`);
    }

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
