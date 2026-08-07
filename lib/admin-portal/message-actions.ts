"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { ResidentThreadMsg } from "./types";

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

export async function replyToResidentThread(input: {
  threadId: string;
  body: string;
}): Promise<{ ok: true; message: ResidentThreadMsg } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    const body = input.body.trim();
    if (!body) return { ok: false, error: "Write the reply first." };

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
