"use client";

import type { WorkOrderCategory, WorkOrderPriority, WorkOrderStatus } from "@/lib/types/maintenance";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/types/maintenance";

type EmployeeOpt = { id: string; name: string };

type Props = {
  employees: EmployeeOpt[];
  defaults?: Partial<{
    title: string;
    description: string;
    location: string;
    category: WorkOrderCategory;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    reported_by_name: string;
    reported_by_unit: string;
    reported_by_email: string;
    assigned_to: string;
    due_at: string;
    internal_notes: string;
  }>;
  showImages?: boolean;
  idField?: string;
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as WorkOrderCategory[];
const PRIORITIES = Object.keys(PRIORITY_LABELS) as WorkOrderPriority[];
const STATUSES = Object.keys(STATUS_LABELS) as WorkOrderStatus[];

export function WorkOrderFormFields({
  employees,
  defaults = {},
  showImages = true,
  idField,
}: Props) {
  const d = defaults;
  return (
    <div className="space-y-4">
      {idField ? <input type="hidden" name="id" value={idField} /> : null}
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
          Title
        </label>
        <input
          name="title"
          required
          defaultValue={d.title ?? ""}
          className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          placeholder="Short summary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={d.description ?? ""}
          className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary resize-y min-h-[80px]"
          placeholder="Details for the team"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Location
          </label>
          <input
            name="location"
            defaultValue={d.location ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
            placeholder="Building, unit, common area"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Category
          </label>
          <select
            name="category"
            defaultValue={d.category ?? "other"}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Priority
          </label>
          <select
            name="priority"
            defaultValue={d.priority ?? "normal"}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Status
          </label>
          <select
            name="status"
            defaultValue={d.status ?? "open"}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Reported by
          </label>
          <input
            name="reported_by_name"
            defaultValue={d.reported_by_name ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Unit
          </label>
          <input
            name="reported_by_unit"
            defaultValue={d.reported_by_unit ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Reporter email
          </label>
          <input
            name="reported_by_email"
            type="email"
            defaultValue={d.reported_by_email ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Assigned to
          </label>
          <select
            name="assigned_to"
            defaultValue={d.assigned_to ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          >
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Due date
          </label>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={d.due_at ?? ""}
            className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
          Internal notes
        </label>
        <textarea
          name="internal_notes"
          rows={2}
          defaultValue={d.internal_notes ?? ""}
          className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary resize-y min-h-[60px]"
          placeholder="Visible to staff only"
        />
      </div>
      {showImages ? (
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Add photos
          </label>
          <input
            name="images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-on-secondary file:text-xs file:font-semibold"
          />
          <p className="text-[10px] text-on-surface-variant">
            JPEG, PNG, or WebP. Up to 5 MB each.
          </p>
        </div>
      ) : null}
    </div>
  );
}
