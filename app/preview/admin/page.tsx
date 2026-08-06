import { notFound } from "next/navigation";

import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { AdminDashboard } from "@/components/portal/dashboard/admin-dashboard";
import { PREVIEW_DASHBOARD } from "@/components/portal/dashboard/preview-fixture";
import { OwnersManager } from "@/components/portal/owners/owners-manager";

/**
 * DEV-ONLY preview of the admin portal.
 *
 * The real admin routes are behind `requireAdminUser()`, which needs Supabase
 * credentials and a signed-in admin. This renders the same shell with fixture
 * data so the UI can be reviewed locally. `?section=owners` switches sections.
 *
 * It 404s outside development and must not ship as a way into the portal.
 */
export default async function AdminPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { section } = await searchParams;
  const showOwners = section === "owners";

  return (
    <>
      <AdminSidebar notifications={{ items: [], unreadCount: 0 }} />
      <main className="flex min-h-screen flex-col md:ml-64">
        <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface px-4 py-3.5 sm:px-6 md:px-8">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <select
              aria-label="Scope"
              defaultValue="all"
              className="cursor-pointer appearance-none rounded-[10px] border border-outline-strong bg-surface px-3.5 py-2 text-[15px] text-on-surface"
            >
              <option value="all">All communities</option>
              <option value="sofi-lakes">Sofi Lakes</option>
            </select>
            <div className="min-w-0 text-right">
              <p className="text-[15px] font-medium text-on-surface">
                Preview Admin
              </p>
              <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                Administrator
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-outline-variant bg-secondary-container px-4 py-2.5 sm:px-6 md:px-8">
          <p className="font-label text-[11px] uppercase tracking-[0.12em] text-on-secondary-container">
            Preview only — fixture data, no Supabase connection
          </p>
          <span className="flex gap-3 text-sm">
            <a
              href="/preview/admin"
              className={
                showOwners
                  ? "text-on-secondary-container hover:underline"
                  : "font-semibold text-on-secondary-container underline"
              }
            >
              Dashboard
            </a>
            <a
              href="/preview/admin?section=owners"
              className={
                showOwners
                  ? "font-semibold text-on-secondary-container underline"
                  : "text-on-secondary-container hover:underline"
              }
            >
              Owners
            </a>
          </span>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-[1520px]">
            {showOwners ? (
              <>
                <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                  People
                </p>
                <h1 className="mt-2 mb-8 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
                  Owners
                </h1>
                <OwnersManager actingStaff="Preview Admin" />
              </>
            ) : (
              <AdminDashboard scopeLabel="All communities" {...PREVIEW_DASHBOARD} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
