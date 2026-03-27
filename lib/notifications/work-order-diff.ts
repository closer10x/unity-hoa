import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type WorkOrderRow,
} from "@/lib/types/maintenance";

export type WorkOrderUpdatePatch = {
  title: string;
  description: string | null;
  location: string | null;
  category: WorkOrderRow["category"];
  priority: WorkOrderRow["priority"];
  status: WorkOrderRow["status"];
  reported_by_name: string | null;
  reported_by_unit: string | null;
  reported_by_email: string | null;
  assigned_to: string | null;
  due_at: string | null;
  internal_notes: string | null;
};

function fmtDue(iso: string | null): string {
  if (!iso) return "None";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function summarizeWorkOrderChanges(
  before: WorkOrderRow,
  patch: WorkOrderUpdatePatch,
): string[] {
  const changes: string[] = [];
  if (patch.title !== before.title) changes.push("Title updated");
  if (patch.description !== before.description) changes.push("Description updated");
  if (patch.location !== before.location) changes.push("Location updated");
  if (patch.category !== before.category) {
    changes.push(
      `Category → ${CATEGORY_LABELS[patch.category] ?? patch.category}`,
    );
  }
  if (patch.priority !== before.priority) {
    changes.push(
      `Priority → ${PRIORITY_LABELS[patch.priority] ?? patch.priority}`,
    );
  }
  if (patch.status !== before.status) {
    changes.push(`Status → ${STATUS_LABELS[patch.status] ?? patch.status}`);
  }
  if (patch.assigned_to !== before.assigned_to) {
    changes.push("Assignment changed");
  }
  if (patch.due_at !== before.due_at) {
    changes.push(`Due date → ${fmtDue(patch.due_at)}`);
  }
  if (patch.reported_by_name !== before.reported_by_name) {
    changes.push("Reporter name updated");
  }
  if (patch.reported_by_unit !== before.reported_by_unit) {
    changes.push("Unit / lot updated");
  }
  if (patch.reported_by_email !== before.reported_by_email) {
    changes.push("Reporter email updated");
  }
  if (patch.internal_notes !== before.internal_notes) {
    changes.push("Internal notes updated");
  }
  return changes;
}
