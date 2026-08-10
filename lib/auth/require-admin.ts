import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export type AdminProfile = {
  role: string;
  /** Drives per-section permissions; null (pre-migration account) = full access. */
  staff_role: string | null;
  display_name: string | null;
  avatar_path: string | null;
  /** Per-account section override; null = derive from staff_role. */
  section_access: string[] | null;
  /** Per-person grant letting a field role change the crew schedule. */
  can_edit_schedule: boolean;
};

export type AdminSession = {
  user: { id: string; email?: string | null };
  profile: AdminProfile;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

/**
 * Local development only: with no Supabase project configured there is no way
 * to sign in, so the portal — which runs on fixtures — would be unreachable.
 * Rather than gate it behind an auth system that cannot answer, fall through
 * to a stub session.
 *
 * Both conditions are required, so this can never apply in production: the
 * build is production and, once keys exist, the real check runs instead.
 */
const ALLOW_UNCONFIGURED_DEV_ACCESS =
  process.env.NODE_ENV !== "production" && !isSupabaseAuthConfigured();

const DEV_SESSION: AdminSession = {
  user: { id: "dev-local", email: "dev@localhost" },
  profile: {
    role: "admin",
    staff_role: "Administrator",
    display_name: "Local dev",
    avatar_path: null,
    section_access: null,
    can_edit_schedule: true,
  },
  // No client exists without configuration; nothing on this path queries it.
  supabase: null as unknown as AdminSession["supabase"],
};

export const requireAdminUser = cache(async (): Promise<AdminSession> => {
  if (ALLOW_UNCONFIGURED_DEV_ACCESS) {
    return DEV_SESSION;
  }

  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  // Use * so DBs missing newer columns (e.g. avatar_path) still return a row;
  // explicit column lists make PostgREST error and caused login ↔ /admin redirect loops.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/admin/login?error=forbidden");
  }

  // An account switched off in Team keeps its record but loses its access.
  if ((profile as { disabled?: boolean | null }).disabled) {
    redirect("/admin/login?error=disabled");
  }

  const row = profile as {
    role: string;
    staff_role?: string | null;
    display_name?: string | null;
    avatar_path?: string | null;
    section_access?: string[] | null;
    can_edit_schedule?: boolean | null;
  };

  return {
    user: { id: user.id, email: user.email },
    profile: {
      role: row.role,
      staff_role: row.staff_role ?? null,
      display_name: row.display_name ?? null,
      avatar_path: row.avatar_path ?? null,
      section_access: row.section_access ?? null,
      can_edit_schedule: Boolean(row.can_edit_schedule),
    },
    supabase,
  };
});
