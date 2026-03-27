"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import type { CommunitySettingsRow } from "@/lib/types/settings";

export async function getCommunitySettings(): Promise<
  { row: CommunitySettingsRow } | { error: string }
> {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase
      .from("community_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      return { error: error.message };
    }
    if (!data) {
      return { error: "Community settings row is missing (run migrations)" };
    }
    return { row: data as CommunitySettingsRow };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateCommunitySettings(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdminUser();
    const association_name = opt(formData.get("association_name"));
    const support_email = opt(formData.get("support_email"));
    const timezone = opt(formData.get("timezone"));
    const mailing_address = opt(formData.get("mailing_address"));
    const allow_resident_directory =
      formData.get("allow_resident_directory") === "on";

    const { error } = await supabase
      .from("community_settings")
      .update({
        association_name,
        support_email,
        timezone,
        mailing_address,
        allow_resident_directory,
      })
      .eq("id", 1);
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin/settings/organization");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function opt(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
