"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { canEditSchedule } from "./permissions";

import type { WorkOrder, WorkStatus } from "./types";

/**
 * Work orders, persisted. Raising one, moving it along the status ladder and
 * handing it to a tech all write work_orders and stamp the audit trail, so the
 * dispatch board and the work order list survive a refresh.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can manage work orders.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  const mayEditSchedule = canEditSchedule(
    session.profile.staff_role,
    session.profile.can_edit_schedule,
  );
  return { db, actorName, actorId, mayEditSchedule };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  actorName: string,
  actorId: string | null,
  action: string,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

/** The table's check constraint wants lowercase priorities. */
const PRIORITIES = ["low", "normal", "high", "urgent"];

const PRIORITY_FROM_UI: Record<string, string> = {
  Routine: "normal",
  Soon: "high",
  Urgent: "urgent",
};

function toDbPriority(value: string): string {
  const mapped = PRIORITY_FROM_UI[value.trim()];
  if (mapped) return mapped;
  const lower = value.trim().toLowerCase();
  return PRIORITIES.includes(lower) ? lower : "normal";
}

/**
 * The inverse of server-data's toWorkStatus. Every value here must read back
 * as the same portal status when the page is next loaded from the database.
 */
const STATUS_TO_DB: Record<WorkStatus, string> = {
  New: "open",
  Scheduled: "assigned",
  "In progress": "in_progress",
  Closed: "completed",
};

function toWorkStatus(s: string): WorkStatus {
  if (s === "completed" || s === "cancelled") return "Closed";
  if (s === "in_progress") return "In progress";
  if (s === "assigned" || s === "pending") return "Scheduled";
  return "New";
}

type WorkOrderRow = {
  id: string;
  work_order_number: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  priority: string | null;
  status: string | null;
  assigned_to: string | null;
  due_at: string | null;
};

/**
 * assigned_to is a foreign key to employees, so a vendor or anyone without an
 * employee record resolves to null and keeps only their name on the row.
 */
async function resolveEmployee(
  db: ReturnType<typeof requireServiceSupabase>,
  name: string,
): Promise<{ id: string | null; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { id: null, name: "" };
  const { data, error } = await db
    .from("employees")
    .select("id, name")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { id: (data?.id as string) ?? null, name: trimmed };
}

function toWorkOrder(row: WorkOrderRow, assigneeName: string): WorkOrder {
  return {
    id: row.id,
    ref: row.work_order_number ?? row.id.slice(0, 8),
    title: row.title ?? "Untitled",
    detail: row.location ?? row.description ?? "No detail recorded",
    assignee: assigneeName || "Unassigned",
    assigneeId: row.assigned_to,
    dueAt: row.due_at,
    priority: row.priority,
    status: toWorkStatus(row.status ?? "open"),
  };
}

const ROW_COLUMNS =
  "id, work_order_number, title, description, location, priority, status, assigned_to, due_at";

