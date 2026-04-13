"use server";

import { timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

function deletePasswordFromEnv(): string | null {
  const p = process.env.FINANCE_DELETE_RESIDENT_PAYMENT_PASSWORD;
  if (typeof p !== "string" || p.length === 0) return null;
  return p;
}

function passwordsMatch(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function deleteResidentPayment(
  paymentId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminUser();
  const configured = deletePasswordFromEnv();
  if (configured == null) {
    return { ok: false, error: "Payment delete is not configured." };
  }
  const password = String(formData.get("delete_password") ?? "");
  if (!password) {
    return { ok: false, error: "Enter the delete password." };
  }
  if (!passwordsMatch(configured, password)) {
    return { ok: false, error: "Incorrect password." };
  }
  const id = paymentId.trim();
  if (!id) {
    return { ok: false, error: "Invalid payment id." };
  }
  const supabase = requireServiceSupabase();
  const { error } = await supabase.from("resident_payments").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/finances");
  return { ok: true };
}
