import type { Metadata } from "next";

import {
  getWorkOrderStats,
  listWorkOrders,
} from "@/app/admin/(dashboard)/maintenance/actions";
import { MaintenanceDashboard } from "@/components/portal/maintenance/maintenance-dashboard";
import { MaintenanceNotConfigured } from "@/components/portal/maintenance/maintenance-not-configured";
import { listActiveEmployees } from "@/app/admin/(dashboard)/settings/employees/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ALL_STATUSES, type WorkOrderStatus } from "@/lib/types/maintenance";

export const metadata: Metadata = {
  title: "Maintenance",
};

export const dynamic = "force-dynamic";

function parseStatus(raw: string | undefined): WorkOrderStatus | "all" {
  if (!raw) return "all";
  return (ALL_STATUSES as readonly string[]).includes(raw)
    ? (raw as WorkOrderStatus)
    : "all";
}

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminMaintenancePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const filterStatus = parseStatus(sp?.status);

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <MaintenanceNotConfigured />
      </div>
    );
  }

  const [stats, listRes, empRes] = await Promise.all([
    getWorkOrderStats(),
    listWorkOrders({ status: filterStatus }),
    listActiveEmployees(),
  ]);

  const listError = "error" in listRes ? listRes.error : null;
  const items = "items" in listRes ? listRes.items : [];
  const employees = "items" in empRes ? empRes.items : [];

  return (
    <div className="p-8">
      <MaintenanceDashboard
        stats={stats}
        items={items}
        employees={employees}
        filterStatus={filterStatus}
        listError={listError}
      />
    </div>
  );
}