export async function createWorkOrder(input: {
  community: string;
  location: string;
  title: string;
  detail: string;
  priority: string;
  assigneeName: string;
}): Promise<{ ok: true; work: WorkOrder } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!input.title.trim()) return { ok: false, error: "Give the work order a title." };
    if (!input.community.trim()) return { ok: false, error: "Pick the community." };
    if (!input.assigneeName.trim()) return { ok: false, error: "Assign it to a tech or a vendor." };

    const assignee = await resolveEmployee(db, input.assigneeName);
    const where = [input.community.trim(), input.location.trim()]
      .filter(Boolean)
      .join(" · ");

    // work_order_number comes from the table's own sequence trigger, which is
    // the only source that cannot collide on the unique column.
    const { data, error } = await db
      .from("work_orders")
      .insert({
        title: input.title.trim(),
        location: where,
        description: input.detail.trim() || null,
        priority: toDbPriority(input.priority),
        status: assignee.id ? STATUS_TO_DB.Scheduled : STATUS_TO_DB.New,
        assigned_to: assignee.id,
      })
      .select(ROW_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    const work = toWorkOrder(data as WorkOrderRow, assignee.name);
    await audit(
      db, actorName, actorId,
      `Work orders: created ${work.ref} — ${work.title} at ${where}, assigned to ${assignee.name}`,
    );
    revalidatePath("/admin");
    return { ok: true, work };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setWorkOrderStatus(input: {
  id: string;
  status: WorkStatus;
  note?: string;
}): Promise<{ ok: true; work: WorkOrder } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    const next = STATUS_TO_DB[input.status];
    if (!next) return { ok: false, error: "That isn't a valid work order state." };

    const { data: existing, error: getErr } = await db
      .from("work_orders")
      .select(ROW_COLUMNS)
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That work order no longer exists." };

    const update: Record<string, unknown> = { status: next };
    // Sending one back to new drops the assignment, which is what the confirm
    // text promises.
    if (input.status === "New") update.assigned_to = null;
    if (input.note?.trim()) update.internal_notes = input.note.trim();

    const { data, error } = await db
      .from("work_orders")
      .update(update)
      .eq("id", input.id)
      .select(ROW_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    const row = data as WorkOrderRow;
    let assigneeName = "";
    if (row.assigned_to) {
      const { data: emp } = await db
        .from("employees")
        .select("name")
        .eq("id", row.assigned_to)
        .maybeSingle();
      assigneeName = (emp?.name as string) ?? "Assigned";
    }
    const work = toWorkOrder(row, assigneeName);

    await audit(
      db, actorName, actorId,
      `Work orders: ${work.ref} — ${work.title} → ${input.status}`,
    );
    revalidatePath("/admin");
    return { ok: true, work };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function assignWorkOrder(input: {
  id: string;
  assigneeName: string;
  dueAt?: string;
}): Promise<{ ok: true; work: WorkOrder } | Fail> {
  try {
    const { db, actorName, actorId, mayEditSchedule } = await officeContext();
    // Assigning a job and its day is a schedule change; a view-only field
    // account is stopped here, not only in the UI.
    if (!mayEditSchedule) {
      return { ok: false, error: "You can view the schedule but not change it. Ask an office manager to adjust assignments." };
    }
    if (!input.assigneeName.trim()) return { ok: false, error: "Pick who is doing the work." };

    const { data: existing, error: getErr } = await db
      .from("work_orders")
      .select(ROW_COLUMNS)
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That work order no longer exists." };

    const assignee = await resolveEmployee(db, input.assigneeName);
    const update: Record<string, unknown> = { assigned_to: assignee.id };
    if (input.dueAt?.trim()) {
      const due = new Date(`${input.dueAt.trim()}T12:00:00.000Z`);
      if (Number.isNaN(due.getTime())) return { ok: false, error: "Pick a real due date." };
      update.due_at = due.toISOString();
    }
    if ((existing as WorkOrderRow).status === "open") update.status = STATUS_TO_DB.Scheduled;

    const { data, error } = await db
      .from("work_orders")
      .update(update)
      .eq("id", input.id)
      .select(ROW_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    const work = toWorkOrder(data as WorkOrderRow, assignee.name);
    await audit(
      db, actorName, actorId,
      `Work orders: ${work.ref} — ${work.title} assigned to ${assignee.name}${input.dueAt?.trim() ? `, due ${input.dueAt.trim()}` : ""}`,
    );
    revalidatePath("/admin");
    return { ok: true, work };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Editing the order itself — what the job is, where, how urgent and when it
 * is due. Status and assignment have their own actions; this leaves both
 * alone so an edit never silently moves a job along the ladder.
 */
export async function updateWorkOrder(input: {
  id: string;
  title: string;
  location: string;
  description: string;
  priority: string;
  dueAt: string;
}): Promise<{ ok: true; work: WorkOrder; changed: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) {
      return { ok: false, error: "That work order has not been saved yet." };
    }

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the work order a title." };

    const { data: before, error: readErr } = await db
      .from("work_orders")
      .select(ROW_COLUMNS)
      .eq("id", input.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!before) return { ok: false, error: "That work order no longer exists." };

    const priority = toDbPriority(input.priority);
    const location = input.location.trim();
    const description = input.description.trim();
    const dueAt = input.dueAt.trim()
      ? /^\d{4}-\d{2}-\d{2}$/.test(input.dueAt.trim())
        ? `${input.dueAt.trim()}T12:00:00.000Z`
        : input.dueAt.trim()
      : null;

    const changes: string[] = [];
    if ((before.title ?? "") !== title) changes.push(`title → ${title}`);
    if ((before.location ?? "") !== location) changes.push(location ? `location → ${location}` : "location cleared");
    if ((before.description ?? "") !== description) changes.push("description updated");
    if ((before.priority ?? "") !== priority) changes.push(`priority → ${priority}`);
    if ((before.due_at ?? null) !== dueAt) changes.push(dueAt ? `due ${dueAt.slice(0, 10)}` : "due date cleared");

    const { data, error } = await db
      .from("work_orders")
      .update({ title, location: location || null, description: description || null, priority, due_at: dueAt })
      .eq("id", input.id)
      .select(ROW_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    let assigneeName = "";
    if (data.assigned_to) {
      const { data: emp } = await db
        .from("employees")
        .select("name")
        .eq("id", data.assigned_to)
        .maybeSingle();
      assigneeName = (emp?.name as string) ?? "";
    }

    const changed = changes.length ? changes.join(", ") : "no changes";
    if (changes.length) {
      await audit(
        db,
        actorName,
        actorId,
        `Work orders: edited ${data.work_order_number ?? input.id.slice(0, 8)} — ${changed}`,
      );
    }

    revalidatePath("/admin");
    return { ok: true, work: toWorkOrder(data as WorkOrderRow, assigneeName), changed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
