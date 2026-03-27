"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { rethrowIfRedirect } from "@/lib/auth/rethrow-redirect";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { EmployeeRow } from "@/lib/types/maintenance";

async function requireAdminServiceClient() {
  await requireAdminUser();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return createServiceClient();
}

export async function listEmployees(): Promise<
  { items: EmployeeRow[] } | { error: string }
> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  const supabase = await requireAdminServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return { error: error.message };
  }
  return { items: (data ?? []) as EmployeeRow[] };
}

export async function listActiveEmployees(): Promise<
  { items: Pick<EmployeeRow, "id" | "name">[] } | { error: string }
> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  const supabase = await requireAdminServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) {
    return { error: error.message };
  }
  return { items: (data ?? []) as Pick<EmployeeRow, "id" | "name">[] };
}

export async function createEmployee(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await requireAdminServiceClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { error: "Name is required" };
    }
    const role = opt(formData.get("role"));
    const email = opt(formData.get("email"));
    const phone = opt(formData.get("phone"));
    const active = parseActive(formData, true);

    const { error } = await supabase.from("employees").insert({
      name,
      role,
      email,
      phone,
      active,
    });
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin/settings/employees");
    revalidatePath("/admin/maintenance");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateEmployee(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await requireAdminServiceClient();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { error: "Missing id" };
    }
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { error: "Name is required" };
    }
    const role = opt(formData.get("role"));
    const email = opt(formData.get("email"));
    const phone = opt(formData.get("phone"));
    const active = parseActive(formData, false);

    const { error } = await supabase
      .from("employees")
      .update({ name, role, email, phone, active })
      .eq("id", id);
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/admin/settings/employees");
    revalidatePath("/admin/maintenance");
    return { ok: true };
  } catch (e) {
    rethrowIfRedirect(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteEmployee(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured" };
  }
  const supabase = await requireAdminServiceClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin/settings/employees");
  revalidatePath("/admin/maintenance");
  return { ok: true };
}

function opt(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** For create, defaultActive when field absent; for update, absent means inactive. */
function parseActive(formData: FormData, defaultWhenMissing: boolean): boolean {
  const v = formData.get("active");
  if (v == null) return defaultWhenMissing;
  const s = String(v);
  return s === "true" || s === "on";
}
