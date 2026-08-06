import type { Metadata } from "next";

import { OwnersManager } from "@/components/portal/owners/owners-manager";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Owners",
};

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const session = await requireAdminUser();
  const actingStaff =
    session.profile.display_name?.trim() || session.user.email || "this account";

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1520px]">
        <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
          People
        </p>
        <h1 className="mt-2 mb-8 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
          Owners
        </h1>
        <OwnersManager actingStaff={actingStaff} />
      </div>
    </div>
  );
}
