"use server";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export type ChangePasswordResult = { ok: true } | { error: string };

/**
 * Change the signed-in admin's password. Re-verifies the current password
 * first (Supabase's updateUser doesn't require it, but we do — so a walk-up
 * to an unlocked session can't silently reset the password), then updates.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  if (!isSupabaseAuthConfigured()) {
    return { error: "Authentication is not configured." };
  }

  const current = input.currentPassword ?? "";
  const next = input.newPassword ?? "";
  if (next.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }
  if (next === current) {
    return { error: "New password must be different from the current one." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Your session has expired — please sign in again." };
  }

  // Verify the current password on a throwaway client so the session cookie
  // isn't disturbed by the check.
  const verifier = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    auth: { persistSession: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verifyErr) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: next,
  });
  if (updateErr) {
    return { error: updateErr.message };
  }
  return { ok: true };
}
