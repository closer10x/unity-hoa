"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import { ensureNotificationPreferences } from "@/lib/notifications/preferences";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { NotificationPreferencesRow } from "@/lib/types/settings";

export async function getNotificationPreferences(): Promise<
  { row: NotificationPreferencesRow } | { error: string }
> {
  try {
    const { user } = await requireAdminUser();
    const supabase = requireServiceSupabase();
    const row = await ensureNotificationPreferences(supabase, user.id);
    return { row };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function checkboxOn(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function updateNotificationPreferences(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { user, supabase } = await requireAdminUser();
    await ensureNotificationPreferences(requireServiceSupabase(), user.id);

    const payload = {
      user_id: user.id,
      announcements: checkboxOn(formData, "announcements"),
      maintenance_updates: checkboxOn(formData, "maintenance_updates"),
      billing_reminders: checkboxOn(formData, "billing_reminders"),
      events: checkboxOn(formData, "events"),
      email_announcements: checkboxOn(formData, "email_announcements"),
      email_maintenance_updates: checkboxOn(formData, "email_maintenance_updates"),
      email_events: checkboxOn(formData, "email_events"),
      email_billing_reminders: checkboxOn(formData, "email_billing_reminders"),
    };

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/admin/settings/notifications");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { user } = await requireAdminUser();
    const supabase = requireServiceSupabase();
    const { error } = await supabase.from("admin_notification_reads").insert({
      notification_id: notificationId,
      reader_key: user.id,
    });
    if (error?.code === "23505") return { ok: true };
    if (error) return { error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function markAllNotificationsRead(): Promise<
  { ok: true } | { error: string }
> {
  try {
    const { user } = await requireAdminUser();
    const supabase = requireServiceSupabase();
    const { error } = await supabase.rpc("admin_mark_all_notifications_read", {
      p_reader: user.id,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
