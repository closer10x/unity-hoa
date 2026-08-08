"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type {
  ArcStatus, AuditEntry, CaseNote, Mailing, ThreadMsg, Violation, ViolationStatus,
} from "./types";

/**
 * Violations and architectural review, persisted. Both files are evidentiary:
 * the notice ladder and its mailing record can be read back in a hearing, and
 * an ARC decision runs against a 30-day statutory clock. Nothing here may live
 * in client state — every step writes the database and stamps the audit trail
 * with the account that took it.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const VIOLATION_STATUSES: ViolationStatus[] = [
  "Reported", "Courtesy sent", "Notice sent", "Hearing set", "Resolved",
];

const ARC_STATUSES: ArcStatus[] = [
  "Awaiting decision", "Approved", "Approved with conditions",
  "Denied", "More information needed",
];

/* The audience column is what keeps a committee or internal note off the
   owner's copy of the case, so only these three are accepted. */
const ARC_AUDIENCES = ["owner", "committee", "internal"] as const;
export type ArcAudience = (typeof ARC_AUDIENCES)[number];

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change compliance records.");
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

const today = () => new Date().toISOString().slice(0, 10);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Matches the date labels the admin loader renders, so a row reads the same
    before and after a refresh. */
function dateLabel(d: string | null): string {
  if (!d) return "—";
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function stampTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

function activityEntry(text: string, who: string, at: string): AuditEntry {
  return { id: crypto.randomUUID(), text, who, time: stampTime(at) };
}

export async function createViolation(input: {
  community: string;
  address: string;
  violationType: string;
  source: string;
  inspector: string;
  /** Whole days — legally significant, so never free text. */
  cureDays: number;
  notes: string;
}): Promise<{ ok: true; violation: Violation } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const address = input.address.trim();
    const community = input.community.trim();
    if (!community) return { ok: false, error: "Pick the community this lot belongs to." };
    if (!address) return { ok: false, error: "Add the address or lot." };
    if (!input.violationType.trim()) return { ok: false, error: "Pick a violation type." };

    const cureDays = Number.isFinite(input.cureDays) && input.cureDays > 0
      ? Math.floor(input.cureDays)
      : null;
    const source = input.source.trim() || "Inspection finding";
    const note = input.notes.trim();

    const { data, error } = await db
      .from("violations")
      .insert({
        community,
        address,
        violation_type: input.violationType.trim(),
        source,
        inspector: input.inspector.trim() || null,
        cure_days: cureDays,
        opened_on: today(),
        status: "Reported",
        notes: note || null,
      })
      .select("id, opened_on, created_at")
      .single();
    if (error) throw new Error(error.message);

    const violationId = data.id as string;
    const notes: CaseNote[] = [];
    if (note) {
      const { data: noteRow, error: noteErr } = await db
        .from("violation_notes")
        .insert({ violation_id: violationId, body: note, author_name: actorName })
        .select("created_at")
        .single();
      if (noteErr) throw new Error(noteErr.message);
      notes.push({ author: actorName, time: stampTime(noteRow.created_at as string), text: note });
    }

    await audit(
      db, actorName, actorId,
      `Violations: logged ${input.violationType.trim()} at ${address} (${community}) as ${source.toLowerCase()}`,
    );

    revalidatePath("/admin");
    return {
      ok: true,
      violation: {
        id: violationId,
        date: dateLabel(data.opened_on as string),
        title: input.violationType.trim(),
        detail: [address, source, cureDays ? `cure in ${cureDays} days` : null]
          .filter(Boolean)
          .join(" · "),
        status: "Reported",
        photos: [],
        mailings: [],
        notes,
        activity: [
          activityEntry(`Logged as ${source.toLowerCase()}`, actorName, data.created_at as string),
        ],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setViolationStatus(input: {
  id: string;
  status: ViolationStatus;
  /** The plain-language step label, kept on the file as well as the audit trail. */
  note: string;
}): Promise<{ ok: true; status: ViolationStatus; activity: AuditEntry } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That violation isn't saved yet." };
    if (!VIOLATION_STATUSES.includes(input.status)) {
      return { ok: false, error: "That isn't a valid violation state." };
    }

    const { data: existing, error: getErr } = await db
      .from("violations")
      .select("id, violation_type, address, status")
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That violation no longer exists." };

    const { error } = await db
      .from("violations")
      .update({ status: input.status })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    const label = input.note.trim() || `Status set to ${input.status}`;
    await audit(
      db, actorName, actorId,
      `Violations: ${existing.violation_type} at ${existing.address} — ${label} (${existing.status} → ${input.status})`,
    );

    revalidatePath("/admin");
    return {
      ok: true,
      status: input.status,
      activity: activityEntry(label, actorName, new Date().toISOString()),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function recordViolationMailing(input: {
  violationId: string;
  kind: string;
  method: string;
  tracking: string;
  /** ISO date from the picker; today when it's left blank. */
  sentOn: string;
}): Promise<{ ok: true; mailing: Mailing; activity: AuditEntry } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.violationId)) return { ok: false, error: "That violation isn't saved yet." };
    if (!input.kind.trim()) return { ok: false, error: "Pick the notice kind." };
    if (!input.method.trim()) return { ok: false, error: "Pick how it was sent." };

    const { data: existing, error: getErr } = await db
      .from("violations")
      .select("id, violation_type, address")
      .eq("id", input.violationId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That violation no longer exists." };

    const sentOn = ISO_DATE_RE.test(input.sentOn) ? input.sentOn : today();
    // Portal and email delivery is confirmed as it is sent; anything mailed is
    // in transit until the carrier says otherwise.
    const deliveryStatus = input.method === "Email + portal" ? "Delivered" : "In transit";

    const { data, error } = await db
      .from("violation_mailings")
      .insert({
        violation_id: input.violationId,
        kind: input.kind,
        method: input.method,
        sent_on: sentOn,
        tracking: input.tracking.trim() || null,
        delivery_status: deliveryStatus,
      })
      .select("sent_on, tracking, created_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      `Violations: recorded ${input.kind} by ${input.method} for ${existing.violation_type} at ${existing.address}, sent ${dateLabel(sentOn)}`,
    );

    revalidatePath("/admin");
    return {
      ok: true,
      mailing: {
        kind: input.kind,
        method: input.method,
        sent: dateLabel(data.sent_on as string),
        tracking: (data.tracking as string | null) ?? "",
        status: deliveryStatus,
      },
      activity: activityEntry(
        `Recorded mailing — ${input.kind} by ${input.method}`,
        actorName,
        data.created_at as string,
      ),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function addViolationNote(input: {
  violationId: string;
  text: string;
}): Promise<{ ok: true; note: CaseNote; activity: AuditEntry } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.violationId)) return { ok: false, error: "That violation isn't saved yet." };
    const text = input.text.trim();
    if (!text) return { ok: false, error: "Write the note before saving it." };

    const { data: existing, error: getErr } = await db
      .from("violations")
      .select("id, violation_type, address")
      .eq("id", input.violationId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That violation no longer exists." };

    const { data, error } = await db
      .from("violation_notes")
      .insert({ violation_id: input.violationId, body: text, author_name: actorName })
      .select("created_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      `Violations: added a management note to ${existing.violation_type} at ${existing.address}`,
    );

    revalidatePath("/admin");
    return {
      ok: true,
      note: { author: actorName, time: stampTime(data.created_at as string), text },
      activity: activityEntry("Added a management note", actorName, data.created_at as string),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setArcStatus(input: {
  id: string;
  status: ArcStatus;
  decisionNote: string;
}): Promise<{ ok: true; status: ArcStatus; decisionNote: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That application isn't saved yet." };
    if (!ARC_STATUSES.includes(input.status)) {
      return { ok: false, error: "That isn't a valid decision." };
    }

    const { data: existing, error: getErr } = await db
      .from("arc_applications")
      .select("id, reference, title, status")
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That application no longer exists." };

    const decisionNote = input.decisionNote.trim();
    const { error } = await db
      .from("arc_applications")
      .update({ status: input.status, decision_note: decisionNote || null })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      `Architectural: ${existing.reference ?? existing.id} ${existing.title} — ${input.status} (was ${existing.status})`,
    );

    revalidatePath("/admin");
    return { ok: true, status: input.status, decisionNote };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function addArcMessage(input: {
  applicationId: string;
  body: string;
  audience: ArcAudience;
}): Promise<{ ok: true; message: ThreadMsg } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.applicationId)) {
      return { ok: false, error: "That application isn't saved yet." };
    }
    const body = input.body.trim();
    if (!body) return { ok: false, error: "Write the message before sending it." };
    if (!ARC_AUDIENCES.includes(input.audience)) {
      return { ok: false, error: "Pick who this goes to." };
    }

    const { data: existing, error: getErr } = await db
      .from("arc_applications")
      .select("id, reference, title")
      .eq("id", input.applicationId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That application no longer exists." };

    const { data, error } = await db
      .from("arc_messages")
      .insert({
        application_id: input.applicationId,
        body,
        author_name: actorName,
        audience: input.audience,
      })
      .select("created_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      input.audience === "internal"
        ? `Architectural: internal note on ${existing.reference ?? existing.id} — ${existing.title}`
        : `Architectural: message to ${input.audience} on ${existing.reference ?? existing.id} — ${existing.title}`,
    );

    revalidatePath("/admin");
    return {
      ok: true,
      message: {
        from: `${actorName} · ${input.audience === "internal" ? "internal note" : `to ${input.audience}`}`,
        mine: true,
        time: stampTime(data.created_at as string),
        body,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
