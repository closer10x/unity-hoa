import type { Metadata } from "next";

import { SectionByKey } from "@/components/portal/section-by-key";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Communities" };

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireAdminUser();
  const actingStaff =
    session.profile.display_name?.trim() || session.user.email || "this account";

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1520px]">
        <SectionByKey sectionKey="communities" actingStaff={actingStaff} />
      </div>
    </div>
  );
}
