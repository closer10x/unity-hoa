"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  BTN_PRIMARY,
  CARD,
  DATA_ROW,
  FIELD,
  LABEL,
  ListToolbar,
  SectionHeader,
  TONE,
  ConfirmBar,
} from "@/components/portal/primitives";
import type { WorkOrderStatus } from "@/lib/types/maintenance";

/**
 * Admin → Property → Work orders, per docs/design/handoff.md §4.
 *
 * Unlike the fixture sections, this one is live: rows come from the database
 * and "Take action…" writes a real status change through a server action.
 */

export type WorkOrderView = {
  id: string;
  ref: string;
  title: string;
  detail: string;
  assignee: string | null;
  status: WorkOrderStatus;
  priority: string;
  age: string;
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "New",
  assigned: "Assigned & scheduled",
  in_progress: "In progress",
  pending: "Pending",
  completed: "Closed out",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<WorkOrderStatus, keyof typeof TONE> = {
  open: "neutral",
  assigned: "attention",
  in_progress: "attention",
  pending: "attention",
  completed: "positive",
  cancelled: "critical",
};

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open: ["assigned", "in_progress", "cancelled"],
  assigned: ["open", "in_progress", "completed", "cancelled"],
  in_progress: ["assigned", "pending", "completed", "cancelled"],
  pending: ["in_progress", "completed", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["open"],
};

const CONSEQUENCE: Record<WorkOrderStatus, string> = {
  open: "This returns the order to the new queue and clears its assignment.",
  assigned: "This assigns the order and schedules it. The assignee is notified.",
  in_progress: "This marks work as underway.",
  pending: "This parks the order awaiting parts, access or a vendor.",
  completed:
    "Closing notifies the resident and locks the work order. Due reminders are cleared.",
  cancelled:
    "This cancels the order without completing it. Due reminders are cleared.",
};

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "open" as const, label: "New" },
  { value: "assigned" as const, label: "Assigned" },
  { value: "in_progress" as const, label: "In progress" },
  { value: "pending" as const, label: "Pending" },
  { value: "completed" as const, label: "Closed" },
];

export function WorkOrdersSection({
  rows,
  actingStaff,
  setStatus,
}: {
  rows: WorkOrderView[];
  actingStaff: string;
  /**
   * Omitted in the DEV-ONLY preview, which has no server action to call —
   * functions cannot cross the Server -> Client boundary. Without it the list
   * renders read-only.
   */
  setStatus?: (
    id: string,
    status: WorkOrderStatus,
  ) => Promise<{ ok: true } | { error: string }>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WorkOrderStatus | "all">("all");
  const [assignment, setAssignment] = useState<"all" | "in_house" | "vendor" | "unassigned">("all");
  const [pending, setPending] = useState<{ id: string; next: WorkOrderStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (assignment === "unassigned" && r.assignee) return false;
      if (assignment !== "all" && assignment !== "unassigned" && !r.assignee)
        return false;
      if (!q) return true;
      return [r.ref, r.title, r.detail, r.assignee ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [rows, query, filter, assignment]);

  function apply(id: string, next: WorkOrderStatus) {
    if (!setStatus) {
      setError("Read-only preview — status changes are disabled here.");
      setPending(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setStatus(id, next);
      if ("error" in res) setError(res.error);
      setPending(null);
    });
  }

  return (
    <section>
      <SectionHeader
        group="Property"
        title="Work orders"
        lead="Status changes here write to the database and notify the feed."
      />

      <div className="grid gap-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/maintenance/new" className={`${BTN_PRIMARY} rounded-full`}>
            New work order
          </Link>
        </div>

        <ListToolbar
          query={query}
          onQuery={setQuery}
          placeholder="Reference, title, detail or assignee"
          filters={FILTERS}
          active={filter}
          onFilter={setFilter}
          scope={
            <label className="block w-full">
              <span className={LABEL}>Assignment</span>
              <select
                className={`${FIELD} cursor-pointer appearance-none`}
                value={assignment}
                onChange={(e) =>
                  setAssignment(e.target.value as typeof assignment)
                }
              >
                <option value="all">All assignments</option>
                <option value="in_house">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
          }
        />

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No work orders match these filters.
          </p>
        ) : (
          <div className={`${CARD} overflow-hidden`}>
            {visible.map((r, i) => (
              <div
                key={r.id}
                className={`${DATA_ROW} hover:bg-row-hover ${
                  i > 0 ? "border-t border-hairline-soft" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-label text-xs text-secondary-muted">
                    {r.ref}
                  </p>
                  <p className="mt-1 text-base font-medium text-on-surface">
                    {r.title}
                  </p>
                  <p className="text-sm text-on-surface-variant">{r.detail}</p>
                </div>

                <div className="min-w-0">
                  <p className="font-label text-xs text-outline">Assignee</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {r.assignee ?? "Unassigned"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="font-label text-xs text-outline">Priority</p>
                  <p className="mt-1 font-label text-xs text-status-neutral">
                    {r.priority}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className={`font-label text-xs ${TONE[STATUS_TONE[r.status]]}`}>
                    {STATUS_LABELS[r.status]}
                  </p>
                  <p className="mt-1 font-label text-xs text-outline">{r.age}</p>
                </div>

                <div className="min-w-0 justify-self-start">
                  <label className="block w-full">
                    <span className={LABEL}>Take action…</span>
                    <select
                      className={`${FIELD} cursor-pointer appearance-none`}
                      disabled={isSaving}
                      value={pending?.id === r.id ? pending.next : ""}
                      onChange={(e) =>
                        setPending(
                          e.target.value
                            ? {
                                id: r.id,
                                next: e.target.value as WorkOrderStatus,
                              }
                            : null,
                        )
                      }
                    >
                      <option value="">Take action…</option>
                      {TRANSITIONS[r.status].map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {pending?.id === r.id ? (
                    <ConfirmBar
                      label={STATUS_LABELS[pending.next]}
                      consequence={CONSEQUENCE[pending.next]}
                      actingStaff={actingStaff}
                      onCancel={() => setPending(null)}
                      onConfirm={() => apply(r.id, pending.next)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
