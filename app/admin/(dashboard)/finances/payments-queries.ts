import { requireAdminUser } from "@/lib/auth/require-admin";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { unitLotToIndex } from "@/lib/payments/unit-lot-index";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type {
  ProfileUnitDirectoryRow,
  ResidentPaymentAdminRow,
  ResidentPaymentStatus,
} from "@/lib/types/resident-payments-admin";

const PAYMENTS_PAGE_LIMIT = 500;
const UNITS_PAYMENTS_FETCH_LIMIT = 3000;

export type PaymentListFilters = {
  status: ResidentPaymentStatus | "all";
  search: string;
  unitIndex: number | null;
};

function paymentMatchesSearch(row: ResidentPaymentAdminRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const parts = [
    row.unit_lot,
    row.payer_first_name,
    row.payer_last_name,
    row.stripe_checkout_session_id,
    row.stripe_payment_intent_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return parts.includes(needle);
}

export async function listResidentPaymentsAdmin(
  filters: PaymentListFilters,
): Promise<{ items: ResidentPaymentAdminRow[] } | { error: string }> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    let q = supabase
      .from("resident_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(UNITS_PAYMENTS_FETCH_LIMIT);

    if (filters.status !== "all") {
      q = q.eq("status", filters.status);
    }

    const { data, error } = await q;
    if (error) return { error: error.message };

    let rows = (data ?? []) as ResidentPaymentAdminRow[];

    const search = filters.search.trim();
    if (search.length > 0) {
      rows = rows.filter((r) => paymentMatchesSearch(r, search));
    }

    if (filters.unitIndex != null) {
      const u = filters.unitIndex;
      rows = rows.filter(
        (r) => unitLotToIndex(r.unit_lot, FINANCE_ACCOUNT_NUMBER_MAX) === u,
      );
    }

    return { items: rows.slice(0, PAYMENTS_PAGE_LIMIT) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function listProfilesForUnitDirectory(): Promise<
  { items: ProfileUnitDirectoryRow[] } | { error: string }
> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, phone, unit_lot, role")
      .order("unit_lot", { ascending: true });
    if (error) return { error: error.message };
    return { items: (data ?? []) as ProfileUnitDirectoryRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function listAllResidentPaymentsForUnits(): Promise<
  { items: ResidentPaymentAdminRow[] } | { error: string }
> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("resident_payments")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(UNITS_PAYMENTS_FETCH_LIMIT);
    if (error) return { error: error.message };
    return { items: (data ?? []) as ResidentPaymentAdminRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type CommunityTimezoneRow = { timezone: string | null };

export async function getCommunityTimezone(): Promise<string | null> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("community_settings")
      .select("timezone")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    const tz = (data as CommunityTimezoneRow).timezone;
    return typeof tz === "string" && tz.trim() ? tz.trim() : null;
  } catch {
    return null;
  }
}
