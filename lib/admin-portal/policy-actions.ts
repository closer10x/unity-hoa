"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Per-community feature policy: leasing, gate codes, guest passes. The
 * resident portal hides whatever a community doesn't offer. Toggles are
 * audited like every other mutation.
 */

export type CommunityPolicy = {
  community: string;
  allowLeases: boolean;
  allowGateCodes: boolean;
  allowGuestPasses: boolean;
};

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULTS = { allowLeases: true, allowGateCodes: true, allowGuestPasses: true };

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change community policies.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

/** Policies for the given communities; defaults where no row exists yet. */
export async function getCommunityPolicies(
  communities: string[],
): Promise<{ ok: true; policies: CommunityPolicy[] } | Fail> {
  try {
    const { db } = await officeContext();
    const { data, error } = await db
      .from("community_policies")
      .select("community, allow_leases, allow_gate_codes, allow_guest_passes");
    if (error) throw new Error(error.message);
    const byId = new Map((data ?? []).map((r) => [r.community as string, r]));
    return {
      ok: true,
      policies: communities.map((c) => {
        const r = byId.get(c);
        return r
          ? {
              community: c,
              allowLeases: Boolean(r.allow_leases),
              allowGateCodes: Boolean(r.allow_gate_codes),
              allowGuestPasses: Boolean(r.allow_guest_passes),
            }
          : { community: c, ...DEFAULTS };
      }),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setCommunityPolicy(
  input: CommunityPolicy,
): Promise<{ ok: true; policy: CommunityPolicy } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { error } = await db.from("community_policies").upsert(
      {
        community: input.community,
        allow_leases: input.allowLeases,
        allow_gate_codes: input.allowGateCodes,
        allow_guest_passes: input.allowGuestPasses,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "community" },
    );
    if (error) throw new Error(error.message);

    const offered = [
      input.allowLeases ? "leases" : "no leases",
      input.allowGateCodes ? "gate codes" : "no gate codes",
      input.allowGuestPasses ? "guest passes" : "no guest passes",
    ].join(", ");
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Communities: policy for ${input.community} — ${offered}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, policy: input };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
