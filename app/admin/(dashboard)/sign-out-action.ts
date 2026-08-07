"use server";

import { redirect } from "next/navigation";

import { recordAuthEvent } from "@/lib/auth/auth-events";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export async function signOutAdmin() {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    // Read the account before the session goes, or there is nothing to name.
    const { data } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    await recordAuthEvent({
      event: "sign_out",
      email: data.user?.email ?? null,
      userId: data.user?.id ?? null,
      succeeded: true,
    });
  }
  redirect("/admin/login");
}
