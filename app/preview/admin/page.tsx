import { notFound } from "next/navigation";

import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { AdminDashboard } from "@/components/portal/dashboard/admin-dashboard";
import { PREVIEW_DASHBOARD } from "@/components/portal/dashboard/preview-fixture";
import { OwnersManager } from "@/components/portal/owners/owners-manager";
import { WorkOrdersSection } from "@/components/portal/work-orders/work-orders-section";
import { PREVIEW_WORK_ORDERS } from "@/components/portal/work-orders/preview-fixture";
import { SectionByKey, type SectionKey } from "@/components/portal/section-by-key";

/**
 * DEV-ONLY preview of the admin portal.
 *
 * The real admin routes are behind `requireAdminUser()`, which needs Supabase
 * credentials and a signed-in admin. This renders the same shell and sections
 * with fixture data so the UI can be reviewed locally.
 *
 * It 404s outside development and must not ship as a way into the portal.
 */

const TABS = [
  { key: "", label: "Dashboard" },
  { key: "owners", label: "Owners" },
  { key: "workorders", label: "Work orders" },
  { key: "architectural", label: "Architectural" },
  { key: "violations", label: "Violations" },
  { key: "bookings", label: "Bookings" },
  { key: "vendors", label: "Vendors" },
  { key: "legal", label: "Legal" },
  { key: "board", label: "Board" },
  { key: "communities", label: "Communities" },
] as const;

export default async function AdminPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { section = "" } = await searchParams;
  const isSection =
    TABS.some((t) => t.key === section) &&
    section !== "" &&
    section !== "owners" &&
    section !== "workorders";

  return (
    <>
      <div className="min-h-screen">
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

        <div className="border-b border-outline-variant bg-secondary-container px-4 py-2.5 sm:px-6 md:px-8">
          <p className="mb-2 font-label text-[11px] uppercase tracking-[0.12em] text-on-secondary-container">
            Preview only — fixture data, no Supabase connection
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {TABS.map((t) => (
              <a
                key={t.key}
                href={t.key ? `/preview/admin?section=${t.key}` : "/preview/admin"}
                className={
                  section === t.key
                    ? "font-semibold text-on-secondary-container underline"
                    : "text-on-secondary-container hover:underline"
                }
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>

        <div
          className="mx-auto flex w-full max-w-[1520px] flex-wrap items-start"
          style={{ gap: "clamp(20px, 3vw, 40px)", padding: "clamp(16px, 3vw, 32px)" }}
        >
          <AdminSidebar notifications={{ items: [], unreadCount: 0 }} />
          <main className="min-w-0" style={{ flex: "999 1 420px" }}>
            {section === "workorders" ? (
              <WorkOrdersSection
                rows={PREVIEW_WORK_ORDERS}
                actingStaff="Preview Admin"
              />
            ) : section === "owners" ? (
              <>
                <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                  People
                </p>
                <h1 className="mt-2 mb-8 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
                  Owners
                </h1>
                <OwnersManager actingStaff="Preview Admin" />
              </>
            ) : isSection ? (
              <SectionByKey sectionKey={section as SectionKey} actingStaff="Preview Admin" />
            ) : (
              <AdminDashboard scopeLabel="All communities" {...PREVIEW_DASHBOARD} />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
