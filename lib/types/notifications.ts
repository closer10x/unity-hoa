/** v1 admin notification kinds — server-enqueued only */
export type AdminNotificationKind =
  | "work_order_created"
  | "work_order_updated"
  | "work_order_attachment_added"
  | "work_order_due_soon"
  | "work_order_overdue"
  | "announcement_created"
  | "announcement_updated"
  | "community_event_created"
  | "community_event_updated";

export type AdminNotificationEntityType =
  | "work_order"
  | "announcement"
  | "community_event";

export type AdminNotificationRow = {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  entity_type: AdminNotificationEntityType | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  dedupe_key: string | null;
  created_at: string;
};

export type AdminNotificationListItem = AdminNotificationRow & {
  read: boolean;
};

