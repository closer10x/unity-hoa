"use server";

import { revalidatePath } from "next/cache";

import { resolveCrewLink } from "@/lib/crew/links";
import {
  WORK_ORDER_IMAGES_BUCKET,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * Mutations available from a crew link.
 *
 * Every one re-validates the token server-side and then confirms the work
 * order actually belongs to that employee. A valid token for tech A must never
 * be able to touch tech B's job, so ownership is checked on the row, not
 * inferred from the request.
 */

type Result = { ok: true } | { error: string };

const MAX_NOTE = 2000;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type Authorized = {
  db: ReturnType<typeof createServiceClient>;
  link: { id: string; employee_id: string };
  wo: { id: string; work_order_number: string | null; title: string | null };
  who: string;
};

/** Token → employee → confirms this job is theirs. */
async function authorize(
  token: string,
  workOrderId: string,
): Promise<Authorized | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "Not configured" as const };
  const link = await resolveCrewLink(token);
  if (!link) return { error: "This link is no longer active." as const };

  const db = createServiceClient();
  const { data: wo } = await db
    .from("work_orders")
    .select("id, assigned_to, work_order_number, title")
    .eq("id", workOrderId)
    .maybeSingle();

  if (!wo || wo.assigned_to !== link.employee_id) {
    return { error: "That job is not on your list." as const };
  }

  const { data: emp } = await db
    .from("employees")
    .select("name")
    .eq("id", link.employee_id)
    .maybeSingle();

  return { db, link, wo, who: emp?.name ?? "Field crew" };
}

export async function addFieldNote(
  token: string,
  workOrderId: string,
  body: string,
): Promise<Result> {
  const text = body.trim();
  if (!text) return { error: "Write a note first." };
  if (text.length > MAX_NOTE) return { error: "That note is too long." };

  const auth = await authorize(token, workOrderId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.db.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: text,
    author_name: auth.who,
    author_employee_id: auth.link.employee_id,
    from_field: true,
  });
  if (error) return { error: error.message };

  revalidatePath(`/crew/${token}`);
  return { ok: true };
}

export async function markJobComplete(
  token: string,
  workOrderId: string,
): Promise<Result> {
  const auth = await authorize(token, workOrderId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.db
    .from("work_orders")
    .update({ status: "completed" })
    .eq("id", workOrderId);
  if (error) return { error: error.message };

  // The completion is itself a field note, so the office sees who closed it.
  await auth.db.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: "Marked complete from the field.",
    author_name: auth.who,
    author_employee_id: auth.link.employee_id,
    from_field: true,
  });

  revalidatePath(`/crew/${token}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function uploadFieldPhoto(
  token: string,
  workOrderId: string,
  form: FormData,
): Promise<Result> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick a photo first." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "That photo is over 10MB." };
  if (!file.type.startsWith("image/")) return { error: "Photos only." };

  const auth = await authorize(token, workOrderId);
  if ("error" in auth) return { error: auth.error };

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${workOrderId}/${Date.now()}-field.${ext}`;

  const { error: upErr } = await auth.db.storage
    .from(WORK_ORDER_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const { error } = await auth.db.from("work_order_attachments").insert({
    work_order_id: workOrderId,
    storage_path: path,
    content_type: file.type,
    byte_size: file.size,
  });
  if (error) return { error: error.message };

  revalidatePath(`/crew/${token}`);
  return { ok: true };
}
