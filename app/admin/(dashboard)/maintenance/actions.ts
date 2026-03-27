"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import { enqueueAdminNotification } from "@/lib/notifications/enqueue";
import {
  deleteDueNotificationsForWorkOrder,
  syncDueWorkOrderNotifications,
} from "@/lib/notifications/sync-due";
import { summarizeWorkOrderChanges } from "@/lib/notifications/work-order-diff";
import {
  WORK_ORDER_IMAGES_BUCKET,
  createServiceClient,
  isSupabaseConfigured,
  signAttachmentUrls,
} from "@/lib/supabase/server";
import type {
  WorkOrderCategory,
  WorkOrderListItem,
  WorkOrderPriority,
  WorkOrderRow,
  WorkOrderStatus,
} from "@/lib/types/maintenance";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  extForMime,
} from "./maintenance-constants";

export type WorkOrderStats = {
  total: number;
  byStatus: Record<string, number>;
};

export async function getMaintenanceDashboardSummary(): Promise<{
  openPipeline: number;
  urgentOpen: number;
  completedTotal: number;
} | null> {
  if (!isSupabaseConfigured()) return null;
  await requireAdminUser();
  const supabase = createServiceClient();
  const activeStatuses = ["open", "assigned", "in_progress", "pending"];
  const { count: openPipeline } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .in("status", activeStatuses);
  const { count: urgentOpen } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("priority", "urgent")
    .in("status", activeStatuses);
  const { count: completedTotal } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");
  return {
    openPipeline: openPipeline ?? 0,
    urgentOpen: urgentOpen ?? 0,
    completedTotal: completedTotal ?? 0,
  };
}

export async function getWorkOrderStats(): Promise<WorkOrderStats | null> {
  if (!isSupabaseConfigured()) return null;
  await requireAdminUser();
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("work_orders")
    .select("status");
  if (error || !rows) {
    return { total: 0, byStatus: {} };
  }
  const byStatus: Record<string, number> = {};
  for (const r of rows as { status: string }[]) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

export async function listWorkOrders(params?: {
  status?: WorkOrderStatus | "all";
  limit?: number;
}): Promise<{ items: WorkOrderListItem[] } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  await requireAdminUser();
  const supabase = createServiceClient();
  let q = supabase
    .from("work_orders")
    .select("*")
    .order("updated_at", { ascending: false });
  const st = params?.status;
  if (st && st !== "all") {
    q = q.eq("status", st);
  }
  if (params?.limit != null && params.limit > 0) {
    q = q.limit(params.limit);
  }
  const { data: orders, error } = await q;
  if (error) {
    return { error: error.message };
  }
  const list = (orders ?? []) as WorkOrderRow[];
  const ids = list.map((o) => o.id);
  const assigneeIds = [
    ...new Set(list.map((o) => o.assigned_to).filter(Boolean)),
  ] as string[];

  const assigneeMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: emps } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", assigneeIds);
    for (const e of emps ?? []) {
      assigneeMap.set((e as { id: string; name: string }).id, (e as { id: string; name: string }).name);
    }
  }

  const countMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: atts } = await supabase
      .from("work_order_attachments")
      .select("work_order_id")
      .in("work_order_id", ids);
    for (const a of atts ?? []) {
      const wid = (a as { work_order_id: string }).work_order_id;
      countMap.set(wid, (countMap.get(wid) ?? 0) + 1);
    }
  }

  const items: WorkOrderListItem[] = list.map((o) => ({
    ...o,
    assignee_name: o.assigned_to
      ? (assigneeMap.get(o.assigned_to) ?? null)
      : null,
    attachment_count: countMap.get(o.id) ?? 0,
  }));

  return { items };
}

export type WorkOrderDetail = WorkOrderRow & {
  assignee_name: string | null;
  attachments: Array<{
    id: string;
    storage_path: string;
    content_type: string | null;
    signedUrl: string | null;
  }>;
};

export async function getWorkOrder(id: string): Promise<
  | { order: WorkOrderDetail }
  | { error: string }
> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  await requireAdminUser();
  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { error: error.message };
  }
  if (!row) {
    return { error: "Work order not found" };
  }
  const order = row as WorkOrderRow;
  let assignee_name: string | null = null;
  if (order.assigned_to) {
    const { data: emp } = await supabase
      .from("employees")
      .select("name")
      .eq("id", order.assigned_to)
      .maybeSingle();
    assignee_name = (emp as { name: string } | null)?.name ?? null;
  }

  const { data: attRows } = await supabase
    .from("work_order_attachments")
    .select("id, storage_path, content_type")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const paths =
    (attRows ?? []).map((a) => (a as { storage_path: string }).storage_path) ??
    [];
  const urlMap = await signAttachmentUrls(supabase, paths);

  const attachments = (attRows ?? []).map((a) => {
    const ar = a as {
      id: string;
      storage_path: string;
      content_type: string | null;
    };
    return {
      id: ar.id,
      storage_path: ar.storage_path,
      content_type: ar.content_type,
      signedUrl: urlMap.get(ar.storage_path) ?? null,
    };
  });

  return {
    order: {
      ...order,
      assignee_name,
      attachments,
    },
  };
}

