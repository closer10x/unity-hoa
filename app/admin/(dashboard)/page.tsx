import type { Metadata } from "next";

import { listPublishedAnnouncements } from "@/app/admin/(dashboard)/announcements/actions";
import { getFinanceChartBuckets, getDashboardMetrics } from "@/app/admin/(dashboard)/hoa/actions";
import { getMaintenanceDashboardSummary, listWorkOrders } from "@/app/admin/(dashboard)/maintenance/actions";
import { AdminDashboardView } from "@/components/portal/dashboard/admin-dashboard-view";
import { DEFAULT_HOA_METRICS } from "@/lib/constants/dashboard-defaults";
import type { AnnouncementRow } from "@/lib/types/community";
import type { WorkOrderListItem } from "@/lib/types/maintenance";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabaseReady = isSupabaseConfigured();

  const [metricsRaw, maintenance, queueRes, annRes, chart] = await Promise.all([
    supabaseReady ? getDashboardMetrics() : Promise.resolve(null),
    supabaseReady ? getMaintenanceDashboardSummary() : Promise.resolve(null),
    supabaseReady
      ? listWorkOrders({ limit: 5 })
      : Promise.resolve({ items: [] as WorkOrderListItem[] }),
    supabaseReady
      ? listPublishedAnnouncements(4)
      : Promise.resolve({ items: [] as AnnouncementRow[] }),
    getFinanceChartBuckets(6),
  ]);

  const metrics = metricsRaw ?? DEFAULT_HOA_METRICS;
  const queueItems = "error" in queueRes ? [] : queueRes.items;
  const announcements = "error" in annRes ? [] : annRes.items;

  return (
    <>
      <AdminDashboardView
        metrics={metrics}
        maintenance={maintenance}
        queueItems={queueItems}
        announcements={announcements}
        chart={chart}
        supabaseReady={supabaseReady}
      />

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pt-3 pb-8 bg-white/90 backdrop-blur-lg dark:bg-slate-900/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-slate-100 dark:border-slate-800 rounded-t-3xl">
        <a className="text-teal-700 dark:text-teal-300 flex flex-col items-center gap-1" href="/admin">
          <span className="material-symbols-outlined">home</span>
          <span className="font-[Inter] text-[10px] font-bold uppercase tracking-wider">Home</span>
        </a>
        <a
          className="text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1"
          href="/admin/finances"
        >
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="font-[Inter] text-[10px] font-bold uppercase tracking-wider">Pay</span>
        </a>
        <a
          className="text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1"
          href="/admin/events"
        >
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="font-[Inter] text-[10px] font-bold uppercase tracking-wider">Events</span>
        </a>
        <a
          className="text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1"
          href="/payment"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="font-[Inter] text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </a>
      </nav>
    </>
  );
}
