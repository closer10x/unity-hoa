import {
  currentBillingPeriodInclusiveYmd,
  formatYmdInTimeZone,
  isYmdInInclusiveRange,
} from "@/lib/finance/billing-period";
import type { UnitRosterRow } from "@/lib/payments/build-unit-roster";
import type { DuesFrequency, FinanceTransactionRow } from "@/lib/types/community";
import type { ResidentPaymentAdminRow } from "@/lib/types/resident-payments-admin";

export function parseFinanceCategoryAsUnit(category: string, maxUnits: number): number | null {
  const n = Number.parseInt(String(category).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > maxUnits) return null;
  return n;
}

export function isManualHoaIncomeRow(row: FinanceTransactionRow, maxUnits: number): boolean {
  if (row.kind !== "income") return false;
  return parseFinanceCategoryAsUnit(row.category, maxUnits) != null;
}

function manualIncomeTimestamp(row: FinanceTransactionRow): number {
  const d = row.occurred_on?.trim();
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00.000Z`).getTime();
  }
  return new Date(row.created_at).getTime();
}

function stripeResidentPaymentSortMs(p: ResidentPaymentAdminRow): number {
  return new Date(p.paid_at ?? p.updated_at).getTime();
}

function manualHoaIncomeYmd(row: FinanceTransactionRow, timeZone: string | null): string {
  const d = row.occurred_on?.trim();
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return formatYmdInTimeZone(new Date(row.created_at), timeZone);
}

function stripePaidYmd(p: ResidentPaymentAdminRow, timeZone: string | null): string {
  return formatYmdInTimeZone(new Date(p.paid_at ?? p.updated_at), timeZone);
}

export function mergedGoodStandingForUnit(
  unit: number,
  payments: ResidentPaymentAdminRow[],
  financeItems: FinanceTransactionRow[],
  maxUnits: number,
): boolean {
  const stripePaid = payments.some((p) => p.status === "paid");
  const manual = financeItems.some(
    (r) =>
      r.kind === "income" && parseFinanceCategoryAsUnit(r.category, maxUnits) === unit,
  );
  return stripePaid || manual;
}

export type WhoPaidSummaryRow = {
  unit: number;
  residentNames: string;
  evidenceSource: "stripe" | "manual";
  evidenceDateMs: number;
  amountCents: number;
};

export type OutstandingSummaryRow = {
  unit: number;
  residentNames: string;
};

export type MergedRecentPaymentRow = {
  id: string;
  source: "stripe" | "manual";
  unit: number | null;
  amountCents: number;
  sortMs: number;
  stripe?: ResidentPaymentAdminRow;
  manual?: FinanceTransactionRow;
};

export type FinanceAdminQuickStats = {
  totalUnits: number;
  unitsUnpaid: number;
  revenueCollectedCents: number;
  /** HOA collections (Stripe paid + manual unit income) in the current billing period when `collectionsScopedToBillingPeriod`. */
  revenueCollectedInPeriodCents: number;
  /** False for `custom` dues frequency — use all-time `revenueCollectedCents` on the summary cards. */
  collectionsScopedToBillingPeriod: boolean;
};

export type FinanceAdminSummaryOptions = {
  duesFrequency: DuesFrequency | null;
  timeZone: string | null;
  referenceNow: Date;
};

export type ManualHoaMonthBucket = { key: string; label: string; cents: number };

function monthKeyUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabelShort(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function buildFinanceAdminSummary(
  roster: UnitRosterRow[],
  financeItems: FinanceTransactionRow[],
  maxUnits: number,
  options?: FinanceAdminSummaryOptions,
): {
  quick: FinanceAdminQuickStats;
  whoPaid: WhoPaidSummaryRow[];
  outstanding: OutstandingSummaryRow[];
  mergedRecent: MergedRecentPaymentRow[];
  manualHoaTotalCents: number;
  manualHoaCount: number;
  manualHoaLast6Months: ManualHoaMonthBucket[];
} {
  const ref = options?.referenceNow ?? new Date();
  const duesFrequency = options?.duesFrequency ?? null;
  const timeZone = options?.timeZone ?? null;
  const period = currentBillingPeriodInclusiveYmd(duesFrequency, ref, timeZone);
  const collectionsScopedToBillingPeriod = period != null;
  const whoPaid: WhoPaidSummaryRow[] = [];
  const outstanding: OutstandingSummaryRow[] = [];

  const manualHoaRows = financeItems.filter((r) => isManualHoaIncomeRow(r, maxUnits));

  let stripeCollectedAllTimeCents = 0;
  for (const row of roster) {
    for (const p of row.payments) {
      if (p.status !== "paid") continue;
      stripeCollectedAllTimeCents += p.amount_cents;
    }
  }

  let unitsUnpaid = 0;
  for (const row of roster) {
    if (!mergedGoodStandingForUnit(row.unit, row.payments, financeItems, maxUnits)) {
      unitsUnpaid += 1;
    }
  }

  for (const row of roster) {
    if (row.profiles.length === 0) continue;
    const names = row.profiles
      .map((p) => p.display_name?.trim())
      .filter(Boolean)
      .join("; ");
    const ok = mergedGoodStandingForUnit(row.unit, row.payments, financeItems, maxUnits);
    if (ok) {
      let bestStripeMs = 0;
      let bestStripe: ResidentPaymentAdminRow | null = null;
      for (const p of row.payments) {
        if (p.status !== "paid") continue;
        const t = stripeResidentPaymentSortMs(p);
        if (t >= bestStripeMs) {
          bestStripeMs = t;
          bestStripe = p;
        }
      }
      let bestManualMs = 0;
      let bestManual: FinanceTransactionRow | null = null;
      for (const r of financeItems) {
        if (r.kind !== "income") continue;
        if (parseFinanceCategoryAsUnit(r.category, maxUnits) !== row.unit) continue;
        const t = manualIncomeTimestamp(r);
        if (t >= bestManualMs) {
          bestManualMs = t;
          bestManual = r;
        }
      }
      const stripeWins =
        bestStripe != null && (bestManual == null || bestStripeMs >= bestManualMs);
      if (stripeWins && bestStripe) {
        whoPaid.push({
          unit: row.unit,
          residentNames: names || "—",
          evidenceSource: "stripe",
          evidenceDateMs: bestStripeMs,
          amountCents: bestStripe.amount_cents,
        });
      } else if (bestManual) {
        whoPaid.push({
          unit: row.unit,
          residentNames: names || "—",
          evidenceSource: "manual",
          evidenceDateMs: bestManualMs,
          amountCents: bestManual.amount_cents,
        });
      } else if (bestStripe) {
        whoPaid.push({
          unit: row.unit,
          residentNames: names || "—",
          evidenceSource: "stripe",
          evidenceDateMs: bestStripeMs,
          amountCents: bestStripe.amount_cents,
        });
      }
    } else {
      outstanding.push({ unit: row.unit, residentNames: names || "—" });
    }
  }

  whoPaid.sort((a, b) => a.unit - b.unit);

  const merged: MergedRecentPaymentRow[] = [];
  for (const r of roster) {
    for (const p of r.payments) {
      if (p.status !== "paid") continue;
      merged.push({
        id: `stripe-${p.id}`,
        source: "stripe",
        unit: r.unit,
        amountCents: p.amount_cents,
        sortMs: stripeResidentPaymentSortMs(p),
        stripe: p,
      });
    }
  }
  for (const r of manualHoaRows) {
    const u = parseFinanceCategoryAsUnit(r.category, maxUnits);
    merged.push({
      id: `manual-${r.id}`,
      source: "manual",
      unit: u,
      amountCents: r.amount_cents,
      sortMs: manualIncomeTimestamp(r),
      manual: r,
    });
  }
  merged.sort((a, b) => b.sortMs - a.sortMs);
  const mergedRecent = merged.slice(0, 20);

  const manualHoaTotalCents = manualHoaRows.reduce((s, r) => s + r.amount_cents, 0);
  const manualHoaCount = manualHoaRows.length;
  const revenueCollectedCents = stripeCollectedAllTimeCents + manualHoaTotalCents;

  let revenueCollectedInPeriodCents = 0;
  if (period) {
    for (const row of roster) {
      for (const p of row.payments) {
        if (p.status !== "paid") continue;
        const ymd = stripePaidYmd(p, timeZone);
        if (isYmdInInclusiveRange(ymd, period.start, period.end)) {
          revenueCollectedInPeriodCents += p.amount_cents;
        }
      }
    }
    for (const r of manualHoaRows) {
      const ymd = manualHoaIncomeYmd(r, timeZone);
      if (isYmdInInclusiveRange(ymd, period.start, period.end)) {
        revenueCollectedInPeriodCents += r.amount_cents;
      }
    }
  }

  const monthKeys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() - i);
    monthKeys.push(monthKeyUtc(d.getTime()));
  }
  const byMonth = new Map<string, number>();
  for (const k of monthKeys) byMonth.set(k, 0);
  for (const r of manualHoaRows) {
    const k = monthKeyUtc(manualIncomeTimestamp(r));
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + r.amount_cents);
  }
  const manualHoaLast6Months: ManualHoaMonthBucket[] = monthKeys.map((key) => ({
    key,
    label: monthLabelShort(key),
    cents: byMonth.get(key) ?? 0,
  }));

  return {
    quick: {
      totalUnits: maxUnits,
      unitsUnpaid,
      revenueCollectedCents,
      revenueCollectedInPeriodCents,
      collectionsScopedToBillingPeriod,
    },
    whoPaid,
    outstanding,
    mergedRecent,
    manualHoaTotalCents,
    manualHoaCount,
    manualHoaLast6Months,
  };
}
