import { AdminHeader } from "@/components/portal/admin-header";
import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { loadAdminNotificationsForHeader } from "@/lib/notifications/load";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminUser();
  const notifications = await loadAdminNotificationsForHeader(session.user.id);

  return (
    <>
      <AdminSidebar />
      <main className="md:ml-64 min-h-screen flex flex-col">
        <AdminHeader
          email={session.user.email ?? undefined}
          displayName={session.profile.display_name ?? undefined}
          notifications={notifications}
        />
        {children}
      </main>
    </>
  );
}
