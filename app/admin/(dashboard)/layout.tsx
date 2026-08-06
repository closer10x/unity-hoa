import { AdminHeader, ADMIN_HEADER_H } from "@/components/portal/admin-header";
import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { loadAdminNotificationsForHeader } from "@/lib/notifications/load";
import {
  createServiceClient,
  isSupabaseConfigured,
  signProfileAvatarUrl,
} from "@/lib/supabase/server";

/**
 * Admin shell.
 *
 * The viewport is the frame: the header is fixed at the top and the row below
 * it fills the remaining height. The nav and the content each own their
 * scrollbar, so the menu never travels with the page — sticky positioning
 * could not guarantee that, because on sections shorter than the nav the flex
 * row collapsed to the sidebar's height and sticky had no room to move.
 *
 * The row still wraps intrinsically (flex-wrap, no media queries); below the
 * wrap point the nav sits above the content and the page scrolls as one.
 */
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
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ "--admin-header-h": `${ADMIN_HEADER_H}px` } as React.CSSProperties}
    >
      <AdminHeader
        email={session.user.email ?? undefined}
        displayName={session.profile.display_name ?? undefined}
        avatarUrl={headerAvatarUrl}
      />
      <div
        className="mx-auto flex w-full min-h-0 max-w-[1520px] flex-1 flex-wrap items-stretch overflow-hidden"
        style={{
          gap: "clamp(20px, 3vw, 40px)",
          padding: "clamp(16px, 3vw, 32px)",
        }}
      >
        <AdminSidebar notifications={notifications} />
        <main
          className="max-h-full min-h-0 min-w-0 overflow-y-auto"
          style={{ flex: "999 1 420px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
