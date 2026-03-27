import type { Metadata } from "next";

import { PortalUsersManager } from "@/components/portal/settings/portal-users-manager";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import { listPortalUsers } from "./actions";

export const metadata: Metadata = {
  title: "Users",
};

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <p className="text-sm text-on-surface-variant">
        Service role key is required to list and create users. Configure
        Supabase in <code className="text-xs bg-surface-container-high px-1 rounded">.env.local</code>.
      </p>
    );
  }

  const res = await listPortalUsers();
  if ("error" in res) {
    return (
      <p className="text-error text-sm" role="alert">
        {res.error}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        Portal users
      </h2>
      <PortalUsersManager initial={res.items} />
    </div>
  );
}
