"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { FinanceKind, FinanceTransactionRow } from "@/lib/types/community";

function ledgerEnteredByLabel(session: Awaited<ReturnType<typeof requireAdminUser>>): string {
  const fromProfile = session.profile.display_name?.trim();
  if (fromProfile) return fromProfile;
  const email = session.user.email?.trim();
  if (email) return email;
  return "Admin";
}

export async function listFinanceTransactions(): Promise<
  { items: FinanceTransactionRow[] } | { error: string }
> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .limit(200);
    if (error) return { error: error.message };
    return { items: (data ?? []) as FinanceTransactionRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function addFinanceTransaction(formData: FormData): Promise<void> {
  const session = await requireAdminUser();
  const supabase = requireServiceSupabase();
  const occurred_on = String(formData.get("occurred_on") ?? "").trim();
  const kind = String(formData.get("kind") ?? "expense") as FinanceKind;
  const allowed: FinanceKind[] = ["income", "expense", "transfer"];
  if (!allowed.includes(kind)) throw new Error("Invalid kind");
  const rawAccount = String(formData.get("category") ?? "").trim();
  const accountNum = Number.parseInt(rawAccount, 10);
  if (!Number.isFinite(accountNum) || accountNum < 1 || accountNum > FINANCE_ACCOUNT_NUMBER_MAX) {
    throw new Error(`Account number must be between 1 and ${FINANCE_ACCOUNT_NUMBER_MAX}`);
  }
  const category = String(accountNum);
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Description is required");
  const cents = parseDollarsToCents(String(formData.get("amount_dollars") ?? ""));
  if (cents == null || cents <= 0) throw new Error("Enter a valid amount");
  const unitNo = String(formData.get("unit_no") ?? "").trim();
  if (!unitNo) throw new Error("Resident unit is required");
  const customerFirstName = String(formData.get("customer_first_name") ?? "").trim() || null;
  const customerLastName = String(formData.get("customer_last_name") ?? "").trim() || null;

  const { error } = await supabase.from("finance_transactions").insert({
    occurred_on: occurred_on || undefined,
    kind,
    category,
    description,
    amount_cents: cents,
    entered_by_user_id: session.user.id,
    entered_by_name: ledgerEnteredByLabel(session),
    unit_no: unitNo,
    customer_first_name: customerFirstName,
    customer_last_name: customerLastName,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/finances");
  revalidatePath("/admin");
}

export async function deleteFinanceTransaction(
  id: string,
  _formData: FormData,
): Promise<void> {
  await requireAdminUser();
  const supabase = requireServiceSupabase();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/finances");
  revalidatePath("/admin");
}
