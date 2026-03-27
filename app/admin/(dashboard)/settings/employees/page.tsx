import type { Metadata } from "next";

import { listEmployees } from "@/app/admin/(dashboard)/settings/employees/actions";
import { EmployeesManager } from "@/components/portal/settings/employees-manager";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Employees & assignments",
};

export const dynamic = "force-dynamic";

export default async function EmployeesSettingsPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfigured />;
  }

  const res = await listEmployees();
  if ("error" in res) {
    return (
      <p className="text-error text-sm" role="alert">
        {res.error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline text-lg font-bold text-on-surface">
          Employees
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
          Add maintenance and field staff here. They appear in work order forms
          so you can assign each ticket to the right person.
        </p>
      </div>
      <EmployeesManager initial={res.items} />
    </div>
  );
}
