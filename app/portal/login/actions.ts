"use server";

import { redirect } from "next/navigation";

import { recordAuthEvent } from "@/lib/auth/auth-events";
import { emailLinksAreLocal } from "@/lib/email/link-base-url";
import { buildConfirmUrl } from "@/lib/email/set-password-link";
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

  /* The host the recipient will click from, not the one this process happens
     to be running on. Built from NEXT_PUBLIC_SITE_URL, this was "http://
     localhost:3001" in production — every reset email sent somebody to a dead
     link on their own machine. getEmailBaseUrl() is what the rest of the
     app's mail uses and it refuses a local host outright. */
  if (emailLinksAreLocal()) {
    redirect("/portal/login?error=reset_unavailable");
  }

  /* Delivered through Resend like the rest of the app's mail: Supabase's own
     mailer is rate-limited and refuses addresses it cannot verify, so resets
     were going nowhere. */
  let delivery: "sent" | "failed" = "sent";
  try {
    const service = requireServiceSupabase();
    /* One token, minted once. GoTrue's action_link returns its tokens in the
       URL fragment, which a server route never sees, so every reset landed on
       "link expired or is invalid"; the token_hash goes through
       /auth/confirm, which exchanges it server-side — the same path the
       invites take. Minting twice would be worse than useless: the second
       token invalidates the first, so the link in the email would be dead on
       arrival. */
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    const hashed = data?.properties?.hashed_token;
    const link = error || !hashed ? null : buildConfirmUrl(hashed, "recovery", "portal", "reset");
    if (link) {
      const name =
        (data?.user?.user_metadata?.display_name as string | undefined)?.trim() || "";
      const sent = await sendPasswordResetViaResend({
        name,
        email,
        resetUrl: link,
        portalLabel: "resident portal",
      });
      /* A bounced send is not a secret — it says nothing about whether the
         account exists, and swallowing it left the resident staring at
         "check your inbox" for a message that was never accepted. */
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
    redirect("/portal/login?error=reset_failed");
  }
  // Otherwise always the same notice — whether the account exists is not disclosed.
  redirect("/portal/login?notice=reset_sent");
}
