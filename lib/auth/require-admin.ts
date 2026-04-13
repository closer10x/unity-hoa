import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export type AdminProfile = {
  role: string;
  display_name: string | null;
  avatar_path: string | null;
};

export type AdminSession = {
  user: { id: string; email?: string | null };
  profile: AdminProfile;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export const requireAdminUser = cache(async (): Promise<AdminSession> => {
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

  const row = profile as {
    role: string;
    display_name?: string | null;
    avatar_path?: string | null;
  };

  return {
    user: { id: user.id, email: user.email },
    profile: {
      role: row.role,
      display_name: row.display_name ?? null,
      avatar_path: row.avatar_path ?? null,
    },
    supabase,
  };
});
