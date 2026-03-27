"use server";

import { redirect } from "next/navigation";

import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export async function signOutAdmin() {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
