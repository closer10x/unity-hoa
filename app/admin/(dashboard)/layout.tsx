import { AdminHeader } from "@/components/portal/admin-header";
import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { loadAdminNotificationsForHeader } from "@/lib/notifications/load";
import {
  createServiceClient,
  isSupabaseConfigured,
  signProfileAvatarUrl,
} from "@/lib/supabase/server";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminUser();
  const notifications = await loadAdminNotificationsForHeader(session.user.id);

  let headerAvatarUrl: string | undefined;
  const path = session.profile.avatar_path?.trim();
  if (path && isSupabaseConfigured()) {
    const signed = await signProfileAvatarUrl(createServiceClient(), path);
    if (signed) headerAvatarUrl = signed;
  }

  return (
    <>
      <AdminSidebar notifications={notifications} />
      <main className="md:ml-64 min-h-screen flex flex-col">
        <AdminHeader
          email={session.user.email ?? undefined}
          displayName={session.profile.display_name ?? undefined}
          avatarUrl={headerAvatarUrl}
        />
        {children}
      </main>
    </>
  );
}
