"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import { loadResidentThreadsOnly } from "./server-data";
import type { ResidentThread, ResidentThreadMsg } from "./types";

/**
 * Staff replies into resident conversations. A reply reopens the thread,
 * flags it unread in the resident's portal, and stamps the audit trail.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can answer resident messages.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

function stampTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

/**
 * The current conversations, for the inbox's poll.
 *
 * A resident writing in is the one thing in this portal that arrives without
 * the office doing anything, so it is the one screen that has to notice on
 * its own. Read-only and cheap: two tables, no revalidate, no audit entry —
 * looking is not an action.
 */
export async function fetchResidentThreads(): Promise<
  { ok: true; threads: ResidentThread[] } | Fail
> {
  try {
    const { db } = await officeContext();
    return { ok: true, threads: await loadResidentThreadsOnly(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not refresh." };
  }
}

export async function replyToResidentThread(input: {
  threadId: string;
  body: string;
  /** Already in the bucket, put there by /api/messages/attachment. */
  attachmentPath?: string;
}): Promise<{ ok: true; message: ResidentThreadMsg } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    const body = input.body.trim();
    const attachmentPath = input.attachmentPath?.trim() || null;
    /* A photo on its own is a reply — "here is the sign we put up" needs no
       sentence under it. Only an empty message with nothing attached is a
       mistake worth stopping. */
    if (!body && !attachmentPath) {
      return { ok: false, error: "Write the reply, or attach a file." };
    }

    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .select("id, subject, user_id")
      .eq("id", input.threadId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) return { ok: false, error: "That conversation no longer exists." };

    const now = new Date().toISOString();
    const { data: msg, error: mErr } = await db
      .from("resident_messages")
      .insert({
        thread_id: input.threadId,
        author_name: actorName,
        is_resident: false,
        body,
        attachment_path: attachmentPath,
      })
      .select("*")
      .single();
    if (mErr) throw new Error(mErr.message);

    const { error: upErr } = await db
      .from("resident_threads")
      .update({ status: "Open", resident_unread: true, last_activity_at: now })
      .eq("id", input.threadId);
    if (upErr) throw new Error(upErr.message);

    const { data: profile } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", thread.user_id)
      .maybeSingle();
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Messages: replied to “${thread.subject}” for ${profile?.display_name?.trim() || "a resident"}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      message: {
        id: msg.id as string,
        from: actorName,
        fromStaff: true,
        time: stampTime(msg.created_at as string),
        body,
        attachment: attachmentPath ?? undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setResidentThreadStatus(input: {
  threadId: string;
  status: "Open" | "Closed";
}): Promise<{ ok: true } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (input.status !== "Open" && input.status !== "Closed") {
      return { ok: false, error: "That isn't a valid thread state." };
    }

    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .select("id, subject")
      .eq("id", input.threadId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) return { ok: false, error: "That conversation no longer exists." };

    const { error } = await db
      .from("resident_threads")
      .update({ status: input.status })
      .eq("id", input.threadId);
    if (error) throw new Error(error.message);

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Messages: ${input.status === "Closed" ? "closed" : "reopened"} “${thread.subject}”`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const PARTIES = ["Management office", "Billing", "Architectural Committee", "Board liaison"];

/**
 * Residents the office can start a conversation with — every account, searchable
 * by name, with a lot address when the account is linked to one. A resident
 * must have an account to receive a portal message; a lot with no account
 * cannot be a recipient, so this reads accounts, not lots.
 */
export async function listMessageableResidents(): Promise<
  { ok: true; residents: { id: string; name: string; address: string | null }[] } | Fail
> {
  try {
    const { db } = await officeContext();
    const { data: profiles, error } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("role", "basic")
      .order("display_name", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);

    // Address is a nicety when the account is tied to a lot; most are not yet.
    const ids = (profiles ?? []).map((p) => p.id as string);
    const address = new Map<string, string>();
    if (ids.length) {
      const { data: lots } = await db
        .from("lots")
        .select("owner_profile_id, street_address")
        .in("owner_profile_id", ids);
      for (const l of lots ?? []) {
        if (l.owner_profile_id && l.street_address) {
          address.set(l.owner_profile_id as string, l.street_address as string);
        }
      }
    }

    return {
      ok: true,
      residents: (profiles ?? []).map((p) => ({
        id: p.id as string,
        name: (p.display_name as string)?.trim() || "Resident",
        address: address.get(p.id as string) ?? null,
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * The office opens a conversation with a resident. Unlike a reply this creates
 * the thread — a first staff message the resident sees as unread in their
 * portal. Returns the thread shaped for the store so it appears at once.
 */
export async function startResidentThread(input: {
  userId: string;
  subject: string;
  body: string;
  party?: string;
}): Promise<{ ok: true; thread: import("./types").ResidentThread } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    const subject = input.subject.trim();
    const body = input.body.trim();
    const party = input.party && PARTIES.includes(input.party) ? input.party : "Management office";
    if (!input.userId) return { ok: false, error: "Pick a resident to write to." };
    if (!subject) return { ok: false, error: "Give the message a subject." };
    if (!body) return { ok: false, error: "Write the message." };

    const { data: resident, error: rErr } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("id", input.userId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!resident) return { ok: false, error: "That resident account no longer exists." };

    const now = new Date().toISOString();
    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .insert({
        user_id: input.userId,
        party,
        subject,
        status: "Open",
        // The office spoke first, so the resident has something unread waiting.
        resident_unread: true,
        last_activity_at: now,
      })
      .select("id, created_at")
      .single();
    if (tErr) throw new Error(tErr.message);

    const { data: msg, error: mErr } = await db
      .from("resident_messages")
      .insert({
        thread_id: thread.id,
        author_name: actorName,
        is_resident: false,
        body,
      })
      .select("id, created_at")
      .single();
    if (mErr) throw new Error(mErr.message);

    const residentName = (resident.display_name as string)?.trim() || "Resident";
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Messages: started “${subject}” with ${residentName}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return {
      ok: true,
      thread: {
        id: thread.id as string,
        resident: residentName,
        party,
        subject,
        status: "Open",
        date: stampTime(msg.created_at as string),
        // Staff spoke last, so nothing is awaiting a staff reply.
        awaitingReply: false,
        messages: [
          {
            id: msg.id as string,
            from: actorName,
            fromStaff: true,
            time: stampTime(msg.created_at as string),
            body,
          },
        ],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
