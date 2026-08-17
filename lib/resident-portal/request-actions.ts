"use server";

import { revalidatePath } from "next/cache";

import { requireResidentUser } from "@/lib/auth/require-resident";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { GuestPass, MaintReq, ResArcApp, Reservation, Vehicle } from "./types";

/**
 * What a resident files: a maintenance request, an architectural application,
 * an amenity booking, a guest pass, a vehicle.
 *
 * Every one of these used to be built in the browser and pushed into React
 * state. The resident got a reference number and a confirmation, the office
 * got nothing, and a reload lost it — the request had never left the tab.
 * These write the same tables the office reads, so the two sides are one
 * record rather than two stories.
 *
 * The office finds a resident's rows by the fields it already searches on:
 * work orders by reported_by_email, applications by owner name or address,
 * bookings by resident name. Those are set here deliberately — a row written
 * without them is invisible on the resident's own screen.
 */

type Fail = { ok: false; error: string };

/** Same shape the office uses, so a ref reads the same wherever it appears. */
function ref(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * The session, plus the household's lot. The lot matters: an application is
 * matched to the resident by address, so one filed without it is filed into
 * a void.
 */
async function residentContext() {
  const session = await requireResidentUser();
  if (!isSupabaseConfigured()) {
    throw new Error("This is not available until the database is configured.");
  }
  const db = createServiceClient();
  const name = session.profile.display_name?.trim() || session.user.email || "Resident";
  const email = session.user.email?.trim() ?? "";

  const { data: lot } = await db
    .from("lots")
    .select("street_number, street_name, city, state, zip, community")
    .eq("owner_profile_id", session.user.id)
    .limit(1)
    .maybeSingle();

  const street = [lot?.street_number, lot?.street_name].filter(Boolean).join(" ");
  return { db, userId: session.user.id, name, email, street, community: lot?.community ?? null };
}

/* ─── Maintenance ──────────────────────────────────────────────────── */

export async function createMaintenanceRequest(input: {
  location: string;
  category: string;
  urgency: string;
  detail: string;
}): Promise<{ ok: true; request: MaintReq } | Fail> {
  try {
    const { db, name, email, street } = await residentContext();

    const location = input.location.trim();
    const detail = input.detail.trim();
    if (!location) return { ok: false, error: "Tell us where the problem is." };
    if (!detail) {
      return { ok: false, error: "Describe what's wrong so the crew arrives prepared." };
    }

    /* The form asks how urgent in the resident's words; the table's check
       constraint speaks the office's. Mapped rather than passed through —
       "soon" is not a priority the column accepts, and defaulting it to
       normal would quietly flatten the middle of the scale. */
    const priority =
      { routine: "normal", soon: "high", urgent: "urgent" }[input.urgency] ?? "normal";
    const number = ref("UG");
    const title = input.category.trim() ? `${input.category.trim()} — ${location}` : location;

    const { data, error } = await db
      .from("work_orders")
      .insert({
        work_order_number: number,
        title,
        description: detail,
        location: street ? `${street} · ${location}` : location,
        priority,
        status: "open",
        /* How the resident's own screen finds it again. Without this the
           request lands in the office's list and vanishes from theirs. */
        reported_by_name: name,
        reported_by_email: email,
        reported_by_unit: street || null,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/portal");
    revalidatePath("/admin");
    return {
      ok: true,
      request: {
        id: data.id as string,
        ref: number,
        title,
        detail: [`At ${location}`, `Reported ${shortDate(data.created_at as string)}`].join(" · "),
        status: "Received",
        open: true,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The request could not be filed.",
    };
  }
}

/* ─── Architectural ────────────────────────────────────────────────── */

export async function createArcApplication(input: {
  type: string;
  detail: string;
  contractor: string;
  start: string;
}): Promise<{ ok: true; app: ResArcApp } | Fail> {
  try {
    const { db, name, street } = await residentContext();

    const type = input.type.trim();
    const detail = input.detail.trim();
    if (!type) return { ok: false, error: "Pick the kind of project." };
    if (!detail) {
      return {
        ok: false,
        error:
          "Describe the project — materials, colors and placement help the committee say yes faster.",
      };
    }

    const reference = ref("ARC");
    const { data, error } = await db
      .from("arc_applications")
      .insert({
        reference,
        title: type,
        owner_name: name,
        address: street || null,
        project_type: type,
        contractor: input.contractor.trim() || null,
        status: "Awaiting decision",
        decision_note: [
          detail,
          input.start ? `Requested start: ${input.start}` : "",
        ].filter(Boolean).join("\n\n"),
      })
      .select("id, submitted_on")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/portal");
    revalidatePath("/admin");
    return {
      ok: true,
      app: {
        id: data.id as string,
        ref: reference,
        title: type,
        detail: [
          `Submitted ${shortDate(data.submitted_on as string)}`,
          input.contractor.trim(),
          input.start ? `starting ${input.start}` : "",
        ].filter(Boolean).join(" · "),
        status: "Awaiting decision",
        ok: false,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The application could not be filed.",
    };
  }
}

/* ─── Amenity bookings ─────────────────────────────────────────────── */

export async function createBooking(input: {
  amenity: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  guests: string;
  eventType: string;
  note: string;
  alcohol: boolean;
  insurance: boolean;
}): Promise<{ ok: true; reservation: Reservation } | Fail> {
  try {
    const { db, name } = await residentContext();

    if (!input.date.trim()) return { ok: false, error: "Pick a date." };
    if (!input.timeFrom || !input.timeTo) {
      return { ok: false, error: "Pick the start and end times." };
    }
    /* The rule the office would otherwise have to enforce by hand, and the
       reason a booking gets refused after the resident thinks it is made. */
    if (input.alcohol && !input.insurance) {
      return {
        ok: false,
        error:
          "Serving alcohol requires a certificate of insurance naming the association — mark it once you have one, or drop the alcohol flag.",
      };
    }

    /* The form collects a calendar day and two clock times; the table wants
       instants. Built as local time, which is what the resident meant. */
    const startsAt = new Date(`${input.date} ${input.timeFrom}`);
    const endsAt = new Date(`${input.date} ${input.timeTo}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { ok: false, error: "That date and time could not be read." };
    }
    if (endsAt <= startsAt) {
      return { ok: false, error: "The end time needs to be after the start." };
    }

    const guests = Number.parseInt(input.guests, 10);
    const { data, error } = await db
      .from("bookings")
      .insert({
        resident_name: name,
        amenity: input.amenity,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        guest_count: Number.isFinite(guests) ? guests : null,
        event_type: input.eventType,
        alcohol: input.alcohol,
        insurance_on_file: input.insurance,
        status: "Requested",
        office_notes: input.note.trim() || null,
      })
      .select("id, starts_at")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/portal");
    revalidatePath("/admin");
    const t = (d: Date) =>
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return {
      ok: true,
      reservation: {
        id: data.id as string,
        date: shortDate(data.starts_at as string),
        label: [
          input.amenity,
          `${t(startsAt)}–${t(endsAt)}`,
          input.eventType.toLowerCase(),
        ].filter(Boolean).join(" · "),
        status: "Requested",
        deposit: "Not required",
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The booking could not be requested.",
    };
  }
}

/* ─── Access: guest passes and vehicles ────────────────────────────── */

export async function createGuestPass(input: {
  guestName: string;
  dates: string;
  plate: string;
}): Promise<{ ok: true; pass: GuestPass } | Fail> {
  try {
    const { db, userId } = await residentContext();
    const guestName = input.guestName.trim();
    const dates = input.dates.trim();
    if (!guestName) return { ok: false, error: "Who is visiting?" };
    if (!dates) return { ok: false, error: "Which dates?" };

    const code = String(Math.floor(100000 + Math.random() * 899999));
    const { data, error } = await db
      .from("guest_passes")
      .insert({
        user_id: userId,
        guest_name: guestName,
        dates,
        plate: input.plate.trim() || null,
        code,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/portal");
    return {
      ok: true,
      pass: {
        id: data.id as string,
        name: guestName,
        detail: [dates, input.plate.trim()].filter(Boolean).join(" · "),
        code,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The pass could not be issued.",
    };
  }
}

/** Revoked, not deleted: the gate log still refers to it. */
export async function revokeGuestPass(id: string): Promise<{ ok: true } | Fail> {
  try {
    const { db, userId } = await residentContext();
    const { error } = await db
      .from("guest_passes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not revoke that pass." };
  }
}

export async function createVehicle(input: {
  description: string;
  plate: string;
}): Promise<{ ok: true; vehicle: Vehicle } | Fail> {
  try {
    const { db, userId } = await residentContext();
    const description = input.description.trim();
    const plate = input.plate.trim();
    if (!description) return { ok: false, error: "Which vehicle?" };
    if (!plate) return { ok: false, error: "Add the plate." };

    const { data, error } = await db
      .from("resident_vehicles")
      .insert({ user_id: userId, description, plate, tag_status: "pending" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/portal");
    return {
      ok: true,
      vehicle: { id: data.id as string, label: `${description} · ${plate}`, tag: "Pending" },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add that vehicle." };
  }
}

export async function removeVehicle(id: string): Promise<{ ok: true } | Fail> {
  try {
    const { db, userId } = await residentContext();
    const { error } = await db
      .from("resident_vehicles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove that vehicle." };
  }
}
