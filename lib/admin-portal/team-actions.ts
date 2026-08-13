"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { ensureCrewLink } from "@/lib/crew/links";
import { isFieldRole } from "@/lib/crew/roles";
import { requireServiceSupabase } from "@/lib/supabase/service";

import {
  ALL_SECTIONS,
  SECTION_ACCESS,
  canManageStaff,
  isStaffRole,
} from "./permissions";
import { loadStaff } from "./server-data";
import type { Staff } from "./types";

/**
 * Editing a staff account touches up to three places that must stay in step:
 * the employees record (the roster), the profiles row (permissions), and the
 * auth user (sign-in email, password, metadata). Every save is audited with
 * what changed — never with the values of anything secret.
 */

type Ok = { ok: true; staff: Staff[]; changed: string };
type Fail = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function managerContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin" || !canManageStaff(session.profile.staff_role)) {
    throw new Error("Only an Administrator can manage staff accounts.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Administrator";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

/** The staff roster as the database has it — used to resync after an invite. */
export async function listStaffAccounts(): Promise<Ok | Fail> {
  try {
    const { db } = await managerContext();
    return { ok: true, staff: await loadStaff(db), changed: "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Switch an account off (or back on). Reversible, unlike removal: the
 * employees row keeps its history and the profile keeps its permissions —
 * the account simply can't sign in while it is off.
 */
export async function setStaffAccountActive(input: {
  employeeId: string | null;
  profileId: string | null;
  name: string;
  active: boolean;
}): Promise<Ok | Fail> {
  try {
    const { db, actorName, actorId } = await managerContext();
    const session = await requireAdminUser();

    if (!input.active && input.profileId && input.profileId === session.user.id) {
      return { ok: false, error: "You can't switch off your own account." };
    }

    if (input.employeeId) {
      const { error } = await db
        .from("employees")
        .update({ active: input.active })
        .eq("id", input.employeeId);
      if (error) throw new Error(error.message);
    }
    if (input.profileId) {
      const { error } = await db
        .from("profiles")
        .update({ disabled: !input.active })
        .eq("id", input.profileId);
      if (error) throw new Error(error.message);
    }
    if (!input.employeeId && !input.profileId) {
      return { ok: false, error: "That account has no record to change." };
    }

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Team: ${input.active ? "switched on" : "switched off"} the account for ${input.name}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    return {
      ok: true,
      staff: await loadStaff(db),
      changed: input.active ? "switched on" : "switched off",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Remove an account for good: the roster record goes, and so does the
 * sign-in account behind it. Work already logged against them survives —
 * those columns null out rather than cascade — and the audit trail keeps
 * the history. Two guards: nobody can remove themselves, and the last
 * Administrator can't be removed, which would lock everyone out.
 */
export async function removeStaffAccount(input: {
  employeeId: string | null;
  profileId: string | null;
  name: string;
}): Promise<Ok | Fail> {
  try {
    const { db, actorName, actorId } = await managerContext();
    const session = await requireAdminUser();

    if (input.profileId && input.profileId === session.user.id) {
      return { ok: false, error: "You can't remove your own account." };
    }

    if (input.profileId) {
      const { data: admins, error } = await db
        .from("profiles")
        .select("id, staff_role")
        .eq("role", "admin");
      if (error) throw new Error(error.message);
      const administrators = (admins ?? []).filter(
        (a) => a.staff_role === "Administrator" || a.staff_role === "Owner",
      );
      const isLast =
        administrators.length <= 1 &&
        administrators.some((a) => a.id === input.profileId);
      if (isLast) {
        return {
          ok: false,
          error:
            "This is the last Administrator account. Give someone else the Administrator role first, or the office would be locked out.",
        };
      }
    }

    if (!input.employeeId && !input.profileId) {
      return { ok: false, error: "That account has no record to remove." };
    }

    if (input.employeeId) {
      const { error } = await db.from("employees").delete().eq("id", input.employeeId);
      if (error) throw new Error(error.message);
    }

    if (input.profileId) {
      const { error: profErr } = await db
        .from("profiles")
        .delete()
        .eq("id", input.profileId);
      if (profErr) throw new Error(`Profile removal failed: ${profErr.message}`);
      const { error: authErr } = await db.auth.admin.deleteUser(input.profileId);
      // The profile is already gone, so a missing auth user is not a failure.
      if (authErr && !/not found/i.test(authErr.message)) {
        throw new Error(`Sign-in removal failed: ${authErr.message}`);
      }
    }

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Team: removed the staff account for ${input.name}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    return { ok: true, staff: await loadStaff(db), changed: "removed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateStaffAccount(input: {
  employeeId: string | null;
  profileId: string | null;
  /** The email the row currently shows — used to find the sign-in account. */
  currentEmail: string;
  name: string;
  email: string;
  role: string;
  communities: string[];
  /** Checked sections; null means "use the role's default". */
  sections: string[] | null;
  /** Per-person grant letting a field role change the crew schedule. */
  canEditSchedule?: boolean;
  /** Optional password reset; never logged. */
  newPassword?: string;
}): Promise<Ok | Fail> {
  try {
    const { db, actorName, actorId } = await managerContext();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false, error: "The name can't be empty." };
    if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
    if (!isStaffRole(input.role)) return { ok: false, error: "Pick a valid role." };
    const role = input.role;

    const password = input.newPassword?.trim() ?? "";
    if (password && password.length < 8) {
      return { ok: false, error: "A new password needs at least 8 characters." };
    }

    const communities = input.communities.filter(
      (c) => typeof c === "string" && c.length < 80,
    );

    // Store null when the checked set matches the role default, so the role
    // stays the source of truth until someone deliberately customizes.
    const checked = (input.sections ?? []).filter((s) =>
      (ALL_SECTIONS as readonly string[]).includes(s),
    );
    const roleDefault = SECTION_ACCESS[role];
    const isDefault =
      input.sections == null ||
      (checked.length === roleDefault.length &&
        roleDefault.every((s) => checked.includes(s)));
    const sectionAccess = isDefault ? null : checked;

    const changes: string[] = [];

    // ── employees record ──
    if (input.employeeId) {
      const { data: before, error } = await db
        .from("employees")
        .select("name, email, role")
        .eq("id", input.employeeId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (before) {
        if (before.name !== name) changes.push(`name → ${name}`);
        if ((before.email ?? "").toLowerCase() !== email) changes.push(`email → ${email}`);
        if (before.role !== role) changes.push(`role → ${role}`);
        const { error: upErr } = await db
          .from("employees")
          .update({ name, email, role, communities })
          .eq("id", input.employeeId);
        if (upErr) throw new Error(upErr.message);
      }

      /* Product rule: a field employee always has a job board. Being made a
         tech in the edit panel is as much a way into the field as being
         invited as one, and this path used to leave them with no board at
         all. Idempotent, so someone who already has a link keeps it. */
      if (isFieldRole(role)) {
        const link = await ensureCrewLink(input.employeeId, actorId);
        if (link && before && !isFieldRole(before.role)) {
          changes.push("job-board link issued");
        }
      }
    }

    // ── sign-in account (auth user + profile) ──
    let authUserId = input.profileId;
    if (!authUserId) {
      // The row may still have a sign-in account we haven't linked — match
      // the auth user by the email the row showed.
      const current = input.currentEmail.trim().toLowerCase();
      if (current && current !== "—") {
        try {
          const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
          authUserId =
            data?.users.find((u) => u.email?.toLowerCase() === current)?.id ?? null;
        } catch {
          authUserId = null;
        }
      }
    }

    if (authUserId) {
      const authUpdate: {
        email?: string;
        password?: string;
        user_metadata: Record<string, string>;
      } = { user_metadata: { display_name: name, staff_role: role } };
      const currentEmail = input.currentEmail.trim().toLowerCase();
      if (email && email !== currentEmail) authUpdate.email = email;
      if (password) authUpdate.password = password;

      const { error: authErr } = await db.auth.admin.updateUserById(authUserId, authUpdate);
      if (authErr) throw new Error(`Sign-in update failed: ${authErr.message}`);
      if (authUpdate.email) changes.push(`sign-in email → ${email}`);
      if (password) changes.push("password reset");

      const { data: profBefore } = await db
        .from("profiles")
        .select("display_name, staff_role, section_access")
        .eq("id", authUserId)
        .maybeSingle();
      if ((profBefore?.display_name ?? "") !== name && !changes.some((c) => c.startsWith("name")))
        changes.push(`name → ${name}`);
      if ((profBefore?.staff_role ?? "") !== role && !changes.some((c) => c.startsWith("role")))
        changes.push(`role → ${role}`);
      const beforeAccess = profBefore?.section_access ?? null;
      const accessChanged =
        JSON.stringify(beforeAccess?.slice().sort() ?? null) !==
        JSON.stringify(sectionAccess?.slice().sort() ?? null);
      if (accessChanged) {
        changes.push(
          sectionAccess
            ? `custom access (${sectionAccess.length} section${sectionAccess.length === 1 ? "" : "s"})`
            : "access reset to role default",
        );
      }

      const { error: profErr } = await db.from("profiles").upsert({
        id: authUserId,
        role: "admin",
        staff_role: role,
        display_name: name,
        section_access: sectionAccess,
        communities,
        can_edit_schedule: Boolean(input.canEditSchedule),
      });
      if (profErr) throw new Error(`Profile update failed: ${profErr.message}`);
    } else if (password) {
      return {
        ok: false,
        error:
          "This person has no sign-in account yet, so there's no password to set. Send them an invite first.",
      };
    }

    const changed = changes.length ? changes.join(", ") : "communities covered";
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Team: updated ${name} — ${changed}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    return { ok: true, staff: await loadStaff(db), changed };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
