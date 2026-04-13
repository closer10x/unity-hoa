import type { Metadata } from "next";
import Link from "next/link";

import { getDashboardMetrics, updateDashboardMetrics } from "@/app/admin/(dashboard)/hoa/actions";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { DEFAULT_HOA_METRICS } from "@/lib/constants/dashboard-defaults";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Community settings",
};

export const dynamic = "force-dynamic";

export default async function CommunitySettingsPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfigured />;
  }

  const raw = await getDashboardMetrics();
  const m = raw ?? DEFAULT_HOA_METRICS;

  const outstandingDollars = (m.outstanding_dues_cents / 100).toFixed(2);
  const reserveDollars = (m.reserve_fund_cents / 100).toFixed(2);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link
          href="/admin/settings"
          className="text-sm font-semibold text-secondary hover:underline inline-flex items-center gap-1 mb-4"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          All settings
        </Link>
        <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Community profile</h1>
        <p className="text-sm text-on-surface-variant">
          These values power the admin dashboard headline cards and community pulse. Manual finance
          entries are managed on the Finances page. HOA fee, due dates, unit count, and payment
          instructions are under{" "}
          <Link href="/admin/finances?tab=billing" className="font-semibold text-secondary hover:underline">
            Finances → Billing settings
          </Link>
          .
        </p>
      </div>

      <form action={updateDashboardMetrics} className="space-y-4 bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              Total residents
            </label>
            <input
              name="total_residents"
              type="number"
              min={0}
              defaultValue={m.total_residents}
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              Resident growth % (optional)
            </label>
            <input
              name="resident_growth_pct"
              type="number"
              step="0.1"
              defaultValue={m.resident_growth_pct ?? ""}
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
              placeholder="12"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              Outstanding dues (USD)
            </label>
            <input
              name="outstanding_dues_dollars"
              defaultValue={outstandingDollars}
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              Overdue accounts
            </label>
            <input
              name="overdue_accounts"
              type="number"
              min={0}
              defaultValue={m.overdue_accounts}
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Fiscal period label
          </label>
          <input
            name="fiscal_period_label"
            defaultValue={m.fiscal_period_label ?? ""}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
            placeholder="Fiscal Year 2024-Q3"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Reserve fund (USD)
          </label>
          <input
            name="reserve_fund_dollars"
            defaultValue={reserveDollars}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Satisfaction % (0–100)
          </label>
          <input
            name="satisfaction_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={m.satisfaction_pct}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Community pulse note
          </label>
          <textarea
            name="pulse_note"
            rows={3}
            defaultValue={m.pulse_note ?? ""}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
            placeholder="Short narrative for the dashboard pulse card"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold"
          >
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
