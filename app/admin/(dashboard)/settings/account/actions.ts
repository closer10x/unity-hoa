"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import {
  PROFILE_AVATARS_BUCKET,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  ALLOWED_IMAGE_TYPES,
  extForMime,
} from "@/app/admin/(dashboard)/maintenance/maintenance-constants";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadMyAvatar(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase is not configured" };
    }
    const { user } = await requireAdminUser();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose an image to upload" };
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { error: `Image must be at most ${MAX_AVATAR_BYTES / 1024 / 1024}MB` };
    }
    const type = file.type;
    if (!ALLOWED_IMAGE_TYPES.has(type)) {
      return { error: "Use a JPEG, PNG, or WebP image" };
    }
    const ext = extForMime(type);
    if (!ext) {
      return { error: "Unsupported image type" };
    }

    const supabase = createServiceClient();
    const { data: existing } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .list(user.id);
    if (existing?.length) {
      await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .remove(existing.map((o) => `${user.id}/${o.name}`));
    }

    const storagePath = `${user.id}/avatar${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .upload(storagePath, buf, { contentType: type, upsert: true });
    if (upErr) {
      return { error: upErr.message };
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_path: storagePath })
      .eq("id", user.id);
    if (dbErr) {
      return { error: dbErr.message };
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
