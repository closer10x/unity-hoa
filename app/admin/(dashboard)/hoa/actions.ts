"use server";

import { revalidatePath } from "next/cache";

import { parseDuesFrequency, publicDuesFromMetrics } from "@/lib/community/billing-display";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { HoaDashboardMetricsRow, PublicDuesDisplay } from "@/lib/types/community";

export type FinanceMonthBucket = {
  key: string;
  label: string;
  netCents: number;
};

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function withBillingDefaults(row: HoaDashboardMetricsRow): HoaDashboardMetricsRow {
  return {
    ...row,
    total_units: row.total_units ?? null,
    hoa_fee_amount_cents: row.hoa_fee_amount_cents ?? null,
    hoa_due_day_of_month: row.hoa_due_day_of_month ?? null,
    dues_frequency: row.dues_frequency ?? null,
    dues_schedule_note: row.dues_schedule_note ?? null,
    payment_methods_note: row.payment_methods_note ?? null,
    late_fee_policy_note: row.late_fee_policy_note ?? null,
  };
}

export async function getDashboardMetrics(): Promise<HoaDashboardMetricsRow | null> {
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("hoa_dashboard_metrics")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    return withBillingDefaults(data as HoaDashboardMetricsRow);
  } catch {
    return null;
  }
}

export async function getPublicDuesDisplay(): Promise<PublicDuesDisplay | null> {
  try {
    const m = await getDashboardMetrics();
    if (!m) return null;
    return publicDuesFromMetrics(m);
  } catch {
    return null;
  }
}

export async function getFinanceChartBuckets(months = 6): Promise<FinanceMonthBucket[]> {
  try {
    const supabase = requireServiceSupabase();
    const start = new Date();
    start.setUTCMonth(start.getUTCMonth() - (months - 1));
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const iso = start.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("finance_transactions")
      .select("occurred_on, kind, amount_cents")
      .gte("occurred_on", iso);
    if (error || !data) {
      return buildEmptyBuckets(months);
    }

    const keys: string[] = [];
    const cursor = new Date();
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(cursor);
      d.setUTCMonth(d.getUTCMonth() - i);
      keys.push(monthKey(d));
    }

    const sums = new Map<string, number>();
    for (const k of keys) sums.set(k, 0);

    for (const row of data as {
      occurred_on: string;
      kind: string;
      amount_cents: number;
    }[]) {
      const d = new Date(row.occurred_on + "T12:00:00.000Z");
      const k = monthKey(d);
      if (!sums.has(k)) continue;
      const amt = Number(row.amount_cents);
      if (row.kind === "income") sums.set(k, (sums.get(k) ?? 0) + amt);
      else if (row.kind === "expense") sums.set(k, (sums.get(k) ?? 0) - amt);
    }

    return keys.map((key) => ({
      key,
      label: monthLabel(key),
      netCents: sums.get(key) ?? 0,
    }));
  } catch {
    return buildEmptyBuckets(months);
  }
}

function buildEmptyBuckets(months: number): FinanceMonthBucket[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(monthKey(d));
  }
  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    netCents: 0,
  }));
}

export async function updateDashboardMetrics(formData: FormData): Promise<void> {
  const supabase = requireServiceSupabase();
  const total_residents = Math.max(0, parseInt(String(formData.get("total_residents") ?? "0"), 10) || 0);
  const growthRaw = String(formData.get("resident_growth_pct") ?? "").trim();
  const resident_growth_pct = growthRaw === "" ? null : Number(growthRaw);
  const outstanding_dollars = String(formData.get("outstanding_dues_dollars") ?? "").trim();
  const reserve_dollars = String(formData.get("reserve_fund_dollars") ?? "").trim();
  const overdue_accounts = Math.max(0, parseInt(String(formData.get("overdue_accounts") ?? "0"), 10) || 0);
  const satisfaction_pct = Math.min(
    100,
    Math.max(0, parseInt(String(formData.get("satisfaction_pct") ?? "0"), 10) || 0),
  );
  const fiscal_period_label =
    String(formData.get("fiscal_period_label") ?? "").trim() || null;
  const pulse_note = String(formData.get("pulse_note") ?? "").trim() || null;

  const outstanding_dues_cents = Math.round(
    (parseFloat(outstanding_dollars.replace(/[$,]/g, "")) || 0) * 100,
  );
  const reserve_fund_cents = Math.round(
    (parseFloat(reserve_dollars.replace(/[$,]/g, "")) || 0) * 100,
  );

  const { error } = await supabase
    .from("hoa_dashboard_metrics")
    .update({
      total_residents,
      resident_growth_pct:
        resident_growth_pct != null && Number.isFinite(resident_growth_pct)
          ? resident_growth_pct
          : null,
      outstanding_dues_cents,
      overdue_accounts,
      fiscal_period_label,
      reserve_fund_cents,
      satisfaction_pct,
      pulse_note,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/finances");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/community");
  revalidatePath("/payment");
}

export type HoaBillingSettingsFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

async function persistHoaBillingSettings(formData: FormData): Promise<void> {
  await requireAdminUser();
  const supabase = requireServiceSupabase();

  const unitsRaw = String(formData.get("total_units") ?? "").trim();
  const total_units =
    unitsRaw === "" ? null : Math.max(0, parseInt(unitsRaw, 10) || 0);

  const feeRaw = String(formData.get("hoa_fee_dollars") ?? "").trim();
  let hoa_fee_amount_cents: number | null =
    feeRaw === "" ? null : parseDollarsToCents(feeRaw);
  if (hoa_fee_amount_cents != null && hoa_fee_amount_cents < 0) hoa_fee_amount_cents = null;

  const dueRaw = String(formData.get("hoa_due_day_of_month") ?? "").trim();
  let hoa_due_day_of_month: number | null = null;
  if (dueRaw !== "") {
    const d = parseInt(dueRaw, 10);
    if (Number.isFinite(d) && d >= 1 && d <= 28) hoa_due_day_of_month = d;
  }

  const dues_frequency = parseDuesFrequency(String(formData.get("dues_frequency") ?? ""));
  const dues_schedule_note =
    String(formData.get("dues_schedule_note") ?? "").trim() || null;
  const payment_methods_note =
    String(formData.get("payment_methods_note") ?? "").trim() || null;
  const late_fee_policy_note =
    String(formData.get("late_fee_policy_note") ?? "").trim() || null;

  const { error } = await supabase
    .from("hoa_dashboard_metrics")
    .update({
      total_units,
      hoa_fee_amount_cents,
      hoa_due_day_of_month,
      dues_frequency,
      dues_schedule_note,
      payment_methods_note,
      late_fee_policy_note,
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/finances");
  revalidatePath("/payment");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/community");
}

export async function updateHoaBillingSettings(formData: FormData): Promise<void> {
  await persistHoaBillingSettings(formData);
}

export async function submitHoaBillingSettings(
  _prev: HoaBillingSettingsFormState,
  formData: FormData,
): Promise<HoaBillingSettingsFormState> {
  try {
    await persistHoaBillingSettings(formData);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save settings";
    return { ok: false, error: message };
  }
}
