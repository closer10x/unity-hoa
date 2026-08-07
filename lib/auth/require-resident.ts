import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export type ResidentProfile = {
  role: string;
  display_name: string | null;
  phone: string | null;
  unit_lot: string | null;
  avatar_path: string | null;
};

export type ResidentSession = {
  user: { id: string; email?: string | null };
  profile: ResidentProfile;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

/**
 * Local development only: with no Supabase project configured there is no way
 * to sign in, so the portal would be unreachable. Mirror of the admin guard's
 * fallback — both conditions are required, so it can never apply in production.
 */
const ALLOW_UNCONFIGURED_DEV_ACCESS =
  process.env.NODE_ENV !== "production" && !isSupabaseAuthConfigured();

const DEV_SESSION: ResidentSession = {
  user: { id: "dev-local", email: "resident@localhost" },
  profile: {
    role: "basic",
    display_name: "Local resident",
    phone: null,
    unit_lot: null,
    avatar_path: null,
  },
  // No client exists without configuration; nothing on this path queries it.
  supabase: null as unknown as ResidentSession["supabase"],
};

/**
 * Any signed-in account with a profile may open the resident portal — a
 * resident sees their own records, and a staff account previewing the portal
 * simply has no lot linked. Unlike the admin guard there is no role gate:
 * the data layer scopes every read to the session's own user id.
 */
export const requireResidentUser = cache(async (): Promise<ResidentSession> => {
  if (ALLOW_UNCONFIGURED_DEV_ACCESS) {
    return DEV_SESSION;
  }

  if (!isSupabaseAuthConfigured()) {
    redirect("/portal/login?error=config");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/portal/login");
  }

  // Select * so DBs missing newer columns still return a row — explicit
  // column lists make PostgREST error and cause login ↔ portal redirect loops.
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // A signed-in user with no profiles row (signup-trigger gap) would loop
  // between here and the login page, which redirects signed-in users back.
  // Heal it the way the trigger would have: a minimal basic-role row.
  if (!profileError && !profile && isSupabaseConfigured()) {
    const service = createServiceClient();
    await service
      .from("profiles")
      .upsert({ id: user.id, role: "basic" }, { onConflict: "id" });
    const retry = await service
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = retry.data;
    profileError = retry.error;
  }

  if (profileError || !profile) {
    redirect("/portal/login?error=profile_error");
  }

  const row = profile as {
    role: string;
    display_name?: string | null;
    phone?: string | null;
    unit_lot?: string | null;
    avatar_path?: string | null;
  };

  return {
    user: { id: user.id, email: user.email },
    profile: {
      role: row.role,
      display_name: row.display_name ?? null,
      phone: row.phone ?? null,
      unit_lot: row.unit_lot ?? null,
      avatar_path: row.avatar_path ?? null,
    },
    supabase,
  };
});
