import type { Metadata } from "next";

import Shell from "@/components/admin/Shell";
import { StoreProvider } from "@/lib/admin-portal/store";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Management Portal",
};

export const dynamic = "force-dynamic";

/**
 * The admin portal. All 15 sections live inside <Shell>, which routes between
 * them client-side, so this is the single authenticated entry point.
 */
export default async function AdminPortalPage() {
  await requireAdminUser();

  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
