import type { Metadata } from "next";

import { AccountSettingsForms } from "@/components/portal/settings/account-settings-forms";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "My account",
};

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const session = await requireAdminUser();
  const { data: profile } = await session.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .maybeSingle();

  return (
    <div className="space-y-2">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        My account
      </h2>
      <p className="text-sm text-on-surface-variant max-w-xl">
        Update how you appear in the admin portal and manage your sign-in
        credentials.
      </p>
      <AccountSettingsForms
        email={session.user.email}
        displayName={(profile as { display_name: string | null } | null)?.display_name}
      />
    </div>
  );
}
