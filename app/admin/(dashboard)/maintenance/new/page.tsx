import type { Metadata } from "next";
import Link from "next/link";

import { listActiveEmployees } from "@/app/admin/(dashboard)/settings/employees/actions";
import { WorkOrderCreateForm } from "@/components/portal/maintenance/work-order-create-form";
import { MaintenanceNotConfigured } from "@/components/portal/maintenance/maintenance-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New work order",
};

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <MaintenanceNotConfigured />
      </div>
    );
  }

  const empRes = await listActiveEmployees();
  const employees = "items" in empRes ? empRes.items : [];

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/maintenance"
          className="text-sm font-semibold text-secondary hover:underline inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to maintenance
        </Link>
        <h1 className="text-2xl font-headline font-bold text-on-surface mt-4 mb-1">
          Post new work order
        </h1>
        <p className="text-sm text-on-surface-variant">
          A work order number is assigned automatically when you save.
        </p>
      </div>
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <WorkOrderCreateForm employees={employees} cancelHref="/admin/maintenance" />
      </div>
    </div>
  );
}
