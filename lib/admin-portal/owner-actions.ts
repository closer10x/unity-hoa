"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { Owner, OwnerPortalData, PortalItem } from "./types";

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

/* ----- read-only portal summary for the drawer ----- */

const EMPTY_PORTAL: OwnerPortalData = {
  vehicles: [], guestPasses: [], pets: [], household: [], leases: [], openRequests: [],
};

function shortDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cap(s: unknown): string {
  const t = typeof s === "string" ? s.trim() : "";
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/**
 * Everything the resident registered through their own portal — vehicles,
 * guest passes, pets, household members, leases and the requests they've
 * filed — scoped to the lot's linked owner. Read-only: the resident owns
 * these records; staff see them but edit nothing here.
 */
export async function getOwnerPortalData(
  lotId: string,
): Promise<{ ok: true; data: OwnerPortalData } | Fail> {
  try {
    const { db } = await officeContext();
    const { data: lot, error } = await db
      .from("lots")
      .select("owner_profile_id")
      .eq("id", lotId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    const pid = lot.owner_profile_id as string | null;
    if (!pid) return { ok: true, data: EMPTY_PORTAL };

    // Requests are matched the same way the resident portal loads them:
    // by the sign-in email on the work order.
    let email = "";
    try {
      const { data } = await db.auth.admin.getUserById(pid);
      email = data.user?.email ?? "";
    } catch {
      // No auth account yet — the resident can't have filed anything.
    }

    const [vehicles, passes, pets, household, leases, requests] = await Promise.all([
      db.from("resident_vehicles")
        .select("id, description, plate, tag_status, created_at")
        .eq("user_id", pid).order("created_at", { ascending: false }),
      db.from("guest_passes")
        .select("id, guest_name, dates, plate, code, created_at")
        .eq("user_id", pid).is("revoked_at", null)
        .order("created_at", { ascending: false }),
      db.from("resident_pets")
        .select("id, name, pet_type, breed, weight_lb, color, rabies_tag, vet, status, created_at")
        .eq("user_id", pid).order("created_at", { ascending: false }),
      db.from("household_members")
        .select("id, name, relationship, access_level, email, phone, created_at")
        .eq("user_id", pid).order("created_at", { ascending: true }),
      db.from("leases")
        .select("id, tenant_names, contact, term, occupants, status, created_at")
        .eq("user_id", pid).order("created_at", { ascending: false }),
      email
        ? db.from("work_orders")
            .select("id, work_order_number, title, location, status, created_at")
            .ilike("reported_by_email", email)
            .not("status", "in", "(completed,cancelled)")
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const r of [vehicles, passes, pets, household, leases, requests]) {
      if (r.error) throw new Error(r.error.message);
    }

    type R = Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

    const data: OwnerPortalData = {
      vehicles: ((vehicles.data ?? []) as R[]).map((v): PortalItem => ({
        id: v.id as string,
        label: [str(v.description), str(v.plate)].filter(Boolean).join(" · "),
        detail: `Registered ${shortDate(v.created_at)}`,
        status: str(v.tag_status) === "pending" ? "Tag pending" : cap(v.tag_status),
      })),
      guestPasses: ((passes.data ?? []) as R[]).map((g): PortalItem => ({
        id: g.id as string,
        label: str(g.guest_name),
        detail: [str(g.dates), str(g.plate), str(g.code) ? `code ${str(g.code)}` : ""]
          .filter(Boolean).join(" · "),
        status: "Active",
      })),
      pets: ((pets.data ?? []) as R[]).map((p): PortalItem => ({
        id: p.id as string,
        label: str(p.name),
        detail: [
          cap(p.pet_type), str(p.breed),
          str(p.weight_lb) ? `${str(p.weight_lb)} lb` : "", str(p.color),
          str(p.rabies_tag) ? `rabies tag ${str(p.rabies_tag)}` : "",
          str(p.vet) ? `vet: ${str(p.vet)}` : "",
        ].filter(Boolean).join(" · "),
        status: cap(p.status) || "Registered",
      })),
      household: ((household.data ?? []) as R[]).map((h): PortalItem => ({
        id: h.id as string,
        label: str(h.name),
        detail: [str(h.relationship), str(h.email), str(h.phone)].filter(Boolean).join(" · "),
        status: str(h.access_level) ? `${cap(h.access_level)} access` : "",
      })),
      leases: ((leases.data ?? []) as R[]).map((l): PortalItem => ({
        id: l.id as string,
        label: str(l.tenant_names),
        detail: [str(l.term), str(l.occupants), str(l.contact)].filter(Boolean).join(" · "),
        status: cap(l.status) || "Active",
      })),
      openRequests: ((requests.data ?? []) as R[]).map((w): PortalItem => {
        const s = str(w.status);
        return {
          id: w.id as string,
          label: str(w.title),
          detail: [
            str(w.work_order_number),
            str(w.location) ? `at ${str(w.location)}` : "",
            `reported ${shortDate(w.created_at)}`,
          ].filter(Boolean).join(" · "),
          status: s === "in_progress" ? "In progress"
            : s === "assigned" || s === "pending" ? "Scheduled"
            : "Received",
        };
      }),
    };
    return { ok: true, data };
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
