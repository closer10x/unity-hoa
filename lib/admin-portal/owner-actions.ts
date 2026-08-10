"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { mintSetPasswordUrl } from "@/lib/email/set-password-link";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { Owner } from "./types";

/**
 * Editing a resident touches the profiles row (name, phone), the auth user
 * (sign-in email), and the lot link. Every save is audited with what changed.
 */

type Ok = { ok: true; owner: Owner; changed: string };
type Fail = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can edit residents.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  const isAdministrator =
    session.profile.staff_role === "Administrator" ||
    session.profile.staff_role === "Owner";
  return { db, actorName, actorId, isAdministrator };
}

type LotRow = {
  id: string;
  community: string | null;
  account_number: string | null;
  lot_number: string | null;
  street_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  owner_profile_id: string | null;
};

function toOwnerRow(
  l: LotRow,
  p: { display_name: string | null; phone: string | null } | null,
): Owner {
  const street = [l.street_number, l.street_name].filter(Boolean).join(" ");
  const cityLine = [l.city, [l.state, l.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return {
    id: l.id,
    name: p?.display_name?.trim() || "Unassigned lot",
    address: [street, cityLine].filter(Boolean).join(", ") || "No address recorded",
    contact: p?.phone?.trim() || "—",
    balance: "—",
    status: p ? "Owner on file" : "No owner linked",
    scope: l.community ?? "all",
    flag: p ? "current" : "tenant",
    account: l.account_number ?? (l.lot_number ? `Lot ${l.lot_number}` : l.id.slice(0, 8)),
  };
}

/** Current editable details for the drawer — email lives on the auth user. */
export async function getOwnerEditData(
  lotId: string,
): Promise<
  | { ok: true; name: string; email: string; phone: string; linked: boolean }
  | Fail
> {
  try {
    const { db } = await officeContext();
    const { data: lot, error } = await db
      .from("lots")
      .select("owner_profile_id")
      .eq("id", lotId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    if (!lot.owner_profile_id) {
      return { ok: true, name: "", email: "", phone: "", linked: false };
    }

    const { data: profile } = await db
      .from("profiles")
      .select("display_name, phone")
      .eq("id", lot.owner_profile_id)
      .maybeSingle();
    let email = "";
    try {
      const { data } = await db.auth.admin.getUserById(lot.owner_profile_id);
      email = data.user?.email ?? "";
    } catch {
      // No auth account is fine — the profile may predate the invite.
    }
    return {
      ok: true,
      name: profile?.display_name ?? "",
      email,
      phone: profile?.phone ?? "",
      linked: true,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function updateOwner(input: {
  lotId: string;
  name: string;
  email: string;
  phone: string;
  /** The email the drawer loaded — changes are detected against it. */
  currentEmail: string;
}): Promise<Ok | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    if (!name) return { ok: false, error: "The owner needs a name." };
    if (email && !EMAIL_RE.test(email)) {
      return { ok: false, error: "That email doesn't look right." };
    }

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("*")
      .eq("id", input.lotId)
      .maybeSingle();
    if (lotErr) throw new Error(lotErr.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    if (!lot.owner_profile_id) {
      return {
        ok: false,
        error: "No owner is linked to this lot — use “Add a homeowner” to link one.",
      };
    }

    const profileId = lot.owner_profile_id as string;
    const changes: string[] = [];

    const { data: before } = await db
      .from("profiles")
      .select("display_name, phone")
      .eq("id", profileId)
      .maybeSingle();
    if ((before?.display_name ?? "") !== name) changes.push(`name → ${name}`);
    if ((before?.phone ?? "") !== phone && (before?.phone || phone))
      changes.push(phone ? `mobile → ${phone}` : "mobile removed");

    const { error: profErr } = await db
      .from("profiles")
      .update({ display_name: name, phone: phone || null })
      .eq("id", profileId);
    if (profErr) throw new Error(`Profile update failed: ${profErr.message}`);

    const currentEmail = input.currentEmail.trim().toLowerCase();
    if (email && email !== currentEmail) {
      const { error: authErr } = await db.auth.admin.updateUserById(profileId, {
        email,
      });
      if (authErr) throw new Error(`Sign-in update failed: ${authErr.message}`);
      changes.push(`sign-in email → ${email}`);
    }

    if (changes.length > 0) {
      const address = [lot.street_number, lot.street_name].filter(Boolean).join(" ");
      const { error: auditErr } = await db.from("admin_audit_log").insert({
        action: `Owners: updated ${name} at ${address} — ${changes.join(", ")}`,
        actor_name: actorName,
        actor_user_id: actorId,
      });
      if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);
    }

    revalidatePath("/admin");
    return {
      ok: true,
      owner: toOwnerRow(lot as LotRow, { display_name: name, phone }),
      changed: changes.length ? changes.join(", ") : "no changes",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/** Administrator-only: detach the resident from the lot. The lot remains. */
export async function unlinkOwner(input: {
  lotId: string;
}): Promise<Ok | Fail> {
  try {
    const { db, actorName, actorId, isAdministrator } = await officeContext();
    if (!isAdministrator) {
      return { ok: false, error: "Only an Administrator can unlink an owner." };
    }

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("*")
      .eq("id", input.lotId)
      .maybeSingle();
    if (lotErr) throw new Error(lotErr.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    if (!lot.owner_profile_id) {
      return { ok: false, error: "This lot has no owner linked." };
    }

    const { data: profile } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", lot.owner_profile_id)
      .maybeSingle();
    const name = profile?.display_name?.trim() || "the owner";

    const { error: upErr } = await db
      .from("lots")
      .update({ owner_profile_id: null, assigned_at: null })
      .eq("id", input.lotId);
    if (upErr) throw new Error(upErr.message);

    const address = [lot.street_number, lot.street_name].filter(Boolean).join(" ");
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: unlinked ${name} from ${address}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    return {
      ok: true,
      owner: toOwnerRow({ ...(lot as LotRow), owner_profile_id: null }, null),
      changed: "unlinked",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/* ─── Second owners on the household, and re-sending sign-in details ─── */

export type HouseholdOwner = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  inviteStatus: string;
};

/** Everyone else on the deed for this lot, besides the primary owner. */
export async function listHouseholdOwners(
  lotId: string,
): Promise<{ ok: true; members: HouseholdOwner[] } | Fail> {
  try {
    const { db } = await officeContext();
    const { data: lot, error } = await db
      .from("lots")
      .select("owner_profile_id")
      .eq("id", lotId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lot?.owner_profile_id) return { ok: true, members: [] };

    const { data, error: mErr } = await db
      .from("household_members")
      .select("id, name, email, relationship, invite_status, removed_at")
      .eq("user_id", lot.owner_profile_id)
      .is("removed_at", null)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    return {
      ok: true,
      members: (data ?? []).map((m) => ({
        id: m.id as string,
        name: (m.name as string) ?? "",
        email: (m.email as string) ?? "",
        relationship: (m.relationship as string) ?? "Co-owner",
        inviteStatus: (m.invite_status as string) ?? "invited",
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Adds a second name on the deed. They get their own sign-in for the same
 * property, so the welcome email carries their own temporary password.
 */
export async function addHouseholdOwner(input: {
  lotId: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  sendWelcome: boolean;
}): Promise<{ ok: true; member: HouseholdOwner; note: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false, error: "Add the name on the deed." };
    if (!email) return { ok: false, error: "Add an email — the second owner needs one to sign in." };
    if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("id, owner_profile_id, lot_number, street_number, street_name")
      .eq("id", input.lotId)
      .maybeSingle();
    if (lotErr) throw new Error(lotErr.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    if (!lot.owner_profile_id) {
      return {
        ok: false,
        error: "Link the primary owner first — a second owner joins their household.",
      };
    }

    const { data: existingRows } = await db
      .from("household_members")
      .select("id")
      .eq("user_id", lot.owner_profile_id)
      .eq("email", email)
      .is("removed_at", null)
      .maybeSingle();
    if (existingRows) {
      return { ok: false, error: `${email} is already on this household.` };
    }

    // Their own sign-in, so each owner has their own password.
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = users?.users.find((u) => u.email?.toLowerCase() === email);
    let memberUserId = match?.id ?? null;
    let tempPassword = "";
    if (!memberUserId) {
      tempPassword = randomBytes(9).toString("base64url");
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (createErr) throw new Error(`Could not create the sign-in account: ${createErr.message}`);
      memberUserId = created.user?.id ?? null;
    } else {
      /* An account can be left over from an attempt that failed after the
         sign-in was made. If it belongs to no household yet, nobody has ever
         been given its password, so issue a fresh one and send it. */
      const { data: anyHousehold } = await db
        .from("household_members")
        .select("id")
        .eq("member_user_id", memberUserId)
        .is("removed_at", null)
        .maybeSingle();
      if (!anyHousehold) {
        tempPassword = randomBytes(9).toString("base64url");
        const { error: pwErr } = await db.auth.admin.updateUserById(memberUserId, {
          password: tempPassword,
        });
        if (pwErr) throw new Error(`Could not set their password: ${pwErr.message}`);
      }
    }

    if (memberUserId) {
      const { error: profErr } = await db.from("profiles").upsert({
        id: memberUserId,
        // "basic" is what the profiles check constraint calls a resident.
        role: "basic",
        display_name: name,
        phone: input.phone.trim() || null,
        unit_lot: (lot.lot_number as string | null) ?? null,
      });
      if (profErr) throw new Error(`Profile write failed: ${profErr.message}`);
    }

    const { data: row, error: insErr } = await db
      .from("household_members")
      .insert({
        user_id: lot.owner_profile_id,
        member_user_id: memberUserId,
        name,
        email,
        phone: input.phone.trim() || null,
        relationship: input.relationship || "Co-owner",
        access_level: "full",
        invite_status: "invited",
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    let note = `${name} added to the household.`;
    if (tempPassword && input.sendWelcome) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";
      /* The account was created with a password only this server has seen;
         the email carries a link to replace it, never the password itself. */
      const setPasswordUrl = await mintSetPasswordUrl(db, email, "portal");
      const sent = setPasswordUrl
        ? await sendWelcomeEmailViaResend({
            name,
            email,
            role: "Resident",
            setPasswordUrl,
            loginUrl: `${siteUrl}/portal/login`,
          })
        : { error: "the sign-in link could not be created" };
      note +=
        "error" in sent
          ? ` The welcome email could not be sent: ${sent.error}.`
          : " Welcome email sent with a link to choose a password.";
    } else if (!tempPassword) {
      note += " That email already had an account, so it was linked instead of created.";
    }

    const where = [lot.street_number, lot.street_name].filter(Boolean).join(" ");
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: added ${name} as a second owner at ${where || "the lot"}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      note,
      member: {
        id: row.id as string,
        name,
        email,
        relationship: input.relationship || "Co-owner",
        inviteStatus: "invited",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Sends the welcome email again. The original temporary password is never
 * stored, so this issues a fresh one — which is why it needs confirming:
 * any password the household already set stops working.
 */
export async function resendWelcomeEmail(input: {
  lotId: string;
  memberEmail?: string;
}): Promise<{ ok: true; note: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: lot, error } = await db
      .from("lots")
      .select("owner_profile_id")
      .eq("id", input.lotId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lot?.owner_profile_id) {
      return { ok: false, error: "There is no owner account on this lot to email." };
    }

    let targetId = lot.owner_profile_id as string;
    let name = "";
    let email = input.memberEmail?.trim().toLowerCase() ?? "";

    if (email) {
      const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = users?.users.find((u) => u.email?.toLowerCase() === email);
      if (!match) return { ok: false, error: `No sign-in account is on file for ${email}.` };
      targetId = match.id;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", targetId)
      .maybeSingle();
    name = profile?.display_name?.trim() || "Resident";

    if (!email) {
      const { data } = await db.auth.admin.getUserById(targetId);
      email = data.user?.email ?? "";
    }
    if (!email) return { ok: false, error: "That account has no email address on file." };

    /* Resending used to reset the password on the spot, which locked out
       anyone who was already signed in fine and only needed the mail again.
       A one-time link changes nothing until they follow it. */
    const setPasswordUrl = await mintSetPasswordUrl(db, email, "portal");
    if (!setPasswordUrl) {
      return { ok: false, error: `Could not create a sign-in link for ${email}.` };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";
    const sent = await sendWelcomeEmailViaResend({
      name,
      email,
      role: "Resident",
      setPasswordUrl,
      loginUrl: `${siteUrl}/portal/login`,
    });
    if ("error" in sent) {
      return {
        ok: false,
        error: `The email failed: ${sent.error}. Their current password still works, so they can also use "Forgot password" themselves.`,
      };
    }

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: re-sent the welcome email to ${email} with a link to choose a password`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    return { ok: true, note: `Welcome email re-sent to ${email} with a link to choose a password.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Takes a second owner off the deed. The row is kept with a removal date
 * rather than deleted, so the household's history survives, and their
 * sign-in loses access to this home. Restricted to the senior roles: this
 * decides who can reach a household's records.
 */
export async function removeHouseholdOwner(input: {
  memberId: string;
  name: string;
}): Promise<{ ok: true; note: string } | Fail> {
  try {
    const { db, actorName, actorId, isAdministrator } = await officeContext();

    const session = await requireAdminUser();
    const senior =
      isAdministrator || session.profile.staff_role === "Community manager";
    if (!senior) {
      return {
        ok: false,
        error:
          "Only an Owner, Administrator or Community manager can take someone off a deed.",
      };
    }

    const { data: member, error } = await db
      .from("household_members")
      .select("id, name, email, removed_at")
      .eq("id", input.memberId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) return { ok: false, error: "That owner is no longer on this household." };
    if (member.removed_at) {
      return { ok: false, error: `${member.name ?? "They"} has already been removed.` };
    }

    const { error: upErr } = await db
      .from("household_members")
      .update({ removed_at: new Date().toISOString(), invite_status: "removed" })
      .eq("id", input.memberId);
    if (upErr) throw new Error(upErr.message);

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: removed ${member.name ?? input.name} (${member.email ?? "no email"}) from the household`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      note: `${member.name ?? input.name} is off the deed and has lost access to this home.`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
