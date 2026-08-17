"use server";

import { redirect } from "next/navigation";

import { recordAuthEvent } from "@/lib/auth/auth-events";
import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { emailLinksAreLocal } from "@/lib/email/link-base-url";
import { buildConfirmUrl } from "@/lib/email/set-password-link";
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
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
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

  /* The host the recipient clicks from, not the one this process runs on —
     built from NEXT_PUBLIC_SITE_URL this was localhost in production, which
     is a dead link in every inbox it reached. */
  if (emailLinksAreLocal()) {
    redirect("/admin/login?error=reset_unavailable");
  }

  /* The link is generated with the service key and delivered through Resend:
     Supabase's own mailer is rate-limited to a couple of messages an hour and
     rejects addresses it cannot verify, so resets went nowhere. */
  let delivery: "sent" | "failed" = "sent";
  try {
    const service = requireServiceSupabase();
    /* token_hash through /auth/confirm, not GoTrue's action_link: the action
       link hands its tokens back in the URL fragment, which a server route
       never sees, so the reset died at "link expired or is invalid". */
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    const hashed = data?.properties?.hashed_token;
    const link = error || !hashed ? null : buildConfirmUrl(hashed, "recovery", "admin", "reset");
    if (link) {
      const name =
        (data.user?.user_metadata?.display_name as string | undefined)?.trim() || "";
      const sent = await sendPasswordResetViaResend({
        name,
        email,
        resetUrl: link,
        portalLabel: "admin portal",
      });
      // A refused send says nothing about whether the account exists, so it
      // is safe to report — and useless to hide.
      if ("error" in sent) delivery = "failed";
    }
  } catch {
    delivery = "failed";
  }

  await recordAuthEvent({
    event: "password_reset_requested",
    email,
    succeeded: delivery === "sent",
    failureReason: delivery === "failed" ? "Reset email could not be sent" : undefined,
  });

  if (delivery === "failed") {
    redirect("/admin/login?error=reset_failed");
  }
  redirect("/admin/login?notice=reset_sent");
}
