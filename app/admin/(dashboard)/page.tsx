import type { Metadata } from "next";

import { getDashboardMetrics } from "@/app/admin/(dashboard)/hoa/actions";
import { listAllEventsForAdmin } from "@/app/admin/(dashboard)/events/actions";
import {
  getMaintenanceDashboardSummary,
  listWorkOrders,
} from "@/app/admin/(dashboard)/maintenance/actions";
import {
  AdminDashboard,
  type CalendarItem,
  type CollectionRow,
  type Kpi,
  type QueueItem,
} from "@/components/portal/dashboard/admin-dashboard";
import { DEFAULT_HOA_METRICS } from "@/lib/constants/dashboard-defaults";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function daysOpen(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.max(0, Math.floor(ms / 86_400_000));
  return `${d}d open`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const ready = isSupabaseConfigured();

  const metrics = ready ? await getDashboardMetrics() : null;
  const m = metrics ?? DEFAULT_HOA_METRICS;
  const maintenance = ready ? await getMaintenanceDashboardSummary() : null;
  const workOrdersRes = ready ? await listWorkOrders() : null;
  const workOrders =
    workOrdersRes && "items" in workOrdersRes ? workOrdersRes.items : [];

  const eventsRes = ready ? await listAllEventsForAdmin() : null;
  const events = eventsRes && "items" in eventsRes ? eventsRes.items : [];

  const doors = m.total_units ?? m.total_residents ?? 0;
  const delinquencyPct =
    doors > 0 ? ((m.overdue_accounts / doors) * 100).toFixed(1) : null;

  const kpis: Kpi[] = [
    {
      label: "Receivables",
      value: usd(m.outstanding_dues_cents),
      note: `${m.overdue_accounts} account${
        m.overdue_accounts === 1 ? "" : "s"
      } carrying a balance`,
    },
    {
      label: "Open work orders",
      value: String(maintenance?.openPipeline ?? 0),
      note: `${maintenance?.urgentOpen ?? 0} marked urgent`,
    },
    {
      // Architectural review is specified in the handoff but not yet built.
      label: "Pending architectural",
      value: "Not tracked",
      note: "Architectural review is not built yet",
      untracked: true,
    },
    {
      label: "Delinquency rate",
      value: delinquencyPct ? `${delinquencyPct}%` : "Not tracked",
      note: delinquencyPct
        ? `${m.overdue_accounts} of ${doors} doors`
        : "Needs a door count to compute",
      untracked: !delinquencyPct,
    },
  ];

  // Prioritized action queue — urgent and unassigned work first.
  const queue: QueueItem[] = workOrders
    .filter((w) =>
      ["open", "assigned", "in_progress", "pending"].includes(w.status),
    )
    .sort((a, b) => {
      const rank = (s: string) => (s === "urgent" ? 0 : s === "high" ? 1 : 2);
      return rank(a.priority) - rank(b.priority);
    })
    .slice(0, 6)
    .map((w) => ({
      kind: "Work order",
      title: w.title,
      detail: w.assignee_name
        ? `Assigned to ${w.assignee_name}`
        : "Unassigned",
      age: daysOpen(w.created_at),
      href: `/admin/maintenance/${w.id}`,
    }));

  const calendar: CalendarItem[] = events.slice(0, 5).map((e) => ({
    date: shortDate(e.starts_at ?? null),
    title: e.title,
    detail: e.location ?? "No location set",
  }));

  // Per-community collections needs a communities table; there is one
  // community today, so this reports the single scope rather than inventing a
  // breakdown.
  const collections: CollectionRow[] = doors
    ? [
        {
          name: m.fiscal_period_label ?? "Current period",
          rate: delinquencyPct ? `${(100 - Number(delinquencyPct)).toFixed(1)}%` : "—",
          pct: delinquencyPct ? 100 - Number(delinquencyPct) : 0,
          detail: `${usd(m.outstanding_dues_cents)} outstanding · ${
            m.overdue_accounts
          } accounts`,
        },
      ]
    : [];

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1520px]">
        {!ready ? (
          <p className="mb-6 rounded-xl border border-outline-variant bg-secondary-container px-5 py-4 text-sm text-on-secondary-container">
            Supabase is not configured, so these figures are defaults. Add your
            keys to <code className="font-label">.env.local</code> to see live
            data.
          </p>
        ) : null}

        <AdminDashboard
          scopeLabel="All communities"
          summary={`${doors} doors · ${m.overdue_accounts} accounts carrying a balance`}
          kpis={kpis}
          queue={queue}
          collections={collections}
          calendar={calendar}
        />
      </div>
    </div>
  );
}
