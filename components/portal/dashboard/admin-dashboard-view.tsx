import Image from "next/image";
import Link from "next/link";

import type { FinanceMonthBucket } from "@/app/admin/(dashboard)/hoa/actions";
import { formatAssessmentLine, formatDuesScheduleLine } from "@/lib/community/billing-display";
import { formatUsdCompactFromCents, formatUsdFromCents } from "@/lib/format/money";
import type { AnnouncementRow } from "@/lib/types/community";
import type { HoaDashboardMetricsRow } from "@/lib/types/community";
import type { WorkOrderCategory, WorkOrderListItem } from "@/lib/types/maintenance";
import { STATUS_LABELS } from "@/lib/types/maintenance";

const FALLBACK_ANN_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBUlB4MMDo1mqSqRSteQ5WSviS1OOkNuD0N1ryLndB9dcqU5dSIfgkQIwjJ1a13gz6fLClNsG5lx9-qNGfMJrF2xal90QxTCRa3OApXiTZSceF1hPfeQjtBbPe-JxOmD1x92aBxZwjaTHkQjvWTM44_MFz5F--4mUOI1zc9fhfBD_M380oi0mh-1MMRajg3VN0iXDmN8MAmq6h8KO5oi3sjNFovGcJsh0q8ve_2jJ5_kdaDkAaWPt9HovPojDkitM2gguVVOmCyZjEL";

const WO_ICON: Record<WorkOrderCategory, string> = {
  plumbing: "plumbing",
  electrical: "electrical_services",
  hvac: "thermostat",
  grounds: "yard",
  security: "security",
  other: "engineering",
};

type MaintenanceSummary = {
  openPipeline: number;
  urgentOpen: number;
  completedTotal: number;
};

type Props = {
  metrics: HoaDashboardMetricsRow;
  maintenance: MaintenanceSummary | null;
  queueItems: WorkOrderListItem[];
  announcements: AnnouncementRow[];
  chart: FinanceMonthBucket[];
  supabaseReady: boolean;
};

function statusBadgeClass(status: string): string {
  if (status === "completed") return "bg-secondary-container text-on-secondary-container";
  if (status === "cancelled") return "bg-surface-container-highest text-on-surface-variant";
  if (status === "in_progress") return "bg-primary-container text-on-primary";
  if (status === "pending") return "bg-tertiary-fixed-dim text-on-surface";
  if (status === "assigned") return "bg-secondary text-on-secondary";
  return "bg-error-container text-error";
}

