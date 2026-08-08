"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { ArcApp, Booking, Violation, WorkOrder } from "@/lib/admin-portal/types";

/**
 * Create records straight from a resident's message. The office picks what
 * to raise — a work order, a violation, an ARC request or a booking — and
 * the resident's name, lot address and message text are carried in
 * automatically, so nothing gets retyped.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can create records from messages.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  action: string,
  actorName: string,
  actorId: string | null,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

export type ThreadResidentContext = {
  residentName: string;
  phone: string;
  /** Street address of their lot, or "" when no lot is linked. */
  address: string;
  lotLabel: string;
  community: string;
};

/** Who is behind this thread, and which lot they own — the autofill source. */
export async function getThreadResidentContext(
  threadId: string,
): Promise<{ ok: true; context: ThreadResidentContext } | Fail> {
  try {
    const { db } = await officeContext();

    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .select("user_id")
      .eq("id", threadId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread?.user_id) return { ok: false, error: "That conversation has no resident attached." };

    const [{ data: profile }, { data: lot }] = await Promise.all([
      db.from("profiles").select("display_name, phone").eq("id", thread.user_id).maybeSingle(),
      db
        .from("lots")
        .select("lot_number, street_number, street_name, city, state, zip, community")
        .eq("owner_profile_id", thread.user_id)
        .limit(1)
        .maybeSingle(),
    ]);

    const street = lot
      ? [lot.street_number, lot.street_name].filter(Boolean).join(" ")
      : "";
    return {
      ok: true,
      context: {
        residentName: profile?.display_name?.trim() || "Resident",
        phone: profile?.phone?.trim() || "",
        address: street,
        lotLabel: lot?.lot_number ? `Lot ${lot.lot_number}` : "",
        community: (lot?.community as string) ?? "",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

function ref(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function createWorkOrderFromMessage(input: {
  threadId: string;
  residentName: string;
  address: string;
  title: string;
  priority: string;
  message: string;
}): Promise<{ ok: true; work: WorkOrder } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!input.title.trim()) return { ok: false, error: "Give the work order a title." };

    const number = ref("UG");
    const location = input.address || "Address not on file";
    // The table's check constraint wants lowercase priorities.
    const priority = ["normal", "high", "urgent", "low"].includes(input.priority)
      ? input.priority
      : "normal";
    const { data, error } = await db
      .from("work_orders")
      .insert({
        work_order_number: number,
        title: input.title.trim(),
        location,
        description: `Reported by ${input.residentName} via portal message: ${input.message}`,
        priority,
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db,
      `Work orders: created ${number} — ${input.title.trim()} at ${location}, from ${input.residentName}'s message`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    return {
      ok: true,
      work: {
        id: data.id as string,
        ref: number,
        title: input.title.trim(),
        detail: `${location} · reported by ${input.residentName}`,
        assignee: "Unassigned",
        assigneeId: null,
        status: "New",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createViolationFromMessage(input: {
  threadId: string;
  residentName: string;
  address: string;
  violationType: string;
  cureDays: number;
  message: string;
}): Promise<{ ok: true; violation: Violation } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!input.violationType.trim()) return { ok: false, error: "Name the violation type." };
    if (!input.address) return { ok: false, error: "No lot address on file — link the resident to a lot first." };

    const { data, error } = await db
      .from("violations")
      .insert({
        violation_type: input.violationType.trim(),
        address: input.address,
        opened_on: today(),
        status: "Reported",
        cure_days: input.cureDays || null,
        source: "Resident message",
        notes: `From ${input.residentName}'s portal message: ${input.message}`,
      })
      .select("id, opened_on")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db,
      `Violations: reported ${input.violationType.trim()} at ${input.address}, from ${input.residentName}'s message`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    return {
      ok: true,
      violation: {
        id: data.id as string,
        date: "Today",
        title: input.violationType.trim(),
        detail: [input.address, "Resident message", input.cureDays ? `cure in ${input.cureDays} days` : null]
          .filter(Boolean)
          .join(" · "),
        status: "Reported",
        photos: [],
        mailings: [],
        notes: [],
        activity: [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createArcFromMessage(input: {
  threadId: string;
  residentName: string;
  address: string;
  title: string;
  message: string;
}): Promise<{ ok: true; arc: ArcApp } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!input.title.trim()) return { ok: false, error: "Give the application a title." };

    const reference = ref("ARC");
    // due_on is a generated column (submitted_on + review window) — never insert it.
    const { data, error } = await db
      .from("arc_applications")
      .insert({
        reference,
        title: input.title.trim(),
        owner_name: input.residentName,
        address: input.address || null,
        submitted_on: today(),
        status: "Awaiting decision",
        decision_note: `Opened from ${input.residentName}'s portal message: ${input.message}`,
      })
      .select("id, due_on")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db,
      `Architectural: opened ${reference} — ${input.title.trim()} for ${input.residentName}, from their message`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    return {
      ok: true,
      arc: {
        id: data.id as string,
        ref: reference,
        title: input.title.trim(),
        owner: [input.residentName, input.address].filter(Boolean).join(" · "),
        submitted: "Today",
        due: data.due_on
          ? new Date(`${data.due_on}T12:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—",
        status: "Awaiting decision",
        thread: [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createBookingFromMessage(input: {
  threadId: string;
  residentName: string;
  amenity: string;
  date: string;
  eventType: string;
}): Promise<{ ok: true; booking: Booking } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!input.amenity.trim()) return { ok: false, error: "Pick the amenity." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pick the reservation date." };

    const { data, error } = await db
      .from("bookings")
      .insert({
        amenity: input.amenity,
        resident_name: input.residentName,
        starts_at: `${input.date}T12:00:00.000Z`,
        event_type: input.eventType.trim() || null,
        status: "Requested",
        deposit_status: "Not required",
      })
      .select("id, starts_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db,
      `Bookings: requested ${input.amenity} on ${input.date} for ${input.residentName}, from their message`,
      actorName,
      actorId,
    );
    revalidatePath("/admin");
    return {
      ok: true,
      booking: {
        id: data.id as string,
        date: new Date(data.starts_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amenity: input.amenity,
        detail: [input.residentName, input.eventType.trim() || null].filter(Boolean).join(" · "),
        deposit: "Not required",
        status: "Requested",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
