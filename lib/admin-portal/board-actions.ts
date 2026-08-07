"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { Meeting, MeetingStatus, Minutes } from "./types";

/**
 * Meetings and their minutes, persisted. Scheduling, every lifecycle step and
 * each minutes draft writes the database and stamps the audit trail; approving
 * the minutes publishes them to every resident portal, so that step is guarded
 * behind actual minutes content.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES: MeetingStatus[] = [
  "Scheduled", "Agenda draft", "Agenda published", "Held",
  "Minutes draft", "Minutes approved", "Cancelled",
];

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can manage meetings.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  actorName: string,
  actorId: string | null,
  action: string,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

type MeetingRow = {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
  address: string | null;
  status: string | null;
  notice_required_hours: number | null;
  notice_sent_at: string | null;
};

function toMeeting(m: MeetingRow, minutes: Minutes | null): Meeting {
  return {
    id: m.id,
    date: m.starts_at
      ? new Date(m.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    title: m.title,
    detail: [m.location, m.address].filter(Boolean).join(", ") || "No location set",
    status: (STATUSES.includes(m.status as MeetingStatus) ? m.status : "Scheduled") as MeetingStatus,
    notice: m.notice_required_hours ? `${m.notice_required_hours}h notice` : "Notice not set",
    noticeOk: Boolean(
      m.notice_sent_at &&
        m.starts_at &&
        new Date(m.starts_at).getTime() - new Date(m.notice_sent_at).getTime() >=
          (m.notice_required_hours ?? 0) * 3600_000,
    ),
    minutes,
  };
}

/** "6:30 PM" onto an ISO date; noon when the time can't be read. */
function toStartsAt(dateISO: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  let h = 12, min = 0;
  if (m) {
    h = parseInt(m[1], 10) % 12;
    min = m[2] ? parseInt(m[2], 10) : 0;
    if ((m[3] ?? "pm").toLowerCase() === "pm") h += 12;
  }
  const [y, mo, d] = dateISO.split("-").map(Number);
  return new Date(y, mo - 1, d, h, min).toISOString();
}

export async function createMeeting(input: {
  community: string;
  meetingType: string;
  /** ISO date from the date picker. */
  dateISO: string;
  time: string;
  location: string;
  address: string;
}): Promise<{ ok: true; meeting: Meeting } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const startsAt = toStartsAt(input.dateISO, input.time);
    if (!startsAt) return { ok: false, error: "Pick the meeting date." };

    // 10 days for the annual meeting, 144 hours for everything else —
    // Texas Property Code as represented in the handoff.
    const noticeHours = /annual/i.test(input.meetingType) ? 240 : 144;

    const { data, error } = await db
      .from("meetings")
      .insert({
        title: input.meetingType,
        community: input.community,
        meeting_type: input.meetingType,
        starts_at: startsAt,
        location: input.location.trim() || null,
        address: input.address.trim() || null,
        status: "Scheduled",
        notice_required_hours: noticeHours,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      `Board: scheduled ${input.meetingType} on ${toMeeting(data as MeetingRow, null).date} at ${input.location.trim() || "TBD"}`,
    );

    revalidatePath("/admin");
    return { ok: true, meeting: toMeeting(data as MeetingRow, null) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setMeetingStatus(input: {
  meetingId: string;
  status: MeetingStatus;
}): Promise<{ ok: true; meeting: Meeting } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!STATUSES.includes(input.status)) {
      return { ok: false, error: "That isn't a valid meeting state." };
    }

    const { data: existing, error: getErr } = await db
      .from("meetings")
      .select("*")
      .eq("id", input.meetingId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That meeting no longer exists." };

    const { data: minutesRow } = await db
      .from("meeting_minutes")
      .select("attendance, body, motions, published")
      .eq("meeting_id", input.meetingId)
      .maybeSingle();

    // Publishing the minutes makes them readable in every resident portal —
    // there must be minutes to read.
    if (input.status === "Minutes approved" && !minutesRow?.body?.trim()) {
      return {
        ok: false,
        error: "Write and save the minutes before approving them — there's nothing to publish yet.",
      };
    }

    const update: Record<string, unknown> = { status: input.status };
    if (input.status === "Agenda published" && !existing.notice_sent_at) {
      update.notice_sent_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from("meetings")
      .update(update)
      .eq("id", input.meetingId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let minutes: Minutes | null = minutesRow
      ? {
          attendance: minutesRow.attendance ?? "",
          body: minutesRow.body ?? "",
          motions: minutesRow.motions ?? "",
          published: Boolean(minutesRow.published),
        }
      : null;

    if (input.status === "Minutes approved") {
      const { error: pubErr } = await db
        .from("meeting_minutes")
        .update({ published: true, updated_at: new Date().toISOString() })
        .eq("meeting_id", input.meetingId);
      if (pubErr) throw new Error(pubErr.message);
      minutes = { ...(minutes as Minutes), published: true };
    }

    await audit(
      db, actorName, actorId,
      input.status === "Minutes approved"
        ? `Board: approved & published minutes for ${existing.title} (${toMeeting(existing as MeetingRow, null).date})`
        : `Board: ${existing.title} (${toMeeting(existing as MeetingRow, null).date}) — ${input.status}`,
    );

    revalidatePath("/admin");
    return { ok: true, meeting: toMeeting(data as MeetingRow, minutes) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function saveMinutes(input: {
  meetingId: string;
  attendance: string;
  body: string;
  motions: string;
}): Promise<{ ok: true; minutes: Minutes } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: meeting, error: getErr } = await db
      .from("meetings")
      .select("id, title, starts_at")
      .eq("id", input.meetingId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!meeting) return { ok: false, error: "That meeting no longer exists." };

    const { data: existing } = await db
      .from("meeting_minutes")
      .select("published")
      .eq("meeting_id", input.meetingId)
      .maybeSingle();

    const row = {
      meeting_id: input.meetingId,
      attendance: input.attendance.trim() || null,
      body: input.body.trim() || null,
      motions: input.motions.trim() || null,
      published: existing?.published ?? false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db
      .from("meeting_minutes")
      .upsert(row, { onConflict: "meeting_id" });
    if (error) throw new Error(error.message);

    const when = meeting.starts_at
      ? new Date(meeting.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—";
    await audit(db, actorName, actorId, `Board: saved minutes draft for ${meeting.title} (${when})`);

    revalidatePath("/admin");
    return {
      ok: true,
      minutes: {
        attendance: row.attendance ?? "",
        body: row.body ?? "",
        motions: row.motions ?? "",
        published: row.published,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
