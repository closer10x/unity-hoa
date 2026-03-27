import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getWorkOrder } from "@/app/admin/(dashboard)/maintenance/actions";
import { WorkOrderDetailClient } from "@/components/portal/maintenance/work-order-detail-client";
import { MaintenanceNotConfigured } from "@/components/portal/maintenance/maintenance-not-configured";
import { listActiveEmployees } from "@/app/admin/(dashboard)/settings/employees/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return { title: "Work order" };
  }
  const r = await getWorkOrder(id);
  if ("error" in r) {
    return { title: "Work order" };
  }
  return { title: r.order.work_order_number };
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <MaintenanceNotConfigured />
      </div>
    );
  }

  const [wo, empRes] = await Promise.all([
    getWorkOrder(id),
    listActiveEmployees(),
  ]);

  if ("error" in wo) {
    notFound();
  }

  const employees = "items" in empRes ? empRes.items : [];

  return (
    <div className="p-8">
      <WorkOrderDetailClient order={wo.order} employees={employees} />
    </div>
  );
}
