import Link from "next/link";

import { addFinanceTransaction, deleteFinanceTransaction } from "@/app/admin/(dashboard)/finances/actions";
import {
  expectedRevenueDueFromBillingCents,
  formatAssessmentLine,
  formatDuesScheduleLine,
} from "@/lib/community/billing-display";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { formatDateTimeInTimezone } from "@/lib/format/datetime-community";
import { formatUsdFromCents } from "@/lib/format/money";
import type {
  FinanceAdminQuickStats,
  ManualHoaMonthBucket,
  MergedRecentPaymentRow,
  OutstandingSummaryRow,
  WhoPaidSummaryRow,
} from "@/lib/finance/summarize-finance-admin";
import type { FinanceTransactionRow, HoaDashboardMetricsRow } from "@/lib/types/community";

type Props = {
  metrics: HoaDashboardMetricsRow;
  items: FinanceTransactionRow[];
  listError: string | null;
  canRemoveLedgerRows: boolean;
  today: string;
  timeZone: string | null;
  quick: FinanceAdminQuickStats;
  whoPaid: WhoPaidSummaryRow[];
  outstanding: OutstandingSummaryRow[];
  mergedRecent: MergedRecentPaymentRow[];
  manualHoaTotalCents: number;
  manualHoaCount: number;
  manualHoaLast6Months: ManualHoaMonthBucket[];
};

function ledgerKindLabel(kind: FinanceTransactionRow["kind"]): string {
  if (kind === "income") return "HOA payment";
  return kind;
}

