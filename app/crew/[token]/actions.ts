"use server";

import { revalidatePath } from "next/cache";

import { resolveCrewLink } from "@/lib/crew/links";
import { PENDING_REASONS } from "@/lib/crew/pending-reasons";
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
    .select("name, active")
    .eq("id", link.employee_id)
    .maybeSingle();

  /* Switched off has to mean cannot act, not just cannot see. The board
     stopped rendering for a disabled account long before this checked, so a
     link that still resolved could go on closing jobs and posting notes
     under that employee's name. */
  if (!emp || emp.active === false) {
    return { error: "This link has been switched off. Call the office." as const };
  }

  return { db, link, wo, who: emp.name ?? "Field crew" };
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

/**
 * Parks a job with a reason. Distinct from doing nothing: the office sees
 * why it stopped, on the row and in the notes, so a paused job can't be
 * mistaken for a forgotten one.
 */
export async function markJobPending(
  token: string,
  workOrderId: string,
  reason: string,
  detail: string,
): Promise<Result> {
  const auth = await authorize(token, workOrderId);
  if ("error" in auth) return auth;

  const picked = (PENDING_REASONS as readonly string[]).includes(reason.trim())
    ? reason.trim()
    : "";
  if (!picked) return { error: "Pick what you're waiting on." };
  const extra = detail.trim().slice(0, MAX_NOTE);
  const full = extra ? `${picked} — ${extra}` : picked;

  const { error } = await auth.db
    .from("work_orders")
    .update({ status: "pending", pending_reason: full })
    .eq("id", workOrderId);
  if (error) return { error: error.message };

  // The hold is itself a field note, so the office reads it in sequence with
  // everything else that happened on the job.
  await auth.db.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: `Put on hold — ${full}`,
    author_name: auth.who,
  });

  revalidatePath(`/crew/${token}`);
  return { ok: true };
}

/** Back off hold and into progress, clearing the reason. */
export async function resumeJob(token: string, workOrderId: string): Promise<Result> {
  const auth = await authorize(token, workOrderId);
  if ("error" in auth) return auth;

  const { error } = await auth.db
    .from("work_orders")
    .update({ status: "in_progress", pending_reason: null })
    .eq("id", workOrderId);
  if (error) return { error: error.message };

  await auth.db.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: "Back on it — hold cleared.",
    author_name: auth.who,
  });

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
    .update({ status: "completed", pending_reason: null })
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
