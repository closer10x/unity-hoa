import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableMissingFromApi } from "@/lib/supabase/is-table-missing-from-api";
import type { AdminNotificationKind } from "@/lib/types/notifications";
import type { NotificationPreferencesRow } from "@/lib/types/settings";

export function notificationKindAllowedInApp(
  kind: AdminNotificationKind,
  prefs: NotificationPreferencesRow,
): boolean {
  if (kind.startsWith("work_order_")) return prefs.maintenance_updates;
  if (kind.startsWith("announcement_")) return prefs.announcements;
  if (kind.startsWith("community_event_")) return prefs.events;
  return true;
}

function normalizePrefs(row: Record<string, unknown>): NotificationPreferencesRow {
  return {
    user_id: String(row.user_id),
    announcements: Boolean(row.announcements ?? true),
    maintenance_updates: Boolean(row.maintenance_updates ?? true),
    billing_reminders: Boolean(row.billing_reminders ?? true),
    events: Boolean(row.events ?? true),
    email_announcements: Boolean(row.email_announcements ?? false),
    email_maintenance_updates: Boolean(row.email_maintenance_updates ?? false),
    email_events: Boolean(row.email_events ?? false),
    email_billing_reminders: Boolean(row.email_billing_reminders ?? false),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function ensureNotificationPreferences(
  client: SupabaseClient,
  userId: string,
): Promise<NotificationPreferencesRow> {
  const { data: existing, error: selErr } = await client
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) {
    if (isTableMissingFromApi(selErr, "notification_preferences")) {
      return normalizePrefs({
        user_id: userId,
        announcements: true,
        maintenance_updates: true,
        billing_reminders: true,
        events: true,
        email_announcements: false,
        email_maintenance_updates: false,
        email_events: false,
        email_billing_reminders: false,
        updated_at: new Date().toISOString(),
      });
    }
    console.error("ensureNotificationPreferences select:", selErr.message);
  }
  if (existing) {
    return normalizePrefs(existing as Record<string, unknown>);
  }
  const insert = {
    user_id: userId,
    announcements: true,
    maintenance_updates: true,
    billing_reminders: true,
    events: true,
    email_announcements: false,
    email_maintenance_updates: false,
    email_events: false,
    email_billing_reminders: false,
  };
  const { data: created, error } = await client
    .from("notification_preferences")
    .insert(insert)
    .select("*")
    .single();
  if (error || !created) {
    const { data: again } = await client
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (again) return normalizePrefs(again as Record<string, unknown>);
    return normalizePrefs({ ...insert, updated_at: new Date().toISOString() });
  }
  return normalizePrefs(created as Record<string, unknown>);
}
