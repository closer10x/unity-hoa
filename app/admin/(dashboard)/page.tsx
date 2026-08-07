import type { Metadata } from "next";

import Shell from "@/components/admin/Shell";
import { sectionsForRole } from "@/lib/admin-portal/permissions";
import { StoreProvider } from "@/lib/admin-portal/store";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Management Portal",
};

export const dynamic = "force-dynamic";

/**
 * The admin portal. All 15 sections live inside <Shell>, which routes between
 * them client-side, so this is the single authenticated entry point. The
 * session's staff_role decides which sections the Shell may show.
 */
export default async function AdminPortalPage() {
  const session = await requireAdminUser();
  const staffRole = session.profile.staff_role;
  const actor =
    session.profile.display_name?.trim() ||
    session.user.email ||
    "Unity Grid administrator";

  return (
    <StoreProvider
      allowedSections={[...sectionsForRole(staffRole)]}
      currentUser={staffRole ? `${actor} · ${staffRole}` : actor}
    >
      <Shell />
    </StoreProvider>
  );
}
