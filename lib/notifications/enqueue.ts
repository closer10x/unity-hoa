import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableMissingFromApi } from "@/lib/supabase/is-table-missing-from-api";
import type {
  AdminNotificationEntityType,
  AdminNotificationKind,
} from "@/lib/types/notifications";

export type EnqueueAdminNotificationInput = {
  kind: AdminNotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
  entity_type?: AdminNotificationEntityType | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  dedupe_key?: string | null;
};

export async function enqueueAdminNotification(
  client: SupabaseClient,
  input: EnqueueAdminNotificationInput,
): Promise<void> {
  const { error } = await client.from("admin_notifications").insert({
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    metadata: (input.metadata ?? {}) as Record<string, unknown>,
    dedupe_key: input.dedupe_key ?? null,
  });
  if (error?.code === "23505") return;
  if (error && !isTableMissingFromApi(error, "admin_notifications")) {
    console.error("enqueueAdminNotification:", error.message);
  }
}
