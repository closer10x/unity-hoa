"use client";

import Link from "next/link";
import { useState } from "react";

import type { WorkOrderStats } from "@/app/admin/(dashboard)/maintenance/actions";
import type { WorkOrderListItem, WorkOrderStatus } from "@/lib/types/maintenance";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/types/maintenance";

import { CreateWorkOrderModal } from "./create-work-order-modal";

type EmployeeOpt = { id: string; name: string };

type Props = {
  stats: WorkOrderStats | null;
  items: WorkOrderListItem[];
  employees: EmployeeOpt[];
  filterStatus: WorkOrderStatus | "all";
  listError: string | null;
};

const FILTER_CHIPS: { label: string; value: WorkOrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Assigned", value: "assigned" },
  { label: "In progress", value: "in_progress" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

function badgeClass(priority: string): string {
  if (priority === "urgent") return "bg-error-container text-error";
  if (priority === "high") return "bg-tertiary-fixed text-on-tertiary-fixed";
  return "bg-surface-container-highest text-on-surface-variant";
}

function statusPill(status: string): string {
  if (status === "completed") return "bg-secondary-container text-on-secondary-container";
  if (status === "cancelled") return "bg-surface-container-highest text-on-surface-variant";
  if (status === "in_progress") return "bg-primary-container text-on-primary";
  if (status === "pending") return "bg-tertiary-fixed-dim text-on-surface";
  if (status === "assigned") return "bg-secondary text-on-secondary";
  return "bg-error-container text-error";
}

export function MaintenanceDashboard({
  stats,
  items,
  employees,
  filterStatus,
  listError,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const by = stats?.byStatus ?? {};

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-1">
            Maintenance
          </h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Work orders, assignments, and photo documentation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/maintenance/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-highest text-on-surface text-sm font-semibold border border-outline-variant/20 hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            Full form
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold shadow-md shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New work order
          </button>
        </div>
      </div>

      {stats ? (
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
            <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
              Total jobs
            </p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-1">
              {stats.total}
            </p>
          </div>
          {(
            [
              "open",
              "assigned",
              "in_progress",
              "pending",
              "completed",
            ] as const
          ).map((k) => (
            <div
              key={k}
              className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                {STATUS_LABELS[k]}
              </p>
              <p className="text-2xl font-headline font-bold text-on-surface mt-1">
                {by[k] ?? 0}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="bg-surface-container-low rounded-xl p-5 md:p-6 border border-outline-variant/10">
        <div className="mb-5 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-4">
          <div className="flex min-w-0 flex-col gap-0.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-3">
            <h2 className="text-lg md:text-xl font-headline font-bold text-on-surface shrink-0">
              Queue
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant min-[520px]:border-l min-[520px]:border-outline-variant/25 min-[520px]:pl-3 leading-snug">
              Pick a status, then open a work order for details.
            </p>
          </div>
          <nav
            className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 min-[520px]:mx-0 min-[520px]:px-0 min-[520px]:pb-0 min-[520px]:justify-end min-[520px]:overflow-visible [scrollbar-width:thin]"
            aria-label="Filter work orders by status"
          >
            {FILTER_CHIPS.map(({ label, value }) => {
              const href =
                value === "all"
                  ? "/admin/maintenance"
                  : `/admin/maintenance?status=${value}`;
              const active = filterStatus === value;
              return (
                <Link
                  key={value}
                  href={href}
                  scroll={false}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-secondary text-on-secondary shadow-sm"
                      : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {listError ? (
          <p
            className="text-sm text-error mb-4 rounded-lg bg-error/10 px-3 py-2 border border-error/20"
            role="alert"
          >
            {listError}
          </p>
        ) : null}

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">
              No work orders match this filter.
            </p>
          ) : (
            items.map((row) => (
              <Link
                key={row.id}
                href={`/admin/maintenance/${row.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-container-lowest p-4 rounded-lg border border-transparent hover:border-outline-variant/20 hover:bg-surface-container-high/80 transition-all"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${badgeClass(row.priority)}`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      engineering
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface truncate">
                      {row.work_order_number}{" "}
                      <span className="font-medium text-on-surface-variant">
                        · {row.title}
                      </span>
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {row.location || "No location"}
                      {row.assignee_name ? ` · ${row.assignee_name}` : " · Unassigned"}
                      {row.attachment_count > 0
                        ? ` · ${row.attachment_count} photo${row.attachment_count === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass(row.priority)}`}
                  >
                    {PRIORITY_LABELS[row.priority]}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusPill(row.status)}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    chevron_right
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <CreateWorkOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        employees={employees}
      />
    </div>
  );
}
