import type { WorkOrderView } from "@/components/portal/work-orders/work-orders-section";

/** Fixture for the DEV-ONLY /preview/admin route. The real page reads the database. */
export const PREVIEW_WORK_ORDERS: WorkOrderView[] = [
  { id: "1", ref: "WO-4417", title: "North gate operator failure", detail: "North entry gate", assignee: "Gatewright Access", status: "assigned", priority: "Urgent", age: "5d open" },
  { id: "2", ref: "WO-4412", title: "Pool pump cycling intermittently", detail: "Amenity centre", assignee: "ClearWater Pools", status: "in_progress", priority: "High", age: "9d open" },
  { id: "3", ref: "WO-4405", title: "Lake path lighting out — three fixtures", detail: "Lake path, south run", assignee: null, status: "open", priority: "Normal", age: "12d open" },
  { id: "4", ref: "WO-4398", title: "Clubhouse HVAC filter replacement", detail: "Clubhouse Annex", assignee: "In-house — R. Alvarado", status: "completed", priority: "Low", age: "24d open" },
];
