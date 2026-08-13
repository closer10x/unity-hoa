"use server";

import { revalidatePath } from "next/cache";

import { canManageStaff } from "@/lib/admin-portal/permissions";
import { newCrewToken } from "@/lib/crew/links";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Issuing and revoking a field employee's job-board link.
 *
 * Restricted to the accounts that manage staff, because the link *is* the
 * credential: anyone holding it sees that employee's jobs without signing in.
 * Issuing replaces any live link, which means "resend" and "rotate" are the
 * same operation — the old URL stops working the moment a new one is made.
 * Both are stamped in the audit trail like every other mutation.
 */

type Issued = { ok: true; url: string } | { error: string };

async function manager() {
  const session = await requireAdminUser();
  if (!canManageStaff(session.profile.staff_role as string | null)) return null;
  return session;
}

async function stamp(
  db: ReturnType<typeof createServiceClient>,
  session: NonNullable<Awaited<ReturnType<typeof manager>>>,
  action: string,
) {
  await db.from("admin_audit_log").insert({
    action,
    actor_name: session.profile.display_name?.trim() || session.user.email || "Staff",
    actor_user_id: session.user.id,
  });
}

export async function issueCrewLink(employeeId: string): Promise<Issued> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const session = await manager();
  if (!session) return { error: "Only an Owner or Administrator can issue a crew link." };

  const db = createServiceClient();

  const { data: emp } = await db
    .from("employees")
    .select("id, name, active")
    .eq("id", employeeId)
    .maybeSingle();
  if (!emp) return { error: "That employee no longer exists." };
  if (emp.active === false) return { error: "Switch the account back on before issuing a link." };

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

  await stamp(db, session, `Issued a new job-board link for ${emp.name ?? "a field employee"} — any earlier link stopped working`);

  revalidatePath("/admin");

  /* The mailing base, not NEXT_PUBLIC_SITE_URL: this URL is texted to a
     phone, and a localhost link there is a dead one. */
  return { ok: true, url: `${getEmailBaseUrl()}/crew/${token}` };
}

export async function revokeCrewLink(employeeId: string): Promise<{ ok: true } | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const session = await manager();
  if (!session) return { error: "Only an Owner or Administrator can revoke a crew link." };

  const db = createServiceClient();
  const { data: emp } = await db
    .from("employees")
    .select("name")
    .eq("id", employeeId)
    .maybeSingle();

  const { error } = await db
    .from("crew_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("revoked_at", null);
  if (error) return { error: error.message };

  await stamp(db, session, `Revoked the job-board link for ${emp?.name ?? "a field employee"}`);

  revalidatePath("/admin");
  return { ok: true };
}
