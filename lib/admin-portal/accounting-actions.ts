"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDollarsToCents } from "@/lib/format/money";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  isPlaidConfigured,
  removeItem,
  transactionsSync,
  type PlaidTransaction,
} from "@/lib/plaid/client";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadAccounting, loadFees } from "./server-data";
import type { BankAccount, Fee, LedgerEntry } from "./types";

/**
 * Server actions for the Accounting section. Every mutation writes its own
 * audit entry in the same request, stamped with the acting account (product
 * rule: nothing changes without a trail).
 */

type Snapshot = { ledger: LedgerEntry[]; bankAccounts: BankAccount[] };
type Ok<T = object> = { ok: true } & T;
type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminContext() {
  const session = await requireAdminUser();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured — the ledger has nowhere to write.");
  }
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Administrator";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db: createServiceClient(), actorName, actorId };
}

async function writeAudit(
  db: ReturnType<typeof createServiceClient>,
  action: string,
  actorName: string,
  actorId: string | null,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

function fail(e: unknown): Fail {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ─── Manual ledger entries ──────────────────────────────────────────── */

const MANUAL_KINDS = ["income", "expense"] as const;

export async function addLedgerEntry(input: {
  date: string;
  kind: string;
  category: string;
  description: string;
  amount: string;
  /** The owner's lot this money belongs to (income from a resident). */
  lotId?: string | null;
  /** The bank account this credits (income) or comes out of (expense). */
  bankAccountId?: string | null;
}): Promise<Ok<Snapshot> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const kind = MANUAL_KINDS.find((k) => k === input.kind);
    if (!kind) return { ok: false, error: "Pick income or expense." };

    const cents = parseDollarsToCents(input.amount);
    if (cents == null || cents <= 0) return { ok: false, error: "Enter an amount above zero." };

    const parsed = input.date.trim() ? new Date(`${input.date.trim()}T12:00:00`) : new Date();
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "That date didn't parse — use the date picker." };
    }
    const occurredOn = parsed.toISOString().slice(0, 10);

    const description = input.description.trim();
    if (!description) return { ok: false, error: "Describe what the money was for." };

    // Validate the account belongs to us before stamping the entry with it.
    let bankAccountId: string | null = null;
    let accountNote = "";
    if (input.bankAccountId) {
      const { data: acct } = await db
        .from("bank_accounts")
        .select("id, name, mask")
        .eq("id", input.bankAccountId)
        .maybeSingle();
      if (!acct) return { ok: false, error: "That account is no longer on file." };
      bankAccountId = acct.id as string;
      accountNote = ` ${kind === "income" ? "to" : "from"} ${acct.name}${acct.mask ? ` ····${acct.mask}` : ""}`;
    }

    let ownerNote = "";
    if (input.lotId) {
      const { data: lot } = await db
        .from("lots")
        .select("id, lot_number")
        .eq("id", input.lotId)
        .maybeSingle();
      if (!lot) return { ok: false, error: "That resident's lot is no longer on the roster." };
      ownerNote = lot.lot_number ? ` for Lot ${lot.lot_number}` : "";
    }

    const { error } = await db.from("finance_transactions").insert({
      occurred_on: occurredOn,
      kind,
      category: input.category.trim() || "Other",
      description,
      amount_cents: cents,
      source: "manual",
      lot_id: input.lotId ?? null,
      bank_account_id: bankAccountId,
      entered_by_user_id: actorId,
      entered_by_name: actorName,
    });
    if (error) throw new Error(error.message);

    await writeAudit(
      db,
      `Ledger: recorded ${usd(cents)} ${kind} (${input.category.trim() || "Other"})${ownerNote}${accountNote} — ${description}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLedgerEntry(id: string): Promise<Ok<Snapshot> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const { data: row, error: readErr } = await db
      .from("finance_transactions")
      .select("id, kind, description, amount_cents")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) return { ok: false, error: "That entry is already gone." };

    const { error } = await db.from("finance_transactions").delete().eq("id", id);
    if (error) throw new Error(error.message);

    await writeAudit(
      db,
      `Ledger: deleted ${usd(row.amount_cents ?? 0)} ${row.kind} — ${row.description || "(no description)"}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}

/* ─── Fee schedule ───────────────────────────────────────────────────── */

