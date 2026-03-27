"use server";

import { redirect } from "next/navigation";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/admin").trim();
  const next = normalizeAdminNext(nextRaw);

  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }

  if (!email || !password) {
    redirect(
      `/admin/login?error=missing&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInErr) {
    redirect(
      `/admin/login?error=credentials&next=${encodeURIComponent(next)}`,
    );
  }

  const user =
    signInData.user ??
    signInData.session?.user ??
    (await supabase.auth.getUser()).data.user;

  if (!user) {
    redirect(
      `/admin/login?error=credentials&next=${encodeURIComponent(next)}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const missingProfilesTable =
    profileError != null &&
    (profileError.code === "PGRST205" ||
      Boolean(profileError.message?.includes("Could not find the table")));

  if (profileError) {
    await supabase.auth.signOut();
    if (missingProfilesTable) {
      redirect(
        `/admin/login?error=db_setup&next=${encodeURIComponent(next)}`,
      );
    }
    redirect(
      `/admin/login?error=profile_error&next=${encodeURIComponent(next)}`,
    );
  }

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }
  if (!email) {
    redirect("/admin/login?error=missing_email");
  }

  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin/settings/account`,
  });

  redirect("/admin/login?notice=reset_sent");
}
