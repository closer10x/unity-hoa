"use server";

import { revalidatePath } from "next/cache";

import { getServiceClientForAdmin } from "@/lib/auth/admin-service";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import type { ProfileRole } from "@/lib/types/settings";

export type ListedAuthUser = {
  id: string;
  email: string | undefined;
  created_at: string;
  role: ProfileRole;
};

export async function listPortalUsers(): Promise<
  { items: ListedAuthUser[] } | { error: string }
> {
  try {
    const service = await getServiceClientForAdmin();
    const { data, error } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (error) {
      return { error: error.message };
    }
    const ids = (data.users ?? []).map((u) => u.id);
    const roleMap = new Map<string, ProfileRole>();
    if (ids.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("id, role")
        .in("id", ids);
      for (const p of profiles ?? []) {
        const row = p as { id: string; role: ProfileRole };
        roleMap.set(row.id, row.role);
      }
    }
    const items: ListedAuthUser[] = (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      role: roleMap.get(u.id) ?? "basic",
    }));
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { items };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function createPortalUser(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const service = await getServiceClientForAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const roleRaw = String(formData.get("role") ?? "basic").trim();
    const role: ProfileRole =
      roleRaw === "admin" ? "admin" : "basic";

    if (!email || !password) {
      return { error: "Email and password are required" };
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }

    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return { error: error.message };
    }
    if (!data.user) {
      return { error: "User was not created" };
    }

    if (role === "admin") {
      const { error: upErr } = await service
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", data.user.id);
      if (upErr) {
        return { error: upErr.message };
      }
    }

    revalidatePath("/admin/settings/users");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deletePortalUser(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { user } = await requireAdminUser();
    const id = userId.trim();
    if (!id) {
      return { error: "User id is required" };
    }
    if (id === user.id) {
      return { error: "You cannot remove your own account" };
    }

    const service = await getServiceClientForAdmin();
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/settings/users");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
