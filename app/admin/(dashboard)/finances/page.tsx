import type { Metadata } from "next";
import Link from "next/link";

import { getDashboardMetrics } from "@/app/admin/(dashboard)/hoa/actions";
import { addFinanceTransaction, deleteFinanceTransaction, listFinanceTransactions } from "@/app/admin/(dashboard)/finances/actions";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { DEFAULT_HOA_METRICS } from "@/lib/constants/dashboard-defaults";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { formatUsdFromCents } from "@/lib/format/money";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Finances",
};

export const dynamic = "force-dynamic";

export default async function AdminFinancesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const session = await requireAdminUser();
  const canRemoveLedgerRows = session.profile.role === "admin";

  const [txRes, metricsRaw] = await Promise.all([
    listFinanceTransactions(),
    getDashboardMetrics(),
  ]);

  const metrics = metricsRaw ?? DEFAULT_HOA_METRICS;
  const items = "error" in txRes ? [] : txRes.items;
  const listError = "error" in txRes ? txRes.error : null;

  const today = new Date().toISOString().slice(0, 10);
  const ledgerColCount = canRemoveLedgerRows ? 7 : 6;

  return (
    <div className="p-8 space-y-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Finances</h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Ledger entries power the dashboard chart. Community headline numbers are edited under
            Settings.
          </p>
        </div>
        <Link
          href="/admin/settings/community"
          className="text-sm font-semibold text-secondary hover:underline"
        >
          Edit headline metrics
        </Link>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Outstanding dues
          </p>
          <p className="text-2xl font-headline font-bold text-on-surface mt-2">
            {formatUsdFromCents(metrics.outstanding_dues_cents)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {metrics.overdue_accounts} overdue accounts
          </p>
        </div>
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

      <section className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Add transaction</h2>
        <form action={addFinanceTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Recent ledger</h2>
        {listError ? (
          <p className="text-sm text-error" role="alert">
            {listError}
          </p>
        ) : null}
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Kind</th>
                <th className="px-4 py-3 font-bold">Account #</th>
                <th className="px-4 py-3 font-bold">Description</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold">Entered by</th>
                {canRemoveLedgerRows ? <th className="px-4 py-3 w-24" /> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={ledgerColCount} className="px-4 py-8 text-center text-on-surface-variant">
                    No transactions yet. Add one above to populate the dashboard chart.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-high/40"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{row.occurred_on}</td>
                    <td className="px-4 py-3 capitalize">{row.kind}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{row.description}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.kind === "expense" ? "−" : row.kind === "income" ? "+" : ""}
                      {formatUsdFromCents(row.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-[10rem] truncate" title={row.entered_by_name ?? undefined}>
                      {row.entered_by_name?.trim() || "—"}
                    </td>
                    {canRemoveLedgerRows ? (
                      <td className="px-4 py-3">
                        <form action={deleteFinanceTransaction.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="text-xs font-semibold text-error hover:underline"
                          >
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
    </div>
  );
}
