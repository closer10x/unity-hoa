import type { HoaDashboardMetricsRow } from "@/lib/types/community";

export const DEFAULT_HOA_METRICS: HoaDashboardMetricsRow = {
  id: 1,
  total_residents: 1284,
  resident_growth_pct: 12,
  outstanding_dues_cents: 2_415_000,
  overdue_accounts: 8,
  fiscal_period_label: "Fiscal Year 2024-Q3",
  reserve_fund_cents: 184_000_000,
  satisfaction_pct: 92,
  pulse_note: null,
  updated_at: "1970-01-01T00:00:00.000Z",
  total_units: null,
  hoa_fee_amount_cents: null,
  hoa_due_day_of_month: null,
  dues_frequency: null,
  dues_schedule_note: null,
  payment_methods_note: null,
  late_fee_policy_note: null,
};
