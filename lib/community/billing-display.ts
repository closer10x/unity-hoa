import type { DuesFrequency, HoaDashboardMetricsRow, PublicDuesDisplay } from "@/lib/types/community";
import { formatUsdFromCents } from "@/lib/format/money";

export const DUES_FREQUENCY_LABELS: Record<DuesFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

const FREQUENCIES: readonly DuesFrequency[] = ["monthly", "quarterly", "annual", "custom"];

export function parseDuesFrequency(raw: string): DuesFrequency | null {
  const t = raw.trim();
  if (!t) return null;
  return (FREQUENCIES as readonly string[]).includes(t) ? (t as DuesFrequency) : null;
}

/** One-line schedule for dashboard cards; null if nothing configured. */
export function formatDuesScheduleLine(m: Pick<
  HoaDashboardMetricsRow,
  "dues_frequency" | "hoa_due_day_of_month" | "dues_schedule_note"
>): string | null {
  const parts: string[] = [];
  if (m.dues_frequency) {
    parts.push(DUES_FREQUENCY_LABELS[m.dues_frequency]);
  }
  if (m.hoa_due_day_of_month != null) {
    parts.push(`due on the ${ordinal(m.hoa_due_day_of_month)}`);
  }
  const note = m.dues_schedule_note?.trim();
  if (note) parts.push(note);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

export function formatAssessmentLine(m: Pick<HoaDashboardMetricsRow, "hoa_fee_amount_cents">): string | null {
  if (m.hoa_fee_amount_cents == null || m.hoa_fee_amount_cents <= 0) return null;
  return `Assessment: ${formatUsdFromCents(m.hoa_fee_amount_cents)}`;
}

/**
 * Expected dues for one billing period: unit count × per-unit fee.
 * Uses official `total_units` when set; otherwise `ledgerFallbackUnits` (e.g. max ledger account #).
 */
export function expectedRevenueDueFromBillingCents(
  m: Pick<HoaDashboardMetricsRow, "total_units" | "hoa_fee_amount_cents">,
  ledgerFallbackUnits: number,
): number | null {
  const fee = m.hoa_fee_amount_cents;
  if (fee == null || fee <= 0) return null;

  if (m.total_units != null) {
    if (m.total_units < 0) return null;
    if (m.total_units === 0) return 0;
    return m.total_units * fee;
  }

  if (!Number.isFinite(ledgerFallbackUnits) || ledgerFallbackUnits <= 0) return null;
  return ledgerFallbackUnits * fee;
}

export function publicDuesFromMetrics(m: HoaDashboardMetricsRow): PublicDuesDisplay {
  return {
    hoa_fee_amount_cents: m.hoa_fee_amount_cents ?? null,
    hoa_due_day_of_month: m.hoa_due_day_of_month ?? null,
    dues_frequency: m.dues_frequency ?? null,
    dues_schedule_note: m.dues_schedule_note ?? null,
    payment_methods_note: m.payment_methods_note ?? null,
    late_fee_policy_note: m.late_fee_policy_note ?? null,
  };
}
