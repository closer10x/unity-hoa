"use server";

import { revalidatePath } from "next/cache";

import { requireResidentUser } from "@/lib/auth/require-resident";
import { MESSAGE_FILES_BUCKET } from "@/lib/supabase/message-files";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Pet } from "@/lib/resident-portal/types";

/**
 * Persistence for the resident's pet roster (resident_pets).
 *
 * The table has RLS for the signed-in JWT (own rows) and for staff reads.
 * The website still goes through the service client, scoped to the session's
 * own user id — the same pattern as household members and vehicles — so a
 * missing policy cannot blank the list the way an authenticated-only read
 * would if the cookie client and the policy ever drifted.
 */

type Row = {
  id: string;
  name: string;
  pet_type: string | null;
  breed: string | null;
  weight_lb: string | null;
  color: string | null;
  rabies_tag: string | null;
  vet: string | null;
  status: string | null;
  detail: string | null;
  ok: boolean | null;
  photo_path: string | null;
};

function composeDetail(input: {
  petType: string;
  breed: string;
  weight: string;
  color: string;
  tag: string;
  vet: string;
}): string {
  return [
    input.petType,
    input.breed,
    input.weight ? `${input.weight} lb` : "",
    input.color,
    input.tag ? `rabies tag ${input.tag}` : "",
    input.vet ? `vet: ${input.vet}` : "",
  ].filter(Boolean).join(" · ");
}

function toPet(r: Row): Pet {
  const detail = r.detail?.trim() || composeDetail({
    petType: r.pet_type?.trim() ?? "",
    breed: r.breed?.trim() ?? "",
    weight: r.weight_lb?.trim() ?? "",
    color: r.color?.trim() ?? "",
    tag: r.rabies_tag?.trim() ?? "",
    vet: r.vet?.trim() ?? "",
  });
  const ok = r.ok !== false;
  return {
    id: r.id,
    name: r.name,
    detail,
    status: r.status?.trim() || "Registered",
    ok,
    photoPath: r.photo_path,
  };
}

async function residentContext() {
  const session = await requireResidentUser();
  if (!isSupabaseConfigured()) {
    throw new Error("The pet roster isn't available until the database is configured.");
  }
  const db = createServiceClient();
  const { data: lot } = await db
    .from("lots")
    .select("id")
    .eq("owner_profile_id", session.user.id)
    .limit(1)
    .maybeSingle();
  return { db, userId: session.user.id, lotId: (lot?.id as string | undefined) ?? null };
}

/** The signed-in resident's pets, newest first. */
export async function getPets(): Promise<Pet[]> {
  try {
    const { db, userId } = await residentContext();
    const { data, error } = await db
      .from("resident_pets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as Row[]).map(toPet);
  } catch {
    return [];
  }
}

export async function createPet(input: {
  name: string;
  petType: string;
  breed?: string;
  weight?: string;
  color?: string;
  tag: string;
  vet?: string;
  photoPath?: string;
}): Promise<{ ok: true; pet: Pet } | { error: string }> {
  try {
    const { db, userId, lotId } = await residentContext();

    const name = input.name.trim();
    const petType = input.petType.trim() || "Other";
    const breed = input.breed?.trim() || null;
    const weight = input.weight?.trim() || null;
    const color = input.color?.trim() || null;
    const tag = input.tag.trim();
    const vet = input.vet?.trim() || null;
    if (!name) return { error: "Add the pet's name." };
    if (!tag) return { error: "A current rabies tag number is required." };

    const detail = composeDetail({
      petType, breed: breed ?? "", weight: weight ?? "",
      color: color ?? "", tag, vet: vet ?? "",
    });

    const { data, error } = await db
      .from("resident_pets")
      .insert({
        user_id: userId,
        lot_id: lotId,
        name,
        pet_type: petType,
        breed,
        weight_lb: weight,
        color,
        rabies_tag: tag,
        vet,
        status: "Registered",
        detail,
        ok: true,
        photo_path: input.photoPath?.trim() || null,
      })
      .select("*")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Could not register that pet." };
    }
    revalidatePath("/portal");
    return { ok: true, pet: toPet(data as Row) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not register that pet." };
  }
}

export async function removePet(id: string): Promise<{ ok: true } | { error: string }> {
  try {
    const { db, userId } = await residentContext();
    const { data: existing } = await db
      .from("resident_pets")
      .select("photo_path")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await db
      .from("resident_pets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return { error: error.message };

    const path = existing?.photo_path as string | null;
    if (path) {
      await db.storage.from(MESSAGE_FILES_BUCKET).remove([path]);
    }
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not remove that pet." };
  }
}
