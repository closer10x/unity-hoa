"use server";

import { revalidatePath } from "next/cache";

import { getServiceClientForAdmin } from "@/lib/auth/admin-service";
import { enqueueAdminNotification } from "@/lib/notifications/enqueue";
import type { AnnouncementRow, AnnouncementStatus } from "@/lib/types/community";

export async function listAnnouncements(): Promise<
  { items: AnnouncementRow[] } | { error: string }
> {
  try {
    const supabase = await getServiceClientForAdmin();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return { error: error.message };
    return { items: (data ?? []) as AnnouncementRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function listPublishedAnnouncements(
  limit = 6,
): Promise<{ items: AnnouncementRow[] } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) return { error: error.message };
    return { items: (data ?? []) as AnnouncementRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getAnnouncement(
  id: string,
): Promise<{ row: AnnouncementRow } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Not found" };
    return { row: data as AnnouncementRow };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function parseStatus(v: string): AnnouncementStatus | null {
  const allowed: AnnouncementStatus[] = ["draft", "published", "archived"];
  return allowed.includes(v as AnnouncementStatus) ? (v as AnnouncementStatus) : null;
}

export async function createAnnouncement(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Title is required" };
    const body = String(formData.get("body") ?? "").trim() || null;
    const image_url = String(formData.get("image_url") ?? "").trim() || null;
    let status = parseStatus(String(formData.get("status") ?? "draft"));
    if (!status) return { error: "Invalid status" };
    const publishNow = String(formData.get("publish_now") ?? "") === "on";
    if (publishNow) status = "published";
    const published_at = status === "published" ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        body,
        image_url,
        status,
        published_at,
      })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Insert failed" };
    const newId = (data as { id: string }).id;
    await enqueueAdminNotification(supabase, {
      kind: "announcement_created",
      title: "Announcement created",
      body: title,
      href: `/admin/announcements/${newId}/edit`,
      entity_type: "announcement",
      entity_id: newId,
      metadata: { status },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/announcements");
    return { id: newId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateAnnouncement(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { error: "Missing id" };
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Title is required" };
    const body = String(formData.get("body") ?? "").trim() || null;
    const image_url = String(formData.get("image_url") ?? "").trim() || null;
    const status = parseStatus(String(formData.get("status") ?? "draft"));
    if (!status) return { error: "Invalid status" };

    const { data: existing, error: exErr } = await supabase
      .from("announcements")
      .select("status, published_at")
      .eq("id", id)
      .maybeSingle();
    if (exErr || !existing) return { error: exErr?.message ?? "Not found" };
    const prev = existing as { status: string; published_at: string | null };

    let published_at = prev.published_at;
    if (status === "published" && prev.status !== "published" && !published_at) {
      published_at = new Date().toISOString();
    }
    if (status !== "published") {
      published_at = null;
    }

    const { error } = await supabase
      .from("announcements")
      .update({
        title,
        body,
        image_url,
        status,
        published_at,
      })
      .eq("id", id);
    if (error) return { error: error.message };
    await enqueueAdminNotification(supabase, {
      kind: "announcement_updated",
      title: "Announcement updated",
      body: title,
      href: `/admin/announcements/${id}/edit`,
      entity_type: "announcement",
      entity_id: id,
      metadata: { status },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/announcements");
    revalidatePath(`/admin/announcements/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteAnnouncement(id: string, _formData: FormData): Promise<void> {
  const supabase = await getServiceClientForAdmin();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/announcements");
}
