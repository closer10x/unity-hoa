"use server";

import { redirect } from "next/navigation";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { recordAuthEvent } from "@/lib/auth/auth-events";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Finishes a staff invite by setting the account's own password.
 *
 * The invite link already signed them in (a one-time token exchanged by
 * /auth/confirm), so this is an updateUser on their own session — no current
 * password to re-enter, and nothing here can touch another account.
 */

/** GoTrue's default minimum is 6; ask for more without being precious. */
const MIN_LENGTH = 8;

export async function setStaffPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = normalizeAdminNext(String(formData.get("next") ?? "/admin"));

  const back = (error: string) =>
    redirect(
      `/admin/set-password?error=${encodeURIComponent(error)}&next=${encodeURIComponent(next)}`,
    );

  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }
  if (password.length < MIN_LENGTH) {
    back("short");
  }
  if (password !== confirm) {
    back("mismatch");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The invite link is what signs them in; without it there is no session to
  // attach a password to.
  if (!user) {
    redirect("/admin/login?error=link_expired");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    await recordAuthEvent({
      event: "password_set",
      email: user.email ?? "",
      userId: user.id,
      succeeded: false,
      failureReason: error.message,
    });
    back("failed");
  }

  await recordAuthEvent({
    event: "password_set",
    email: user.email ?? "",
    userId: user.id,
    succeeded: true,
  });

  redirect(next);
}
