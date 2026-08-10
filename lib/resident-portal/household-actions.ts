"use server";

import { requireResidentUser } from "@/lib/auth/require-resident";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { HouseholdMember } from "@/lib/resident-portal/types";

/**
 * Persistence for the resident's household roster (household_members).
 * household_members has RLS on with no policies, so — like the other resident
 * writes — this goes through the service client with the query scoped to the
 * session's own user id. The session is the only authority on whose household
 * is changed; the client can never act for another owner. Removal is a soft
 * delete so the member ↔ owner history survives and any linked sign-in is shut
 * off by removed_at.
 */

const ACCESS_SHORT: Record<string, string> = {
  full: "Full access",
  view: "View only",
  none: "No portal access",
};

type Row = {
  id: string;
  name: string;
  relationship: string;
  access_level: string;
  email: string | null;
  phone: string | null;
};

function toMember(r: Row): HouseholdMember {
  const contact = [r.email?.trim(), r.phone?.trim()].filter(Boolean).join(" · ");
  const access = ACCESS_SHORT[r.access_level] ?? "Portal access";
  return {
    id: r.id,
    name: r.name,
    role: `${r.relationship} · ${access}`,
    contact,
  };
}

async function residentContext() {
  const session = await requireResidentUser();
  if (!isSupabaseConfigured()) {
    throw new Error("The household roster isn't available until the database is configured.");
  }
  return { db: createServiceClient(), userId: session.user.id };
}

const SELECT = "id, name, relationship, access_level, email, phone";

/** The signed-in resident's active household members, newest first. */
export async function getHousehold(): Promise<HouseholdMember[]> {
  const { db, userId } = await residentContext();
  const { data, error } = await db
    .from("household_members")
    .select(SELECT)
    .eq("user_id", userId)
    .is("removed_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(toMember);
}

export async function addHouseholdMember(input: {
  name: string;
  relationship: string;
  accessLevel: string;
  email?: string;
  phone?: string;
}): Promise<{ ok: true; member: HouseholdMember } | { error: string }> {
  const { db, userId } = await residentContext();

  const name = input.name.trim();
  const relationship = input.relationship.trim() || "Household member";
  const accessLevel = ["full", "view", "none"].includes(input.accessLevel)
    ? input.accessLevel
    : "view";
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  if (!name) return { error: "Add a name." };
  if (!email && !phone) return { error: "Add an email or a mobile." };

  const { data, error } = await db
    .from("household_members")
    .insert({ user_id: userId, name, relationship, access_level: accessLevel, email, phone })
    .select(SELECT)
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not save the household member." };
  }
  return { ok: true, member: toMember(data as Row) };
}

/** Soft-remove a member the session resident owns. */
export async function removeHouseholdMember(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const { db, userId } = await residentContext();
  const { error } = await db
    .from("household_members")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("removed_at", null);
  if (error) return { error: error.message };
  return { ok: true };
}
