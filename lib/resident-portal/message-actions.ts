"use server";

import { revalidatePath } from "next/cache";

import { requireResidentUser } from "@/lib/auth/require-resident";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { ChatMsg, Thread } from "./types";

/**
 * The resident's side of messaging. Every send writes resident_threads /
 * resident_messages — the same tables the office reads — so a message
 * survives reload and appears in Admin → Communications immediately.
 * Reads and writes are always scoped to the session's own user id; a
 * resident can never touch another household's thread.
 */

type Fail = { ok: false; error: string };

const PARTIES = [
  "Management office", "Billing", "Architectural Committee", "Board liaison",
];

async function residentContext() {
  const session = await requireResidentUser();
  if (!isSupabaseConfigured()) {
    throw new Error("Messaging is not available until the database is configured.");
  }
  const authorName =
    session.profile.display_name?.trim() || session.user.email || "Resident";
  return { db: createServiceClient(), userId: session.user.id, authorName };
}

function stampTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export async function startResidentThread(input: {
  party: string;
  subject: string;
  body: string;
  /** Already in the bucket, put there by /api/messages/attachment. */
  attachmentPath?: string;
}): Promise<{ ok: true; thread: Thread } | Fail> {
  try {
    const { db, userId, authorName } = await residentContext();

    const subject = input.subject.trim();
    const body = input.body.trim();
    const attachmentPath = input.attachmentPath?.trim() || null;
    /* A photo of the broken gate says more than the sentence under it, so a
       message carrying one needs no body — but it still needs a subject, or
       the office gets a list of conversations called nothing. */
    if (!subject || (!body && !attachmentPath)) {
      return { ok: false, error: "Add a subject, and a message or a file." };
    }
    const party = PARTIES.includes(input.party) ? input.party : PARTIES[0];

    const now = new Date().toISOString();
    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .insert({
        user_id: userId,
        party,
        subject,
        status: "Open",
        resident_unread: false,
        last_activity_at: now,
      })
      .select("*")
      .single();
    if (tErr) throw new Error(tErr.message);

    const { data: msg, error: mErr } = await db
      .from("resident_messages")
      .insert({
        thread_id: thread.id,
        author_name: authorName,
        is_resident: true,
        body,
        attachment_path: attachmentPath,
      })
      .select("*")
      .single();
    if (mErr) throw new Error(mErr.message);

    revalidatePath("/portal");
    revalidatePath("/admin");
    return {
      ok: true,
      thread: {
        id: thread.id as string,
        party,
        subject,
        date: "Today",
        unread: false,
        status: "Open",
        messages: [{
          id: msg.id as string,
          from: "You",
          mine: true,
          time: stampTime(msg.created_at as string),
          body,
          attachment: attachmentPath ?? undefined,
        }],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The message didn't send." };
  }
}

export async function replyAsResident(input: {
  threadId: string;
  body: string;
  /** Already in the bucket, put there by /api/messages/attachment. */
  attachmentPath?: string;
}): Promise<{ ok: true; message: ChatMsg } | Fail> {
  try {
    const { db, userId, authorName } = await residentContext();

    const body = input.body.trim();
    const attachmentPath = input.attachmentPath?.trim() || null;
    if (!body && !attachmentPath) {
      return { ok: false, error: "Write the reply, or attach a file." };
    }

    // Scope check: the thread must belong to this session's account.
    const { data: thread, error: tErr } = await db
      .from("resident_threads")
      .select("id, user_id")
      .eq("id", input.threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) return { ok: false, error: "That conversation no longer exists." };

    const { data: msg, error: mErr } = await db
      .from("resident_messages")
      .insert({
        thread_id: input.threadId,
        author_name: authorName,
        is_resident: true,
        body,
        attachment_path: attachmentPath,
      })
      .select("*")
      .single();
    if (mErr) throw new Error(mErr.message);

    const { error: upErr } = await db
      .from("resident_threads")
      .update({ status: "Open", last_activity_at: new Date().toISOString() })
      .eq("id", input.threadId);
    if (upErr) throw new Error(upErr.message);

    revalidatePath("/portal");
    revalidatePath("/admin");
    return {
      ok: true,
      message: {
        id: msg.id as string,
        from: "You",
        mine: true,
        time: stampTime(msg.created_at as string),
        body,
        attachment: attachmentPath ?? undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The reply didn't send." };
  }
}

/** Opening a thread clears its unread flag — scoped to the session's account. */
export async function markResidentThreadRead(threadId: string): Promise<void> {
  try {
    const { db, userId } = await residentContext();
    await db
      .from("resident_threads")
      .update({ resident_unread: false })
      .eq("id", threadId)
      .eq("user_id", userId);
  } catch {
    // Non-critical; the unread dot simply stays until the next load.
  }
}
