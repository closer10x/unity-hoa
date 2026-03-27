export type WorkOrderCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "grounds"
  | "security"
  | "other";

export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";

export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending"
  | "completed"
  | "cancelled";

export type EmployeeRow = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
};

export type WorkOrderRow = {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  location: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reported_by_name: string | null;
  reported_by_unit: string | null;
  reported_by_email: string | null;
  assigned_to: string | null;
  due_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrderAttachmentRow = {
  id: string;
  work_order_id: string;
  storage_path: string;
  content_type: string | null;
  byte_size: number | null;
  created_at: string;
};

export type WorkOrderListItem = WorkOrderRow & {
  assignee_name: string | null;
  attachment_count: number;
};

export const CATEGORY_LABELS: Record<WorkOrderCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  grounds: "Grounds",
  security: "Security",
  other: "Other",
};

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ALL_STATUSES: WorkOrderStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "pending",
  "completed",
  "cancelled",
];
