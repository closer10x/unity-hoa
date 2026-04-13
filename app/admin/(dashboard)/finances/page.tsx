import type { Metadata } from "next";

import { getDashboardMetrics } from "@/app/admin/(dashboard)/hoa/actions";
import { listFinanceTransactions } from "@/app/admin/(dashboard)/finances/actions";
import {
  getCommunityTimezone,
  listAllResidentPaymentsForUnits,
  listProfilesForUnitDirectory,
  listResidentPaymentsAdmin,
} from "@/app/admin/(dashboard)/finances/payments-queries";
import { FinanceAdminTabs, type FinanceAdminTabId } from "@/components/portal/finance/finance-admin-tabs";
import { FinanceSummaryTab } from "@/components/portal/finance/finance-summary-tab";
import { HoaBillingSettingsTab } from "@/components/portal/finance/hoa-billing-settings-tab";
import { HoaPaymentsTab } from "@/components/portal/finance/hoa-payments-tab";
import { UnitsRosterTab } from "@/components/portal/finance/units-roster-tab";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { DEFAULT_HOA_METRICS } from "@/lib/constants/dashboard-defaults";
import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { buildFinanceAdminSummary } from "@/lib/finance/summarize-finance-admin";
import { buildUnitRoster } from "@/lib/payments/build-unit-roster";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { ResidentPaymentStatus } from "@/lib/types/resident-payments-admin";

export const metadata: Metadata = {
  title: "Finances",
};

export const dynamic = "force-dynamic";

const PAYMENT_STATUSES: ResidentPaymentStatus[] = [
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "canceled",
];

function parseTab(raw: string | undefined): FinanceAdminTabId {
  if (raw === "stripe" || raw === "billing") return "billing";
  if (raw === "payments" || raw === "units") return raw;
  if (raw === "summary" || raw === "ledger") return "summary";
  return "summary";
}

function parsePaymentStatus(raw: string | undefined): ResidentPaymentStatus | "all" {
  if (raw && (PAYMENT_STATUSES as readonly string[]).includes(raw)) {
    return raw as ResidentPaymentStatus;
  }
  return "all";
}

function parseUnitFilter(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > FINANCE_ACCOUNT_NUMBER_MAX) return null;
  return n;
}

function firstString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

type PageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
    status?: string | string[];
    q?: string | string[];
    unit?: string | string[];
  }>;
};

export default async function AdminFinancesPage({ searchParams }: PageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const session = await requireAdminUser();
  const canRemoveLedgerRows = session.profile.role === "admin";

  const sp = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const tab = parseTab(firstString(sp.tab));
  const statusFilter = parsePaymentStatus(firstString(sp.status));
  const searchQuery = firstString(sp.q).replace(/,/g, " ").trim();
  const unitFilter = parseUnitFilter(firstString(sp.unit));

  const today = new Date().toISOString().slice(0, 10);

  if (tab === "summary") {
    const [txRes, metricsRaw, profRes, payRes, timeZone] = await Promise.all([
      listFinanceTransactions(),
      getDashboardMetrics(),
      listProfilesForUnitDirectory(),
      listAllResidentPaymentsForUnits(),
      getCommunityTimezone(),
    ]);
    const metrics = metricsRaw ?? DEFAULT_HOA_METRICS;
    const items = "error" in txRes ? [] : txRes.items;
    const listError = "error" in txRes ? txRes.error : null;
    const profiles = "error" in profRes ? [] : profRes.items;
    const payments = "error" in payRes ? [] : payRes.items;
    const rosterError =
      "error" in profRes ? profRes.error : "error" in payRes ? payRes.error : null;
    const roster = buildUnitRoster(profiles, payments);
    const summaryNow = new Date();
    const summary = buildFinanceAdminSummary(roster, items, FINANCE_ACCOUNT_NUMBER_MAX, {
      duesFrequency: metrics.dues_frequency,
      timeZone,
      referenceNow: summaryNow,
    });

    return (
      <div className="p-8 space-y-8 max-w-6xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-headline font-bold text-on-surface">Finances</h1>
          <FinanceAdminTabs active={tab} />
        </div>
        {rosterError ? (
          <p className="text-sm text-error" role="alert">
            {rosterError}
          </p>
        ) : null}
        <FinanceSummaryTab
          metrics={metrics}
          items={items}
          listError={listError}
          canRemoveLedgerRows={canRemoveLedgerRows}
          today={today}
          timeZone={timeZone}
          quick={summary.quick}
          whoPaid={summary.whoPaid}
          outstanding={summary.outstanding}
          mergedRecent={summary.mergedRecent}
          manualHoaTotalCents={summary.manualHoaTotalCents}
          manualHoaCount={summary.manualHoaCount}
          manualHoaLast6Months={summary.manualHoaLast6Months}
        />
      </div>
    );
  }

  if (tab === "payments") {
    const [payRes, timeZone] = await Promise.all([
      listResidentPaymentsAdmin({
        status: statusFilter,
        search: searchQuery,
        unitIndex: unitFilter,
      }),
      getCommunityTimezone(),
    ]);
    const payItems = "error" in payRes ? [] : payRes.items;
    const payError = "error" in payRes ? payRes.error : null;

    return (
      <div className="p-8 space-y-8 max-w-6xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-headline font-bold text-on-surface">Finances</h1>
          <FinanceAdminTabs active={tab} />
        </div>
        <HoaPaymentsTab
          items={payItems}
          listError={payError}
          timeZone={timeZone}
          statusFilter={statusFilter}
          searchDefault={searchQuery}
          unitFilter={unitFilter}
        />
      </div>
    );
  }

  if (tab === "units") {
    const [profRes, payRes, timeZone] = await Promise.all([
      listProfilesForUnitDirectory(),
      listAllResidentPaymentsForUnits(),
      getCommunityTimezone(),
    ]);
    const profiles = "error" in profRes ? [] : profRes.items;
    const payments = "error" in payRes ? [] : payRes.items;
    const profError = "error" in profRes ? profRes.error : null;
    const payError = "error" in payRes ? payRes.error : null;
    const roster = buildUnitRoster(profiles, payments);

    return (
      <div className="p-8 space-y-8 max-w-6xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-headline font-bold text-on-surface">Finances</h1>
          <FinanceAdminTabs active={tab} />
        </div>
        {profError || payError ? (
          <p className="text-sm text-error" role="alert">
            {[profError, payError].filter(Boolean).join(" ")}
          </p>
        ) : null}
        <UnitsRosterTab roster={roster} timeZone={timeZone} />
      </div>
    );
  }

  const metricsRaw = await getDashboardMetrics();
  const billingMetrics = metricsRaw ?? DEFAULT_HOA_METRICS;

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div className="space-y-4">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Finances</h1>
        <FinanceAdminTabs active={tab} />
      </div>
      <HoaBillingSettingsTab metrics={billingMetrics} />
    </div>
  );
}
