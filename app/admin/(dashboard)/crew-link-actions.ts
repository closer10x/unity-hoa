"use server";

import { revalidatePath } from "next/cache";

import { newCrewToken } from "@/lib/crew/links";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Issuing and revoking a field employee's job-board link.
 *
 * Admin-only: the link grants access to that employee's jobs without a login,
 * so minting one is a privileged act. Issuing replaces any live link, which
 * means "resend" and "rotate" are the same operation — the old URL stops
 * working the moment a new one is made.
 */

type Issued = { ok: true; url: string } | { error: string };

export async function issueCrewLink(employeeId: string): Promise<Issued> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const session = await requireAdminUser();
  if (session.profile.staff_role !== "Administrator") {
    return { error: "Only an Administrator can issue a crew link." };
  }

  const db = createServiceClient();

  const { data: emp } = await db
    .from("employees")
    .select("id, active")
    .eq("id", employeeId)
    .maybeSingle();
  if (!emp) return { error: "That employee no longer exists." };
  if (emp.active === false) return { error: "Enable the account before issuing a link." };

  // Revoke first: the unique index allows only one live link per employee.
  await db
    .from("crew_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("revoked_at", null);

  const token = newCrewToken();
  const { error } = await db.from("crew_links").insert({
    employee_id: employeeId,
    token,
    created_by: session.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return { ok: true, url: `${base}/crew/${token}` };
}

export async function revokeCrewLink(employeeId: string): Promise<{ ok: true } | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const session = await requireAdminUser();
  if (session.profile.staff_role !== "Administrator") {
    return { error: "Only an Administrator can revoke a crew link." };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("crew_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("revoked_at", null);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
