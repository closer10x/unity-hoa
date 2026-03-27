import type { SupabaseClient } from "@supabase/supabase-js";

import { enqueueAdminNotification } from "@/lib/notifications/enqueue";
import { isTableMissingFromApi } from "@/lib/supabase/is-table-missing-from-api";

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

/** Idempotent due / overdue rows for open pipeline work orders */
export async function syncDueWorkOrderNotifications(
  client: SupabaseClient,
): Promise<void> {
  const now = new Date().toISOString();
  const soonUntil = addHours(now, 24);

  const { data: overdueRows, error: oErr } = await client
    .from("work_orders")
    .select("id, title, due_at, work_order_number")
    .not("due_at", "is", null)
    .not("status", "eq", "completed")
    .not("status", "eq", "cancelled")
    .lt("due_at", now);
  if (oErr) {
    if (!isTableMissingFromApi(oErr, "work_orders")) {
      console.error("syncDue overdue:", oErr.message);
    }
    return;
  }

  for (const row of overdueRows ?? []) {
    const r = row as {
      id: string;
      title: string;
      due_at: string;
      work_order_number: string;
    };
    await enqueueAdminNotification(client, {
      kind: "work_order_overdue",
      title: "Work order overdue",
      body: `${r.work_order_number}: ${r.title}`,
      href: `/admin/maintenance/${r.id}`,
      entity_type: "work_order",
      entity_id: r.id,
      dedupe_key: `wo_overdue:${r.id}`,
      metadata: { due_at: r.due_at },
    });
  }

  const { data: soonRows, error: sErr } = await client
    .from("work_orders")
    .select("id, title, due_at, work_order_number")
    .not("due_at", "is", null)
    .not("status", "eq", "completed")
    .not("status", "eq", "cancelled")
    .gte("due_at", now)
    .lte("due_at", soonUntil);
  if (sErr) {
    if (!isTableMissingFromApi(sErr, "work_orders")) {
      console.error("syncDue soon:", sErr.message);
    }
    return;
  }

  for (const row of soonRows ?? []) {
    const r = row as {
      id: string;
      title: string;
      due_at: string;
      work_order_number: string;
    };
    await enqueueAdminNotification(client, {
      kind: "work_order_due_soon",
      title: "Work order due within 24 hours",
      body: `${r.work_order_number}: ${r.title}`,
      href: `/admin/maintenance/${r.id}`,
      entity_type: "work_order",
      entity_id: r.id,
      dedupe_key: `wo_due_soon:${r.id}`,
      metadata: { due_at: r.due_at },
    });
  }
}

/** Remove scheduled due alerts when a work order is closed */
export async function deleteDueNotificationsForWorkOrder(
  client: SupabaseClient,
  workOrderId: string,
): Promise<void> {
  await client
    .from("admin_notifications")
    .delete()
    .eq("entity_type", "work_order")
    .eq("entity_id", workOrderId)
    .in("kind", ["work_order_due_soon", "work_order_overdue"]);
}
