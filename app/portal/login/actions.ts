"use server";

import { redirect } from "next/navigation";

import { recordAuthEvent } from "@/lib/auth/auth-events";
import { normalizePortalNext } from "@/lib/resident-portal/normalize-next";
import { sendPasswordResetViaResend } from "@/lib/email/send-password-reset";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export async function signInResident(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/portal").trim();
  const next = normalizePortalNext(nextRaw);

  if (!isSupabaseAuthConfigured()) {
    redirect("/portal/login?error=config");
  }

  if (!email || !password) {
    redirect(`/portal/login?error=missing&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInErr } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInErr) {
    // Our own label, not the provider's message: the log must not hint at
    // which half of the credentials was wrong.
    await recordAuthEvent({
      event: "sign_in",
      email,
      succeeded: false,
      failureReason: "Incorrect email or password",
    });
    redirect(`/portal/login?error=credentials&next=${encodeURIComponent(next)}`);
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
    redirect(`/portal/login?error=credentials&next=${encodeURIComponent(next)}`);
  }

  await recordAuthEvent({
    event: "sign_in",
    email,
    userId: user.id,
    succeeded: true,
  });

  redirect(next);
}

export async function requestResidentPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isSupabaseAuthConfigured()) {
    redirect("/portal/login?error=config");
  }
  if (!email) {
    redirect("/portal/login?error=missing_email");
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";

  /* Delivered through Resend like the rest of the app's mail: Supabase's own
     mailer is rate-limited and refuses addresses it cannot verify, so resets
     were going nowhere. */
  try {
    const service = requireServiceSupabase();
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/portal` },
    });
    const link = data?.properties?.action_link;
    if (!error && link) {
      const name =
        (data.user?.user_metadata?.display_name as string | undefined)?.trim() || "";
      await sendPasswordResetViaResend({
        name,
        email,
        resetUrl: link,
        portalLabel: "resident portal",
      });
    }
  } catch {
    // Never disclose whether the address matched an account.
  }

  await recordAuthEvent({
    event: "password_reset_requested",
    email,
    succeeded: true,
  });

  // Always the same notice — whether the account exists is not disclosed.
  redirect("/portal/login?notice=reset_sent");
}
