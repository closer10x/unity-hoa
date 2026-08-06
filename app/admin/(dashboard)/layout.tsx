import { AdminHeader } from "@/components/portal/admin-header";
import { AdminSidebar } from "@/components/portal/admin-sidebar";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { loadAdminNotificationsForHeader } from "@/lib/notifications/load";
import {
  createServiceClient,
  isSupabaseConfigured,
  signProfileAvatarUrl,
} from "@/lib/supabase/server";

/**
 * Admin shell, per docs/design/handoff.md "Application shell".
 *
 * Body is `display: flex; flex-wrap: wrap; align-items: flex-start` with a
 * fluid gap and padding. The sidebar is `flex: 1 1 236px` and sticky; main is
 * `flex: 999 1 420px; min-width: 0` — the lopsided grow factor keeps the
 * sidebar at its natural width on desktop and forces a clean wrap below about
 * 700px. Intrinsic layout, no media queries.
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
    <div className="min-h-screen">
      <AdminHeader
        email={session.user.email ?? undefined}
        displayName={session.profile.display_name ?? undefined}
        avatarUrl={headerAvatarUrl}
      />
      <div
        className="mx-auto flex w-full max-w-[1520px] flex-wrap items-start"
        style={{
          gap: "clamp(20px, 3vw, 40px)",
          padding: "clamp(16px, 3vw, 32px)",
        }}
      >
        <AdminSidebar notifications={notifications} />
        <main className="min-w-0" style={{ flex: "999 1 420px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
