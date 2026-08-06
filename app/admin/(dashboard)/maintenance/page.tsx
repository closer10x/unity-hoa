import type { Metadata } from "next";

import {
  listWorkOrders,
  setWorkOrderStatus,
} from "@/app/admin/(dashboard)/maintenance/actions";
import {
  WorkOrdersSection,
  type WorkOrderView,
} from "@/components/portal/work-orders/work-orders-section";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { PRIORITY_LABELS } from "@/lib/types/maintenance";
import type { WorkOrderStatus } from "@/lib/types/maintenance";

export const metadata: Metadata = { title: "Work orders" };

export const dynamic = "force-dynamic";

function daysOpen(iso: string | null): string {
  if (!iso) return "—";
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return `${d}d open`;
}

export default async function WorkOrdersPage() {
  const session = await requireAdminUser();
  const actingStaff =
    session.profile.display_name?.trim() || session.user.email || "this account";

  const res = await listWorkOrders();
  const items = res && "items" in res ? res.items : [];
  const error = res && "error" in res ? res.error : null;

  const rows: WorkOrderView[] = items.map((w) => ({
    id: w.id,
    ref: w.work_order_number,
    title: w.title,
    detail:
      w.location ?? w.description?.slice(0, 90) ?? "No location recorded",
    assignee: w.assignee_name,
    status: w.status,
    priority: PRIORITY_LABELS[w.priority],
    age: daysOpen(w.created_at),
  }));

  async function setStatus(id: string, status: WorkOrderStatus) {
    "use server";
    return setWorkOrderStatus(id, status);
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1520px]">
        {error ? (
          <p className="mb-6 rounded-xl border border-outline-variant bg-secondary-container px-5 py-4 text-sm text-on-secondary-container">
            {error}
          </p>
        ) : null}
        <WorkOrdersSection
          rows={rows}
          actingStaff={actingStaff}
          setStatus={setStatus}
        />
      </div>
    </div>
  );
}
