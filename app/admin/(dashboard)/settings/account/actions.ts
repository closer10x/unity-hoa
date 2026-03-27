"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";

export async function updateMyProfile(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { user, supabase } = await requireAdminUser();
    const display_name = String(formData.get("display_name") ?? "").trim();
    if (!display_name) {
      return { error: "Display name is required" };
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name })
      .eq("id", user.id);
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/account");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateMyEmail(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdminUser();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) {
      return { error: "Email is required" };
    }
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin/settings/account");
    return {
      ok: true,
    };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateMyPassword(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdminUser();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("password_confirm") ?? "");
    if (!password || password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }
    if (password !== confirm) {
      return { error: "Passwords do not match" };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin/settings/account");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