export async function addFee(input: {
  name: string;
  amount: string;
  category: string;
}): Promise<Ok<{ fees: Fee[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name the fee — it appears on forms exactly as written." };
    const cents = parseDollarsToCents(input.amount);
    if (cents == null || cents < 0) return { ok: false, error: "Enter the fee amount." };

    const { error } = await db.from("fee_schedule").insert({
      name,
      amount_cents: cents,
      category: input.category.trim() || "Other income",
    });
    if (error) throw new Error(error.message);

    await writeAudit(db, `Fee schedule: added ${name} at ${usd(cents)}`, actorName, actorId);
    revalidatePath("/admin");
    return { ok: true, fees: await loadFees(db) };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Changing a fee changes what gets quoted from here on. Amounts already
 * posted to a ledger are untouched — those are what was actually charged,
 * and rewriting history would put the books out of step with the notices
 * that went out.
 */
export async function updateFee(input: {
  id: string;
  name: string;
  amount: string;
  category: string;
  /** Which company's revenue this fee is; "" leaves it unassigned. */
  entity: string;
}): Promise<Ok<{ fees: Fee[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name the fee — it appears on forms exactly as written." };
    const cents = parseDollarsToCents(input.amount);
    if (cents == null || cents < 0) return { ok: false, error: "Enter the fee amount." };

    const { data: before, error: readErr } = await db
      .from("fee_schedule")
      .select("name, amount_cents, category, entity_key")
      .eq("id", input.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!before) return { ok: false, error: "That fee no longer exists." };

    const category = input.category.trim() || "Other income";
    /* Only ever affects what is billed from here on. Invoices and ledger rows
       carry their own copy, so moving a fee between companies never restates
       money already booked. */
    const entityKey = input.entity.trim() || null;
    const { error } = await db
      .from("fee_schedule")
      .update({ name, amount_cents: cents, category, entity_key: entityKey })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    const changes: string[] = [];
    if (before.name !== name) changes.push(`name \u2192 ${name}`);
    if (before.amount_cents !== cents) {
      changes.push(`${usd(before.amount_cents)} \u2192 ${usd(cents)}`);
    }
    if ((before.category ?? "") !== category) changes.push(`category \u2192 ${category}`);
    if ((before.entity_key ?? null) !== entityKey) {
      changes.push(`revenue \u2192 ${entityKey ?? "unassigned"}`);
    }

    await writeAudit(
      db,
      `Fee schedule: updated ${before.name}${changes.length ? ` \u2014 ${changes.join(", ")}` : " \u2014 no change"}`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, fees: await loadFees(db) };
  } catch (e) {
    return fail(e);
  }
}

/** Fees retire rather than delete, so old ledger references keep meaning. */
export async function setFeeActive(
  id: string,
  active: boolean,
): Promise<Ok<{ fees: Fee[] }> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const { data: fee, error: readErr } = await db
      .from("fee_schedule")
      .select("name, amount_cents")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!fee) return { ok: false, error: "That fee no longer exists." };

    const { error } = await db.from("fee_schedule").update({ active }).eq("id", id);
    if (error) throw new Error(error.message);

    await writeAudit(
      db,
      `Fee schedule: ${active ? "restored" : "retired"} ${fee.name} (${usd(fee.amount_cents)})`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    return { ok: true, fees: await loadFees(db) };
  } catch (e) {
    return fail(e);
  }
}

/* ─── Bank sync (Plaid) ──────────────────────────────────────────────── */

export async function getBankLinkToken(): Promise<Ok<{ linkToken: string }> | Fail> {
  try {
    const { actorId } = await adminContext();
    if (!isPlaidConfigured()) {
      return {
        ok: false,
        error:
          "Bank sync isn't configured yet. Add PLAID_CLIENT_ID, PLAID_SECRET and PLAID_ENV to .env.local and restart.",
      };
    }
    const linkToken = await createLinkToken(actorId ?? "unity-grid-admin");
    return { ok: true, linkToken };
  } catch (e) {
    return fail(e);
  }
}

