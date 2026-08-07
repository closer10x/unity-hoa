"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
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
    account: l.lot_number ? `Lot ${l.lot_number}` : l.id.slice(0, 8),
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
