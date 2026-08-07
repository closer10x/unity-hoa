import type { Metadata } from "next";

import Shell from "@/components/resident/Shell";
import { loadResidentData } from "@/lib/resident-portal/server-data";
import { StoreProvider } from "@/lib/resident-portal/store";
import { requireResidentUser } from "@/lib/auth/require-resident";

export const metadata: Metadata = {
  title: "Resident Portal",
};

export const dynamic = "force-dynamic";

/**
 * The resident portal. All 11 sections live inside <Shell>, which routes
 * between them client-side; every read is scoped to the signed-in resident.
 */
export default async function ResidentPortalPage() {
  const session = await requireResidentUser();
  const residentName =
    session.profile.display_name?.trim() ||
    session.user.email ||
    "Resident";
  const data = await loadResidentData({
    id: session.user.id,
    email: session.user.email,
    displayName: session.profile.display_name,
  });

  return (
    <StoreProvider
      residentName={residentName}
      residentEmail={session.user.email ?? ""}
      residentPhone={session.profile.phone ?? ""}
      initialData={data}
    >
      <Shell />
    </StoreProvider>
  );
}
