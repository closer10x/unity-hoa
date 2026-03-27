import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export type AdminProfile = {
  role: string;
  display_name: string | null;
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  let displayName: string | null = null;
  const displayRes = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!displayRes.error && displayRes.data) {
    displayName =
      (displayRes.data as { display_name: string | null }).display_name ?? null;
  }

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/admin/login?error=forbidden");
  }

  return {
    user: { id: user.id, email: user.email },
    profile: {
      role: profile.role,
      display_name: displayName,
    },
    supabase,
  };
});