async function uploadImagesForWorkOrder(
  supabase: ReturnType<typeof createServiceClient>,
  workOrderId: string,
  files: File[],
): Promise<{ error?: string; added: number }> {
  let added = 0;
  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `File "${file.name}" exceeds ${MAX_IMAGE_BYTES / 1024 / 1024}MB`, added };
    }
    const type = file.type;
    if (!ALLOWED_IMAGE_TYPES.has(type)) {
      return { error: `Unsupported type for "${file.name}"`, added };
    }
    const ext = extForMime(type);
    const path = `work-orders/${workOrderId}/${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(WORK_ORDER_IMAGES_BUCKET)
      .upload(path, buf, { contentType: type, upsert: false });
    if (upErr) {
      return { error: upErr.message, added };
    }
    const { error: insErr } = await supabase.from("work_order_attachments").insert({
      work_order_id: workOrderId,
      storage_path: path,
      content_type: type,
      byte_size: file.size,
    });
    if (insErr) {
      await supabase.storage.from(WORK_ORDER_IMAGES_BUCKET).remove([path]);
      return { error: insErr.message, added };
    }
    added += 1;
  }
  return { added };
}

export async function createWorkOrder(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase is not configured" };
    }
    await requireAdminUser();
    const supabase = createServiceClient();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      return { error: "Title is required" };
    }
    const description = optionalStr(formData.get("description"));
    const location = optionalStr(formData.get("location"));
    const category = parseCategory(formData.get("category"));
    const priority = parsePriority(formData.get("priority"));
    const status = parseStatus(formData.get("status")) ?? "open";
    const reported_by_name = optionalStr(formData.get("reported_by_name"));
    const reported_by_unit = optionalStr(formData.get("reported_by_unit"));
    const reported_by_email = optionalStr(formData.get("reported_by_email"));
    const assigned_to = optionalStr(formData.get("assigned_to"));
    const due_at = optionalDate(formData.get("due_at"));
    const internal_notes = optionalStr(formData.get("internal_notes"));

    const insertPayload: Record<string, unknown> = {
      title,
      description,
      location,
      category,
      priority,
      status,
      reported_by_name,
      reported_by_unit,
      reported_by_email,
      assigned_to: assigned_to || null,
      due_at,
      internal_notes,
    };

    const { data: inserted, error } = await supabase
      .from("work_orders")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error || !inserted) {
      return { error: error?.message ?? "Insert failed" };
    }
    const id = (inserted as { id: string }).id;

    const files = formData.getAll("images").filter((v) => v instanceof File) as File[];
    const up = await uploadImagesForWorkOrder(supabase, id, files);
    if (up.error) {
      return { error: up.error };
    }

    const { data: createdRow } = await supabase
      .from("work_orders")
      .select("work_order_number, title")
      .eq("id", id)
      .single();
    const wo = createdRow as { work_order_number: string; title: string } | null;
    const bodyParts = [wo?.title ?? title];
    if (up.added > 0) bodyParts.push(`${up.added} photo(s) attached`);
    await enqueueAdminNotification(supabase, {
      kind: "work_order_created",
      title: "New work order",
      body: wo ? `${wo.work_order_number}: ${bodyParts.join(" · ")}` : bodyParts.join(" · "),
      href: `/admin/maintenance/${id}`,
      entity_type: "work_order",
      entity_id: id,
      metadata: { photo_count: up.added },
    });
    await syncDueWorkOrderNotifications(supabase);

    revalidatePath("/admin/maintenance");
    revalidatePath("/admin/maintenance/new");
    revalidatePath("/admin");
    return { id };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateWorkOrder(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase is not configured" };
    }
    await requireAdminUser();
    const supabase = createServiceClient();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { error: "Missing work order id" };
    }
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      return { error: "Title is required" };
    }
    const description = optionalStr(formData.get("description"));
    const location = optionalStr(formData.get("location"));
    const category = parseCategory(formData.get("category"));
    const priority = parsePriority(formData.get("priority"));
    const status = parseStatus(formData.get("status"));
    if (!status) {
      return { error: "Invalid status" };
    }
    const reported_by_name = optionalStr(formData.get("reported_by_name"));
    const reported_by_unit = optionalStr(formData.get("reported_by_unit"));
    const reported_by_email = optionalStr(formData.get("reported_by_email"));
    const assigned_to = optionalStr(formData.get("assigned_to"));
    const due_at = optionalDate(formData.get("due_at"));
    const internal_notes = optionalStr(formData.get("internal_notes"));

    const { data: prevRow, error: prevErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (prevErr || !prevRow) {
      return { error: prevErr?.message ?? "Work order not found" };
    }
    const before = prevRow as WorkOrderRow;

    const { error } = await supabase
      .from("work_orders")
      .update({
        title,
        description,
        location,
        category,
        priority,
        status,
        reported_by_name,
        reported_by_unit,
        reported_by_email,
        assigned_to: assigned_to || null,
        due_at,
        internal_notes,
      })
      .eq("id", id);
    if (error) {
      return { error: error.message };
    }

    if (status === "completed" || status === "cancelled") {
      await deleteDueNotificationsForWorkOrder(supabase, id);
    }

    const patch = {
      title,
      description,
      location,
      category,
      priority,
      status,
      reported_by_name,
      reported_by_unit,
      reported_by_email,
      assigned_to: assigned_to || null,
      due_at,
      internal_notes,
    };
    const changes = summarizeWorkOrderChanges(before, patch);
    if (changes.length > 0) {
      await enqueueAdminNotification(supabase, {
        kind: "work_order_updated",
        title: "Work order updated",
        body: `${before.work_order_number}: ${changes.join(" · ")}`,
        href: `/admin/maintenance/${id}`,
        entity_type: "work_order",
        entity_id: id,
        metadata: { changes },
      });
    }

    const files = formData.getAll("images").filter((v) => v instanceof File) as File[];
    const up = await uploadImagesForWorkOrder(supabase, id, files);
    if (up.error) {
      return { error: up.error };
    }
    if (up.added > 0) {
      await enqueueAdminNotification(supabase, {
        kind: "work_order_attachment_added",
        title: "Photos added to work order",
        body: `${before.work_order_number}: ${up.added} new photo(s)`,
        href: `/admin/maintenance/${id}`,
        entity_type: "work_order",
        entity_id: id,
        metadata: { count: up.added },
      });
    }

    await syncDueWorkOrderNotifications(supabase);

    revalidatePath("/admin/maintenance");
    revalidatePath("/admin/maintenance/new");
    revalidatePath(`/admin/maintenance/${id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteAttachment(
  attachmentId: string,
  workOrderId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  await requireAdminUser();
  const supabase = createServiceClient();
  const { data: row, error: fetchErr } = await supabase
    .from("work_order_attachments")
    .select("id, storage_path, work_order_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (fetchErr || !row) {
    return { error: fetchErr?.message ?? "Attachment not found" };
  }
  const r = row as { storage_path: string; work_order_id: string };
  if (r.work_order_id !== workOrderId) {
    return { error: "Invalid attachment" };
  }
  const { error: rmErr } = await supabase.storage
    .from(WORK_ORDER_IMAGES_BUCKET)
    .remove([r.storage_path]);
  if (rmErr) {
    return { error: rmErr.message };
  }
  const { error: delErr } = await supabase
    .from("work_order_attachments")
    .delete()
    .eq("id", attachmentId);
  if (delErr) {
    return { error: delErr.message };
  }
  revalidatePath("/admin/maintenance");
  revalidatePath(`/admin/maintenance/${workOrderId}`);
  return { ok: true };
}

function optionalStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function optionalDate(v: FormDataEntryValue | null): string | null {
  const s = optionalStr(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseCategory(v: FormDataEntryValue | null): WorkOrderCategory {
  const s = String(v ?? "other");
  const allowed: WorkOrderCategory[] = [
    "plumbing",
    "electrical",
    "hvac",
    "grounds",
    "security",
    "other",
  ];
  return allowed.includes(s as WorkOrderCategory) ? (s as WorkOrderCategory) : "other";
}

function parsePriority(v: FormDataEntryValue | null): WorkOrderPriority {
  const s = String(v ?? "normal");
  const allowed: WorkOrderPriority[] = ["low", "normal", "high", "urgent"];
  return allowed.includes(s as WorkOrderPriority)
    ? (s as WorkOrderPriority)
    : "normal";
}

function parseStatus(v: FormDataEntryValue | null): WorkOrderStatus | null {
  const s = String(v ?? "");
  const allowed: WorkOrderStatus[] = [
    "open",
    "assigned",
    "in_progress",
    "pending",
    "completed",
    "cancelled",
  ];
  return allowed.includes(s as WorkOrderStatus) ? (s as WorkOrderStatus) : null;
}
