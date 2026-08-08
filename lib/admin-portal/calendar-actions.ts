"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { CalEvent } from "./types";

/**
 * Calendar entries the office adds by hand. Meetings, bookings and legal
 * dates come from their own sections; this covers everything else, and it is
 * the same community_events table the resident portal and the public site
 * read, so anything added here shows up there too.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change the calendar.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId, actorLabel: actorName };
}

/** The office's event kinds map onto the table's four categories. */
function toCategory(kind: string): string {
  if (kind === "Meeting") return "official";
  if (kind === "Community") return "social";
  if (kind === "Inspection" || kind === "Legal") return "official";
  return "other";
}

/**
 * A date and an optional "2:00 PM"-style time become one timestamp. Times are
 * stored as written rather than shifted into UTC, so an event entered as 2pm
 * reads back as 2pm.
 */
function toTimestamp(date: string, time: string): string | null {
  if (!ISO_DATE_RE.test(date)) return null;
  const t = time.trim();
  if (!t) return `${date}T12:00:00.000Z`;
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i.exec(t);
  if (!m) return `${date}T12:00:00.000Z`;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = m[3]?.toLowerCase().replace(/\./g, "");
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return `${date}T12:00:00.000Z`;
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

export async function createCalendarEvent(input: {
  title: string;
  date: string;
  time: string;
  kind: string;
  community: string;
  detail: string;
}): Promise<{ ok: true; event: CalEvent } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the event a title." };
    const startsAt = toTimestamp(input.date, input.time);
    if (!startsAt) return { ok: false, error: "Pick a date for the event." };

    const { data, error } = await db
      .from("community_events")
      .insert({
        title,
        description: input.detail.trim() || null,
        starts_at: startsAt,
        location: input.community.trim() || null,
        category: toCategory(input.kind),
        published: true,
      })
      .select("id, starts_at")
      .single();
    if (error) throw new Error(error.message);

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Calendar: added ${title} on ${input.date}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      event: {
        id: data.id as string,
        date: (data.starts_at as string).slice(0, 10),
        title,
        detail: [input.community.trim(), input.time.trim(), input.detail.trim()]
          .filter(Boolean)
          .join(" · "),
        kind: input.kind,
        community: input.community.trim() || "all",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Dragging an event to another day moves it for everyone, not just this tab. */
export async function moveCalendarEvent(input: {
  id: string;
  title: string;
  date: string;
}): Promise<{ ok: true; date: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!ISO_DATE_RE.test(input.date)) {
      return { ok: false, error: "That is not a date this calendar can use." };
    }

    const { data: current, error: readErr } = await db
      .from("community_events")
      .select("starts_at")
      .eq("id", input.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) {
      return {
        ok: false,
        error:
          "Only events added on this calendar can be moved here. Meetings, bookings and legal dates move from their own sections.",
      };
    }

    // Keep the time of day; only the date changes.
    const clock = (current.starts_at as string).slice(11) || "12:00:00.000Z";
    const { error } = await db
      .from("community_events")
      .update({ starts_at: `${input.date}T${clock}` })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Calendar: moved ${input.title} to ${input.date}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, date: input.date };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
