"use server";

import { revalidatePath } from "next/cache";

import { fetchPublishedCommunityEvents } from "@/lib/data/community-events";
import { getServiceClientForAdmin } from "@/lib/auth/admin-service";
import { enqueueAdminNotification } from "@/lib/notifications/enqueue";
import type { CommunityEventRow, EventCategory } from "@/lib/types/community";

/** Published events (also used by the public marketing /events page via {@link fetchPublishedCommunityEvents}). */
export async function listCommunityEvents(): Promise<
  { items: CommunityEventRow[] } | { error: string }
> {
  return fetchPublishedCommunityEvents(200);
}

export async function listAllEventsForAdmin(): Promise<
  { items: CommunityEventRow[] } | { error: string }
> {
  try {
    const supabase = await getServiceClientForAdmin();
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(200);
    if (error) return { error: error.message };
    return { items: (data ?? []) as CommunityEventRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getCommunityEvent(
  id: string,
): Promise<{ row: CommunityEventRow } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Not found" };
    return { row: data as CommunityEventRow };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function parseCategory(v: string): EventCategory {
  const allowed: EventCategory[] = ["social", "official", "wellness", "other"];
  return allowed.includes(v as EventCategory) ? (v as EventCategory) : "other";
}

function parseIsoField(raw: string, label: string): string | { error: string } {
  const t = raw.trim();
  if (!t) return { error: `${label} is required` };
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return { error: `Invalid ${label}` };
  return d.toISOString();
}

function optionalIsoField(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createCommunityEvent(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Title is required" };
    const description = String(formData.get("description") ?? "").trim() || null;
    const startsRaw = String(formData.get("starts_at") ?? "").trim();
    const startsParsed = parseIsoField(startsRaw, "Start date/time");
    if (typeof startsParsed === "object") return startsParsed;
    const starts_at = startsParsed;
    const ends_at = optionalIsoField(String(formData.get("ends_at") ?? ""));
    const location = String(formData.get("location") ?? "").trim() || null;
    const category = parseCategory(String(formData.get("category") ?? "other"));
    const image_url = String(formData.get("image_url") ?? "").trim() || null;
    const rsvp_count = Math.max(0, parseInt(String(formData.get("rsvp_count") ?? "0"), 10) || 0);
    const published = formData.get("published") === "on";

    const { data, error } = await supabase
      .from("community_events")
      .insert({
        title,
        description,
        starts_at,
        ends_at,
        location,
        category,
        image_url,
        rsvp_count,
        published,
      })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Insert failed" };
    revalidatePath("/admin/events");
    revalidatePath("/admin");
    return { id: (data as { id: string }).id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateCommunityEvent(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await getServiceClientForAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { error: "Missing id" };
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Title is required" };
    const description = String(formData.get("description") ?? "").trim() || null;
    const startsRaw = String(formData.get("starts_at") ?? "").trim();
    const startsParsed = parseIsoField(startsRaw, "Start date/time");
    if (typeof startsParsed === "object") return startsParsed;
    const starts_at = startsParsed;
    const ends_at = optionalIsoField(String(formData.get("ends_at") ?? ""));
    const location = String(formData.get("location") ?? "").trim() || null;
    const category = parseCategory(String(formData.get("category") ?? "other"));
    const image_url = String(formData.get("image_url") ?? "").trim() || null;
    const rsvp_count = Math.max(0, parseInt(String(formData.get("rsvp_count") ?? "0"), 10) || 0);
    const published = formData.get("published") === "on";

    const { error } = await supabase
      .from("community_events")
      .update({
        title,
        description,
        starts_at,
        ends_at,
        location,
        category,
        image_url,
        rsvp_count,
        published,
      })
      .eq("id", id);
    if (error) return { error: error.message };
    await enqueueAdminNotification(supabase, {
      kind: "community_event_updated",
      title: "Community event updated",
      body: title,
      href: `/admin/events/${id}/edit`,
      entity_type: "community_event",
      entity_id: id,
      metadata: { published },
    });
    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${id}/edit`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteCommunityEvent(
  id: string,
  _formData: FormData,
): Promise<void> {
  const supabase = await getServiceClientForAdmin();
  const { error } = await supabase.from("community_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
