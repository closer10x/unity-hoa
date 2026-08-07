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

import { loadAccounting } from "./server-data";
import type { BankAccount, LedgerEntry } from "./types";

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

    const { error } = await db.from("finance_transactions").insert({
      occurred_on: occurredOn,
      kind,
      category: input.category.trim() || "Other",
      description,
      amount_cents: cents,
      source: "manual",
      entered_by_user_id: actorId,
      entered_by_name: actorName,
    });
    if (error) throw new Error(error.message);

    await writeAudit(
      db,
      `Ledger: recorded ${usd(cents)} ${kind} (${input.category.trim() || "Other"}) — ${description}`,
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
