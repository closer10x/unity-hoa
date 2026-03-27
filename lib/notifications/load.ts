import { getSupabaseUrl } from "@/lib/supabase/keys";
import { isTableMissingFromApi } from "@/lib/supabase/is-table-missing-from-api";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  ensureNotificationPreferences,
  notificationKindAllowedInApp,
} from "@/lib/notifications/preferences";
import { syncDueWorkOrderNotifications } from "@/lib/notifications/sync-due";
import type {
  AdminNotificationListItem,
  AdminNotificationKind,
  AdminNotificationRow,
} from "@/lib/types/notifications";

export type AdminNotificationHeaderPayload = {
  items: AdminNotificationListItem[];
  unreadCount: number;
};

const FETCH_CAP = 400;

export async function loadAdminNotificationsForHeader(
  readerKey: string,
  displayLimit = 15,
): Promise<AdminNotificationHeaderPayload> {
  if (!isSupabaseConfigured()) {
    return { items: [], unreadCount: 0 };
  }
  const client = createServiceClient();

  // #region agent log
  {
    const raw = getSupabaseUrl();
    let urlHost: string | null = null;
    try {
      urlHost = raw ? new URL(raw).host : null;
    } catch {
      urlHost = "invalid_url";
    }
    fetch("http://127.0.0.1:7297/ingest/96803dcb-0174-4956-a879-376da8f573e0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5802bc",
      },
      body: JSON.stringify({
        sessionId: "5802bc",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "load.ts:loadAdminNotificationsForHeader",
        message: "notifications header supabase target",
        data: { urlHost, client: "createServiceClient" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  await syncDueWorkOrderNotifications(client);

  const prefs = await ensureNotificationPreferences(client, readerKey);

  const { data: notifs, error: nErr } = await client
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FETCH_CAP);
  if (nErr || !notifs) {
    if (nErr && !isTableMissingFromApi(nErr, "admin_notifications")) {
      console.error("admin_notifications list:", nErr.message);
    }
    return { items: [], unreadCount: 0 };
  }

  const rows = (notifs as AdminNotificationRow[]).filter((r) =>
    notificationKindAllowedInApp(r.kind as AdminNotificationKind, prefs),
  );

  if (rows.length === 0) {
    return { items: [], unreadCount: 0 };
  }

  const ids = rows.map((r) => r.id);
  const { data: reads } = await client
    .from("admin_notification_reads")
    .select("notification_id")
    .eq("reader_key", readerKey)
    .in("notification_id", ids);

  const readSet = new Set(
    (reads ?? []).map((r) => (r as { notification_id: string }).notification_id),
  );

  const withRead: AdminNotificationListItem[] = rows.map((r) => ({
    ...r,
    read: readSet.has(r.id),
  }));

  const unreadCount = withRead.filter((i) => !i.read).length;
  const items = withRead.slice(0, displayLimit);

  return { items, unreadCount };
}