export function FinanceSummaryTab({
  metrics,
  items,
  listError,
  canRemoveLedgerRows,
  today,
  timeZone,
  quick,
  whoPaid,
  outstanding,
  mergedRecent,
  manualHoaTotalCents,
  manualHoaCount,
  manualHoaLast6Months,
}: Props) {
  const tableColCount = canRemoveLedgerRows ? 10 : 9;
  const maxMonthCents = Math.max(...manualHoaLast6Months.map((b) => b.cents), 0);
  const barMaxPx = 72;
  const totalUnitsDisplay = metrics.total_units ?? quick.totalUnits;
  const assessmentLine = formatAssessmentLine(metrics);
  const scheduleLine = formatDuesScheduleLine(metrics);
  const hasBillingCopy =
    assessmentLine != null ||
    scheduleLine != null ||
    (metrics.payment_methods_note?.trim() ?? "") !== "" ||
    (metrics.late_fee_policy_note?.trim() ?? "") !== "";

  const revenueDueFromBillingCents = expectedRevenueDueFromBillingCents(metrics, quick.totalUnits);
  const revenueDueDisplayCents =
    revenueDueFromBillingCents != null && quick.collectionsScopedToBillingPeriod
      ? Math.max(0, revenueDueFromBillingCents - quick.revenueCollectedInPeriodCents)
      : revenueDueFromBillingCents != null
        ? revenueDueFromBillingCents
        : metrics.outstanding_dues_cents;

  const revenueCollectedDisplayCents = quick.collectionsScopedToBillingPeriod
    ? quick.revenueCollectedInPeriodCents
    : quick.revenueCollectedCents;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Payment overview merges Stripe Checkout with manually entered HOA income by unit. Manual
            entries also feed the admin dashboard chart. HOA fee, due dates, and unit count are
            under Billing settings; pulse and reserve headline figures are under Community profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
          <Link
            href="/admin/finances?tab=billing"
            className="text-sm font-semibold text-secondary hover:underline"
          >
            Billing settings
          </Link>
          <Link
            href="/admin/settings/community"
            className="text-sm font-semibold text-secondary hover:underline"
          >
            Community profile
          </Link>
        </div>
      </div>

      {hasBillingCopy ? (
        <section className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest/80 p-5 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-headline font-bold text-on-surface">Dues & billing</h2>
            <Link
              href="/admin/finances?tab=billing"
              className="text-xs font-semibold text-secondary hover:underline shrink-0"
            >
              Edit billing settings
            </Link>
          </div>
          <ul className="text-sm text-on-surface-variant space-y-1 list-disc list-inside">
            {assessmentLine ? <li className="text-on-surface">{assessmentLine}</li> : null}
            {scheduleLine ? <li className="text-on-surface">{scheduleLine}</li> : null}
            {metrics.payment_methods_note?.trim() ? (
              <li>
                <span className="font-semibold text-on-surface">Payment methods: </span>
                {metrics.payment_methods_note.trim()}
              </li>
            ) : null}
            {metrics.late_fee_policy_note?.trim() ? (
              <li>
                <span className="font-semibold text-on-surface">Late fees: </span>
                {metrics.late_fee_policy_note.trim()}
              </li>
            ) : null}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-on-surface-variant">
          <Link href="/admin/finances?tab=billing" className="font-semibold text-secondary hover:underline">
            Add billing settings
          </Link>{" "}
          (fee, due dates, instructions) to show them here and on the payment page.
        </p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Reserve fund
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-2">
            {formatUsdFromCents(metrics.reserve_fund_cents)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Dashboard display total</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Fiscal period
          </p>
          <p className="text-lg font-headline font-bold text-on-surface mt-2">
            {metrics.fiscal_period_label ?? "—"}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Total units
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-1">{totalUnitsDisplay}</p>
          {metrics.total_units == null ? (
            <p className="text-[11px] text-on-surface-variant mt-1">
              Ledger range 1–{quick.totalUnits} until you set an official count under Billing settings.
            </p>
          ) : null}
        </div>
        <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Units unpaid
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-1">{quick.unitsUnpaid}</p>
        </div>
        <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Revenue collected
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-1">
            {formatUsdFromCents(revenueCollectedDisplayCents)}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-1">
            {quick.collectionsScopedToBillingPeriod
              ? timeZone
                ? `Current billing period (${timeZone}).`
                : "Current billing period (UTC)."
              : "All time — set a standard dues frequency under Billing settings for period totals."}
          </p>
        </div>
        <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Revenue due
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-1">
            {formatUsdFromCents(revenueDueDisplayCents)}
          </p>
          {revenueDueFromBillingCents != null && quick.collectionsScopedToBillingPeriod ? (
            <p className="text-[11px] text-on-surface-variant mt-1">After collections this period.</p>
          ) : revenueDueFromBillingCents != null && metrics.dues_frequency === "custom" ? (
            <p className="text-[11px] text-on-surface-variant mt-1">
              Gross per billing period — pick monthly, quarterly, or annual to show remaining after
              collections.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-headline font-bold text-on-surface">Who&apos;s paid</h2>
          <Link
            href="/admin/finances?tab=units"
            className="text-xs font-semibold text-secondary hover:underline"
          >
            Open units roster
          </Link>
        </div>
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-sm min-w-[36rem]">
            <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Unit</th>
                <th className="px-4 py-3 font-bold">Resident(s)</th>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {whoPaid.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                    No units with profiles are in good standing yet.
                  </td>
                </tr>
              ) : (
                whoPaid.map((r) => (
                  <tr key={r.unit} className="border-t border-outline-variant/10">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.unit}</td>
                    <td className="px-4 py-3 max-w-[14rem] truncate" title={r.residentNames}>
                      {r.residentNames}
                    </td>
                    <td className="px-4 py-3 capitalize text-on-surface-variant">
                      {r.evidenceSource === "stripe" ? "Stripe" : "Manual"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant text-xs">
                      {formatDateTimeInTimezone(new Date(r.evidenceDateMs).toISOString(), timeZone)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatUsdFromCents(r.amountCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-headline font-bold text-on-surface">Outstanding</h2>
          <Link
            href="/admin/finances?tab=payments"
            className="text-xs font-semibold text-secondary hover:underline"
          >
            Payment history
          </Link>
        </div>
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-sm min-w-[28rem]">
            <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Unit</th>
                <th className="px-4 py-3 font-bold">Resident(s)</th>
                <th className="px-4 py-3 font-bold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant">
                    Every unit with a profile has a paid Stripe or manual HOA record.
                  </td>
                </tr>
              ) : (
                outstanding.map((r) => (
                  <tr key={r.unit} className="border-t border-outline-variant/10">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.unit}</td>
                    <td className="px-4 py-3 max-w-[14rem] truncate" title={r.residentNames}>
                      {r.residentNames}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/finances?tab=payments&unit=${r.unit}`}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        Filter payments
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-on-surface">Recent payments</h2>
        <p className="text-xs text-on-surface-variant">
          Merged: Stripe <span className="lowercase">paid</span> and manual HOA income (by unit), newest first.
        </p>
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Unit</th>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Detail</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mergedRecent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                    No paid Stripe or manual HOA entries yet.
                  </td>
                </tr>
              ) : (
                mergedRecent.map((row) => (
                  <tr key={row.id} className="border-t border-outline-variant/10">
                    <td className="px-4 py-3 capitalize">
                      {row.source === "stripe" ? "Stripe" : "Manual"}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {row.unit != null ? row.unit : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                      {row.source === "stripe" && row.stripe
                        ? formatDateTimeInTimezone(
                            row.stripe.paid_at ?? row.stripe.updated_at,
                            timeZone,
                          )
                        : row.manual
                          ? `${row.manual.occurred_on} · ${formatDateTimeInTimezone(row.manual.created_at, timeZone)}`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs max-w-xs truncate">
                      {row.source === "stripe" && row.stripe
                        ? [row.stripe.payer_first_name, row.stripe.payer_last_name].filter(Boolean).join(" ") ||
                          "—"
                        : row.manual?.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatUsdFromCents(row.amountCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="bg-surface-container-low rounded-xl border border-outline-variant/10 group [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none flex items-start justify-between gap-4 p-6 md:p-8 rounded-xl outline-none hover:bg-surface-container-high/25 focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low transition-colors">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg font-headline font-bold text-on-surface">Manually add transaction</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Expand below to enter date, amount, and account. HOA payments use Kind: Income and feed
              the dashboard chart; unit is the account number (1–{FINANCE_ACCOUNT_NUMBER_MAX}).
            </p>
          </div>
          <span
            className="material-symbols-outlined shrink-0 text-2xl text-on-surface-variant mt-0.5 group-open:rotate-90 transition-transform duration-200"
            aria-hidden
          >
            chevron_right
          </span>
        </summary>
        <div className="space-y-6 px-6 md:px-8 pb-6 md:pb-8 pt-0 border-t border-outline-variant/10">
          <details className="group border border-outline-variant/20 rounded-lg p-4 bg-surface-container-lowest/80">
            <summary className="cursor-pointer text-sm font-semibold text-on-surface list-none flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-on-surface-variant group-open:rotate-90 transition-transform">
                chevron_right
              </span>
              Other ledger entry (expense, transfer, or extra fields)
            </summary>
            <p className="text-xs text-on-surface-variant mt-2 mb-4">
              Includes HOA income (default Kind), other ledger kinds, and optional resident labels.
            </p>
            <form action={addFinanceTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">Kind</label>
                <select
                  name="kind"
                  className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">Date</label>
                <input
                  type="date"
                  name="occurred_on"
                  defaultValue={today}
                  className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Account number
                </label>
                <select
                  name="category"
                  className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                  defaultValue="1"
                  required
                >
                  {Array.from({ length: FINANCE_ACCOUNT_NUMBER_MAX }, (_, i) => {
                    const n = i + 1;
                    return (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Amount (USD)
                </label>
                <input
                  name="amount_dollars"
                  placeholder="1200.00"
                  className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                  required
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                    Resident unit label (optional)
                  </label>
                  <input
                    name="unit_no"
                    className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                    placeholder="e.g. 12B"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                    Resident first name (optional)
                  </label>
                  <input
                    name="customer_first_name"
                    className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                    Resident last name (optional)
                  </label>
                  <input
                    name="customer_last_name"
                    className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Description
                </label>
                <input
                  name="description"
                  required
                  className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
                  placeholder="Short memo"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold"
                >
                  Save entry
                </button>
              </div>
            </form>
          </details>
        </div>
      </details>

      <section className="space-y-4">
        <h2 className="text-lg font-headline font-bold text-on-surface">Manual HOA analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Total manual HOA (all time)
            </p>
            <p className="text-xl font-headline font-bold text-on-surface mt-1">
              {formatUsdFromCents(manualHoaTotalCents)}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">{manualHoaCount} entries</p>
          </div>
          <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Last 6 months (by occurred date)
            </p>
            <div className="mt-3 flex items-end gap-1 h-28 border-b border-outline-variant/15 pb-0">
              {manualHoaLast6Months.map((b) => {
                const hPx =
                  maxMonthCents <= 0
                    ? 0
                    : Math.max(4, Math.round((b.cents / maxMonthCents) * barMaxPx));
                return (
                  <div
                    key={b.key}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0 justify-end h-full"
                  >
                    <div
                      className="w-full rounded-t bg-secondary/80"
                      style={{ height: hPx }}
                      title={`${b.label}: ${formatUsdFromCents(b.cents)}`}
                    />
                    <span className="text-[9px] text-on-surface-variant truncate w-full text-center">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Recent manual entries</h2>
        {listError ? (
          <p className="text-sm text-error mb-2" role="alert">
            {listError}
          </p>
        ) : null}
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Kind</th>
                <th className="px-4 py-3 font-bold">Account #</th>
                <th className="px-4 py-3 font-bold">Resident unit</th>
                <th className="px-4 py-3 font-bold">First name</th>
                <th className="px-4 py-3 font-bold">Last name</th>
                <th className="px-4 py-3 font-bold">Description</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold">Entered by</th>
                {canRemoveLedgerRows ? <th className="px-4 py-3 w-24" /> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={tableColCount} className="px-4 py-8 text-center text-on-surface-variant">
                    No transactions yet. Add an HOA payment above to populate the dashboard chart.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-high/40"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{row.occurred_on}</td>
                    <td className="px-4 py-3 capitalize">{ledgerKindLabel(row.kind)}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.unit_no?.trim() || "—"}</td>
                    <td className="px-4 py-3 max-w-[8rem] truncate" title={row.customer_first_name ?? undefined}>
                      {row.customer_first_name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[8rem] truncate" title={row.customer_last_name ?? undefined}>
                      {row.customer_last_name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{row.description}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.kind === "expense" ? "−" : row.kind === "income" ? "+" : ""}
                      {formatUsdFromCents(row.amount_cents)}
                    </td>
                    <td
                      className="px-4 py-3 text-on-surface-variant max-w-[10rem] truncate"
                      title={row.entered_by_name ?? undefined}
                    >
                      {row.entered_by_name?.trim() || "—"}
                    </td>
                    {canRemoveLedgerRows ? (
                      <td className="px-4 py-3">
                        <form action={deleteFinanceTransaction.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-error hover:underline"
                            aria-label="Remove transaction"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="size-3.5 shrink-0"
                              aria-hidden
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            Remove
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