export function AdminDashboardView({
  metrics,
  maintenance,
  queueItems,
  announcements,
  chart,
  supabaseReady,
}: Props) {
  const growth = metrics.resident_growth_pct;
  const pulse =
    metrics.pulse_note?.trim() ||
    `Resident satisfaction is currently at ${metrics.satisfaction_pct}%. The highest rated area this month was "Grounds Maintenance".`;
  const billingAssessment = formatAssessmentLine(metrics);
  const billingSchedule = formatDuesScheduleLine(metrics);

  const maxAbs = Math.max(...chart.map((c) => Math.abs(c.netCents)), 1);

  return (
    <div className="p-8 flex-1 space-y-12">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-secondary min-h-[160px]">
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.1em] font-semibold">
              Total Residents
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {metrics.total_residents.toLocaleString()}
              </span>
              {growth != null ? (
                <span className="text-tertiary-fixed-dim text-sm font-medium flex items-center">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span>
                  {growth}%
                </span>
              ) : null}
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Active across community</p>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-primary min-h-[160px]">
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.1em] font-semibold">
              Outstanding Dues
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {formatUsdFromCents(metrics.outstanding_dues_cents)}
              </span>
              <span className="text-error text-sm font-medium flex items-center">
                <span className="material-symbols-outlined text-xs">priority_high</span>
                {metrics.overdue_accounts} overdue
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              {metrics.fiscal_period_label ?? "Current fiscal period"}
            </p>
            {billingAssessment != null || billingSchedule != null ? (
              <p className="text-xs text-on-surface mt-2 pt-2 border-t border-outline-variant/10 leading-relaxed">
                {[billingAssessment, billingSchedule].filter(Boolean).join(" · ")}
                <span className="block text-on-surface-variant mt-1">
                  <Link href="/admin/finances?tab=billing" className="font-semibold text-secondary hover:underline">
                    Edit billing settings
                  </Link>
                </span>
              </p>
            ) : null}
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-tertiary-fixed-dim min-h-[160px]">
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.1em] font-semibold">
              Open Maintenance
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {maintenance ? maintenance.openPipeline : "—"}
              </span>
              <span className="text-secondary text-sm font-medium flex items-center">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                {maintenance
                  ? `${maintenance.completedTotal} completed`
                  : supabaseReady
                    ? "0 completed"
                    : "Connect Supabase"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              {maintenance
                ? `Urgent in pipeline: ${maintenance.urgentOpen}`
                : supabaseReady
                  ? "Urgent in pipeline: 0"
                  : "Configure env for live counts"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-12">
          <section className="bg-surface-container-low rounded-xl p-8">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-surface">
                  Maintenance Queue
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Latest requests — open a row for details or post a new order.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/maintenance"
                  className="px-4 py-2 bg-surface-container-highest rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  View all
                </Link>
                <Link
                  href="/admin/maintenance/new"
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  New order
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              {!supabaseReady ? (
                <p className="text-sm text-on-surface-variant py-4">
                  Connect Supabase to load live work orders.
                </p>
              ) : queueItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4">
                  No work orders yet.{" "}
                  <Link href="/admin/maintenance/new" className="text-secondary font-semibold">
                    Create the first one
                  </Link>
                  .
                </p>
              ) : (
                queueItems.map((row) => (
                  <Link
                    key={row.id}
                    href={`/admin/maintenance/${row.id}`}
                    className="bg-surface-container-lowest p-6 rounded-lg flex items-center justify-between hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-6 min-w-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-secondary-container text-secondary">
                        <span className="material-symbols-outlined">
                          {WO_ICON[row.category]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-on-surface truncate">{row.title}</h4>
                        <p className="text-xs text-on-surface-variant">
                          {row.work_order_number} · {row.location || "No location"} ·{" "}
                          {row.assignee_name ?? "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider hidden sm:block ${statusBadgeClass(row.status)}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant">
                        chevron_right
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-surface">
                  Manage Announcements
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Broadcast updates to all community screens
                </p>
              </div>
              <Link
                href="/admin/announcements"
                className="text-secondary font-semibold flex items-center gap-1 hover:underline text-sm"
              >
                <span>View all</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {announcements.slice(0, 1).map((a) => (
                <div
                  key={a.id}
                  className="bg-surface-container-lowest p-1 rounded-xl shadow-sm border border-outline-variant/10"
                >
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-pasted arbitrary URLs
                    <img
                      className="w-full h-40 object-cover rounded-t-xl"
                      alt=""
                      src={a.image_url}
                    />
                  ) : (
                    <div className="w-full h-40 rounded-t-xl bg-surface-container-high flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                        campaign
                      </span>
                    </div>
                  )}
                  <div className="p-6">
                    <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded text-[10px] font-bold uppercase mb-2 inline-block">
                      Published
                    </span>
                    <h5 className="font-bold text-on-surface mb-2">{a.title}</h5>
                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      {a.body ?? "No body text"}
                    </p>
                    <div className="mt-4 flex justify-end items-center">
                      <Link
                        href={`/admin/announcements/${a.id}/edit`}
                        className="text-xs font-bold text-secondary"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 ? (
                <div className="bg-surface-container-lowest p-1 rounded-xl shadow-sm border border-outline-variant/10">
                  <Image
                    className="w-full h-40 object-cover rounded-t-xl"
                    alt=""
                    src={FALLBACK_ANN_IMG}
                    width={800}
                    height={160}
                  />
                  <div className="p-6">
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] font-bold uppercase mb-2 inline-block">
                      Sample
                    </span>
                    <h5 className="font-bold text-on-surface mb-2">Annual General Meeting 2024</h5>
                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      Publish announcements in Supabase to replace this placeholder.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 border-dashed flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-4">
                  <span className="material-symbols-outlined">add_photo_alternate</span>
                </div>
                <p className="text-sm font-bold text-on-surface">Create New Broadcast</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Schedule a new announcement for the community
                </p>
                <Link
                  href="/admin/announcements/new"
                  className="mt-4 px-6 py-2 bg-primary text-white rounded-lg text-xs font-semibold"
                >
                  Start Draft
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-12">
          <section className="bg-primary text-white p-8 rounded-xl shadow-2xl relative overflow-hidden min-h-[400px]">
            <div className="relative z-10">
              <h2 className="text-xl font-headline font-bold text-primary-fixed">
                Financial Oversight
              </h2>
              <p className="text-xs text-on-primary-container">Total Community Funds</p>
              <div className="mt-8">
                <span className="text-4xl font-headline font-extrabold">
                  {formatUsdCompactFromCents(metrics.reserve_fund_cents)}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-tertiary-fixed text-sm">
                    trending_up
                  </span>
                  <span className="text-[10px] text-tertiary-fixed font-bold uppercase">
                    Reserve Fund Strong
                  </span>
                </div>
              </div>
              <div className="mt-10 h-40 flex items-end gap-3 px-2">
                {chart.map((c) => {
                  const h = Math.round((Math.abs(c.netCents) / maxAbs) * 100);
                  const barBg =
                    c.netCents > 0
                      ? "bg-secondary-fixed-dim"
                      : c.netCents < 0
                        ? "bg-red-300/90"
                        : "bg-primary-container";
                  return (
                    <div key={c.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className={`w-full rounded-t-sm ${barBg}`}
                        style={{ height: `${Math.max(h, 6)}%` }}
                        title={`${c.label}: ${formatUsdFromCents(c.netCents)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-on-primary-container uppercase font-bold px-2">
                {chart.map((c) => (
                  <span key={c.key}>{c.label}</span>
                ))}
              </div>
              <Link
                href="/admin/finances"
                className="block w-full mt-10 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-sm font-semibold transition-colors text-center"
              >
                Detailed Financial Report
              </Link>
            </div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary rounded-full blur-[100px] opacity-20" />
          </section>

          <section className="bg-white/40 backdrop-blur-xl p-8 rounded-xl border border-white/40 shadow-sm">
            <h3 className="text-lg font-headline font-bold text-on-surface mb-6">
              Administrative Tools
            </h3>
            <div className="space-y-3">
              {[
                ["/admin/finances", "receipt_long", "Finances"],
                ["/admin/settings/employees", "group_add", "Team & assignments"],
                ["/admin/events/new", "event_available", "Post community event"],
              ].map(([href, icon, label]) => (
                <Link
                  key={label}
                  href={href as string}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center gap-3 text-secondary">
                    <span className="material-symbols-outlined">{icon}</span>
                    <span className="text-sm font-semibold text-on-surface">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-tertiary-fixed p-8 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-on-tertiary-fixed">
                sentiment_satisfied
              </span>
              <h3 className="text-lg font-headline font-bold text-on-tertiary-fixed">
                Community Pulse
              </h3>
            </div>
            <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed">{pulse}</p>
            <div className="mt-6 w-full h-2 bg-on-tertiary-fixed/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-on-tertiary-fixed"
                style={{ width: `${metrics.satisfaction_pct}%` }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