/** Plaid's personal-finance categories → the ledger's plain-English set. */
function categoryFor(tx: PlaidTransaction, kind: "income" | "expense"): string {
  const primary = tx.personal_finance_category?.primary ?? "";
  const map: Record<string, string> = {
    INCOME: "Other income",
    TRANSFER_IN: "Transfer in",
    TRANSFER_OUT: "Transfer out",
    LOAN_PAYMENTS: "Loan payments",
    BANK_FEES: "Bank fees",
    RENT_AND_UTILITIES: "Utilities",
    HOME_IMPROVEMENT: "Repairs & maintenance",
    GENERAL_SERVICES: "General services",
    GOVERNMENT_AND_NON_PROFIT: "Taxes & government",
  };
  if (map[primary]) return map[primary];
  if (primary) {
    const words = primary.toLowerCase().replaceAll("_", " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return kind === "income" ? "Other income" : "Other expense";
}

function txToRow(tx: PlaidTransaction, bankAccountId: string) {
  const kind = tx.amount < 0 ? ("income" as const) : ("expense" as const);
  return {
    occurred_on: tx.date,
    kind,
    category: categoryFor(tx, kind),
    description: tx.merchant_name || tx.name || "Bank transaction",
    amount_cents: Math.round(Math.abs(tx.amount) * 100),
    source: "bank",
    bank_account_id: bankAccountId,
    external_id: tx.transaction_id,
    pending: tx.pending,
  };
}

type ItemRow = {
  id: string;
  item_id: string;
  access_token: string;
  institution_name: string;
  transactions_cursor: string;
  status: string;
};

/**
 * Pull every new/changed/removed transaction for one item through
 * /transactions/sync, then refresh the cached balances. Returns how many
 * rows were imported or updated.
 */
async function syncItem(
  db: ReturnType<typeof createServiceClient>,
  item: ItemRow,
): Promise<number> {
  const { data: accountRows, error: baErr } = await db
    .from("bank_accounts")
    .select("id, plaid_account_id")
    .eq("plaid_item_id", item.id);
  if (baErr) throw new Error(baErr.message);
  const byPlaidId = new Map(
    (accountRows ?? [])
      .filter((a) => a.plaid_account_id)
      .map((a) => [a.plaid_account_id as string, a.id as string]),
  );

  let cursor = item.transactions_cursor;
  let touched = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await transactionsSync(item.access_token, cursor);

    const upserts = [...page.added, ...page.modified]
      .map((tx) => {
        const accountId = byPlaidId.get(tx.account_id);
        return accountId ? txToRow(tx, accountId) : null;
      })
      .filter(Boolean);
    if (upserts.length) {
      const { error } = await db
        .from("finance_transactions")
        .upsert(upserts, { onConflict: "external_id" });
      if (error) throw new Error(error.message);
      touched += upserts.length;
    }

    const removedIds = page.removed.map((r) => r.transaction_id).filter(Boolean);
    if (removedIds.length) {
      const { error } = await db
        .from("finance_transactions")
        .delete()
        .in("external_id", removedIds);
      if (error) throw new Error(error.message);
    }

    cursor = page.next_cursor;
    hasMore = page.has_more;
  }

  const { error: curErr } = await db
    .from("plaid_items")
    .update({ transactions_cursor: cursor, status: "active" })
    .eq("id", item.id);
  if (curErr) throw new Error(curErr.message);

  const balances = await getAccounts(item.access_token);
  const now = new Date().toISOString();
  for (const acct of balances) {
    const ourId = byPlaidId.get(acct.account_id);
    if (!ourId) continue;
    await db
      .from("bank_accounts")
      .update({
        current_balance_cents:
          acct.balances.current == null ? null : Math.round(acct.balances.current * 100),
        available_balance_cents:
          acct.balances.available == null ? null : Math.round(acct.balances.available * 100),
        last_synced_at: now,
      })
      .eq("id", ourId);
  }

  return touched;
}

/**
 * Add an account by hand, for offices not on bank sync. It carries no Plaid
 * item, no synced balance and no imported transactions — it exists so a ledger
 * entry can name which account the money moved through. Balances on a manual
 * account come from the entries posted against it, not a feed.
 */
export async function addManualBankAccount(input: {
  name: string;
  institution: string;
  mask: string;
  type: string;
}): Promise<Ok<Snapshot> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name the account, e.g. Operating checking." };
    const mask = input.mask.replace(/[^0-9]/g, "").slice(-4);
    const { error } = await db.from("bank_accounts").insert({
      name,
      institution_name: input.institution.trim() || "",
      mask,
      account_type: input.type.trim() || "checking",
      status: "active",
    });
    if (error) throw new Error(error.message);
    await writeAudit(db, `Accounting: added the ${name} account`, actorName, actorId);
    revalidatePath("/admin");
    return { ok: true, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}

export async function connectBankAccount(input: {
  publicToken: string;
  institutionName: string;
}): Promise<Ok<Snapshot & { imported: number }> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();
    if (!isPlaidConfigured()) return { ok: false, error: "Bank sync isn't configured." };

    const { access_token, item_id } = await exchangePublicToken(input.publicToken);
    const institution = input.institutionName.trim() || "Bank";

    const { data: item, error: itemErr } = await db
      .from("plaid_items")
      .upsert(
        {
          item_id,
          access_token,
          institution_name: institution,
          status: "active",
        },
        { onConflict: "item_id" },
      )
      .select()
      .single();
    if (itemErr) throw new Error(itemErr.message);

    const accounts = await getAccounts(access_token);
    for (const a of accounts) {
      const { error } = await db.from("bank_accounts").upsert(
        {
          plaid_item_id: item.id,
          plaid_account_id: a.account_id,
          name: a.official_name || a.name,
          institution_name: institution,
          mask: a.mask ?? "",
          account_type: a.subtype || a.type,
          current_balance_cents:
            a.balances.current == null ? null : Math.round(a.balances.current * 100),
          available_balance_cents:
            a.balances.available == null ? null : Math.round(a.balances.available * 100),
          status: "active",
        },
        { onConflict: "plaid_account_id" },
      );
      if (error) throw new Error(error.message);
    }

    const imported = await syncItem(db, item as ItemRow);

    await writeAudit(
      db,
      `Bank sync: connected ${institution} (${accounts.length} account${accounts.length === 1 ? "" : "s"}, ${imported} transaction${imported === 1 ? "" : "s"} imported)`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, imported, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}

export async function syncBankNow(): Promise<Ok<Snapshot & { imported: number }> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();
    if (!isPlaidConfigured()) return { ok: false, error: "Bank sync isn't configured." };

    const { data: items, error } = await db
      .from("plaid_items")
      .select("*")
      .eq("status", "active");
    if (error) throw new Error(error.message);
    if (!items?.length) return { ok: false, error: "No bank connection to sync yet." };

    let imported = 0;
    for (const item of items as ItemRow[]) {
      imported += await syncItem(db, item);
    }

    await writeAudit(
      db,
      `Bank sync: pulled ${imported} transaction${imported === 1 ? "" : "s"} across ${items.length} connection${items.length === 1 ? "" : "s"}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, imported, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectBankAccount(
  accountId: string,
): Promise<Ok<Snapshot> | Fail> {
  try {
    const { db, actorName, actorId } = await adminContext();

    const { data: account, error: readErr } = await db
      .from("bank_accounts")
      .select("id, name, institution_name, mask, plaid_item_id")
      .eq("id", accountId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!account) return { ok: false, error: "That account is already gone." };

    const { error: updErr } = await db
      .from("bank_accounts")
      .update({ status: "disconnected" })
      .eq("id", accountId);
    if (updErr) throw new Error(updErr.message);

    // If this was the item's last active account, retire the whole connection
    // (and tell Plaid to stop billing for it). Imported ledger rows stay.
    if (account.plaid_item_id) {
      const { data: siblings } = await db
        .from("bank_accounts")
        .select("id")
        .eq("plaid_item_id", account.plaid_item_id)
        .eq("status", "active");
      if (!siblings?.length) {
        const { data: item } = await db
          .from("plaid_items")
          .select("access_token")
          .eq("id", account.plaid_item_id)
          .maybeSingle();
        if (item && isPlaidConfigured()) {
          try {
            await removeItem(item.access_token);
          } catch {
            // Best effort — the connection is retired on our side regardless.
          }
        }
        await db
          .from("plaid_items")
          .update({ status: "disconnected" })
          .eq("id", account.plaid_item_id);
      }
    }

    await writeAudit(
      db,
      `Bank sync: disconnected ${account.institution_name || account.name}${account.mask ? ` ····${account.mask}` : ""} — imported entries kept`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, ...(await loadAccounting(db)) };
  } catch (e) {
    return fail(e);
  }
}
