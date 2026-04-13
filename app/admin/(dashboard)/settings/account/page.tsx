import type { Metadata } from "next";

import { AccountSettingsForms } from "@/components/portal/settings/account-settings-forms";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  createServiceClient,
  isSupabaseConfigured,
  signProfileAvatarUrl,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My account",
};

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const session = await requireAdminUser();
  const { data: profile } = await session.supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", session.user.id)
    .maybeSingle();

  const row = profile as {
    display_name: string | null;
    avatar_path: string | null;
  } | null;

  let avatarPreviewUrl: string | null = null;
  const ap = row?.avatar_path?.trim();
  if (ap && isSupabaseConfigured()) {
    avatarPreviewUrl = await signProfileAvatarUrl(createServiceClient(), ap);
  }

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
        displayName={row?.display_name ?? null}
        avatarPreviewUrl={avatarPreviewUrl}
      />
    </div>
  );
}
