"use server";

import { redirect } from "next/navigation";

import { recordAuthEvent } from "@/lib/auth/auth-events";
import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { sendPasswordResetViaResend } from "@/lib/email/send-password-reset";
import { requireServiceSupabase } from "@/lib/supabase/service";
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
    // Our own label, not the provider's message: the log must not hint at
    // which half of the credentials was wrong.
    await recordAuthEvent({
      event: "sign_in",
      email,
      succeeded: false,
      failureReason: "Incorrect email or password",
    });
    redirect(
      `/admin/login?error=credentials&next=${encodeURIComponent(next)}`,
    );
  }

  const user =
    signInData.user ??
    signInData.session?.user ??
    (await supabase.auth.getUser()).data.user;

  if (!user) {
    await recordAuthEvent({
      event: "sign_in",
      email,
      succeeded: false,
      failureReason: "No session returned",
    });
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
    // They authenticated fine — they're just a resident, not staff. Don't
    // dead-end them on "forbidden"; they belong in the resident portal, and
    // their session is already valid there.
    await recordAuthEvent({
      event: "sign_in",
      email,
      userId: user.id,
      succeeded: true,
    });
    redirect("/portal");
  }

  await recordAuthEvent({
    event: "sign_in",
    email,
    userId: user.id,
    succeeded: true,
  });

  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }
  if (!email) {
    redirect("/admin/login?error=missing_email");
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";

  /* The link is generated with the service key and delivered through Resend:
     Supabase's own mailer is rate-limited to a couple of messages an hour and
     rejects addresses it cannot verify, so resets went nowhere. */
  try {
    const service = requireServiceSupabase();
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/admin/profile` },
    });
    const link = data?.properties?.action_link;
    if (!error && link) {
      const name =
        (data.user?.user_metadata?.display_name as string | undefined)?.trim() || "";
      await sendPasswordResetViaResend({
        name,
        email,
        resetUrl: link,
        portalLabel: "admin portal",
      });
    }
  } catch {
    // Never disclose whether the address matched an account.
  }

  await recordAuthEvent({
    event: "password_reset_requested",
    email,
    // Always true: we never reveal whether the address matched an account.
    succeeded: true,
  });

  redirect("/admin/login?notice=reset_sent");
}
