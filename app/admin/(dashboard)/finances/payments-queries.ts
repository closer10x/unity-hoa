import { requireAdminUser } from "@/lib/auth/require-admin";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { unitLotToIndex } from "@/lib/payments/unit-lot-index";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type {
  ProfileUnitDirectoryRow,
  ResidentPaymentAdminRow,
  ResidentPaymentStatus,
  StripeWebhookEventRow,
} from "@/lib/types/resident-payments-admin";

const PAYMENTS_PAGE_LIMIT = 500;
const WEBHOOK_EVENTS_LIMIT = 100;
const UNITS_PAYMENTS_FETCH_LIMIT = 3000;

export type PaymentListFilters = {
  status: ResidentPaymentStatus | "all";
  search: string;
  unitIndex: number | null;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
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

    const search = filters.search.trim();
    if (search.length > 0) {
      const pat = `%${escapeIlike(search)}%`;
      q = q.or(
        `payer_first_name.ilike.${pat},payer_last_name.ilike.${pat},unit_lot.ilike.${pat}`,
      );
    }

    const { data, error } = await q;
    if (error) return { error: error.message };

    let rows = (data ?? []) as ResidentPaymentAdminRow[];

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

export async function listRecentWebhookEvents(): Promise<
  { items: StripeWebhookEventRow[] } | { error: string }
> {
  await requireAdminUser();
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("stripe_webhook_events")
      .select("id, type, received_at")
      .order("received_at", { ascending: false })
      .limit(WEBHOOK_EVENTS_LIMIT);
    if (error) return { error: error.message };
    return { items: (data ?? []) as StripeWebhookEventRow[] };
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
