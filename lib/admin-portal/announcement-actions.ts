"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";
import {
  type AnnAudience,
  type AnnRow,
  executeAnnouncementSend,
  formatWhen,
  resolveRecipients,
  writeAudit,
} from "./announcement-send";

/**
 * Announcements to owners. A portal notice is a row residents read in their
 * portal; email goes out through Resend. Whatever actually happened is what
 * gets reported back — the office is never told a notice went out when it did
 * not.
 *
 * Every announcement is persisted the moment it is composed, because two things
 * now stand between "compose" and "sent": a schedule, and Owner approval. The
 * heavy lifting of an actual send lives in announcement-send.ts; this file is
 * the gate — it decides, per the acting account and the schedule, whether a row
 * sends now, waits for the cron, or waits for an Owner.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can send announcements.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  const staffRole = session.profile.staff_role ?? null;
  // Only an Owner sends without approval. Accounts with no staff_role predate
  // roles and already hold full access, so they are treated as exempt too —
  // otherwise a legacy admin's send would sit in a queue only Owners can clear.
  const isOwner = staffRole === "Owner" || staffRole == null || staffRole === "";
  return { db, actorName, actorId, staffRole, isOwner };
}

export type AnnouncementAudience = AnnAudience;

/** Who an announcement reaches, counted from the roster rather than guessed. */
export async function countAnnouncementAudience(
  audience: AnnouncementAudience,
): Promise<{ ok: true; households: number; emails: number } | Fail> {
  try {
    const { db } = await officeContext();
    const recipients = await resolveRecipients(db, audience, false);
    return { ok: true, households: recipients.households, emails: recipients.emails.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Put an image behind an announcement. The announcement-images bucket is
 * public on purpose (these show on the marketing site and in emails opened days
 * later), and the write runs with the service key behind the admin gate, so
 * nothing lands here without a staff account. Returns the stable public URL.
 */
export async function uploadAnnouncementImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | Fail> {
  try {
    const { db } = await officeContext();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an image to upload." };
    }
    if (!IMAGE_TYPES.has(file.type)) {
      return { ok: false, error: "Use a JPG, PNG, WebP or GIF image." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "That image is over 8 MB — pick a smaller one." };
    }
    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
        : file.type === "image/gif" ? "gif" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await db.storage
      .from("announcement-images")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = db.storage.from("announcement-images").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The upload failed." };
  }
}

export type SubmitResult =
  | { ok: true; status: "pending" | "scheduled" | "published" | "sent"; summary: string; warnings: string[] }
  | Fail;

/**
 * Compose an announcement and set it on its way. Depending on who is asking and
 * when they want it out, this either sends immediately, holds it for the cron,
 * or parks it for an Owner to approve. The row is written either way.
 */
export async function submitAnnouncement(input: {
  subject: string;
  body: string;
  audience: AnnouncementAudience;
  audienceLabel: string;
  channels: { email: boolean; sms: boolean; portal: boolean };
  imageUrl?: string | null;
  scheduledFor?: string | null;
}): Promise<SubmitResult> {
  try {
    const { db, actorName, actorId, isOwner } = await officeContext();

    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject) return { ok: false, error: "Give the announcement a subject." };
    if (!body) return { ok: false, error: "Write the message." };
    if (!input.channels.email && !input.channels.portal && !input.channels.sms) {
      return { ok: false, error: "Pick at least one way to send it." };
    }

    // A schedule in the past (or within 30s) just means "now".
    let scheduledFor: string | null = null;
    if (input.scheduledFor) {
      const when = new Date(input.scheduledFor);
      if (Number.isNaN(when.getTime())) return { ok: false, error: "That schedule time isn't valid." };
      if (when.getTime() > Date.now() + 30_000) scheduledFor = when.toISOString();
    }

    const base = {
      title: subject,
      body,
      image_url: input.imageUrl ?? null,
      audience: input.audience,
      audience_label: input.audienceLabel,
      channel_email: input.channels.email,
      channel_sms: input.channels.sms,
      channel_portal: input.channels.portal,
      scheduled_for: scheduledFor,
      author_id: actorId,
      author_name: actorName,
    };

    // A non-Owner never sends directly — the row waits for an Owner, schedule
    // and all. Approval decides later whether it goes now or gets held.
    if (!isOwner) {
      const { error } = await db.from("announcements").insert({ ...base, status: "pending" });
      if (error) throw new Error(error.message);
      await writeAudit(db, actorName, actorId,
        `Communications: submitted announcement “${subject}” for Owner approval`);
      revalidatePath("/admin");
      return {
        ok: true, status: "pending", warnings: [],
        summary: `“${subject}” was sent to an Owner to approve before it goes out.`,
      };
    }

    // Owner with a future time — hold it for the cron sweep.
    if (scheduledFor) {
      const { error } = await db.from("announcements").insert({ ...base, status: "scheduled" });
      if (error) throw new Error(error.message);
      await writeAudit(db, actorName, actorId,
        `Communications: scheduled announcement “${subject}” for ${formatWhen(scheduledFor)}`);
      revalidatePath("/admin");
      return {
        ok: true, status: "scheduled", warnings: [],
        summary: `“${subject}” is scheduled for ${formatWhen(scheduledFor)}.`,
      };
    }

    // Owner, now — persist, then fire.
    const { data: row, error } = await db
      .from("announcements").insert({ ...base, status: "draft" }).select("*").single();
    if (error) throw new Error(error.message);
    const res = await executeAnnouncementSend(db, row as AnnRow);
    await writeAudit(db, actorName, actorId,
      `Communications: announcement “${subject}” — ${res.summary} (${input.audienceLabel})`);
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/");
    return { ok: true, status: res.status, summary: res.summary, warnings: res.warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

async function requireOwnerContext() {
  const ctx = await officeContext();
  if (!ctx.isOwner) throw new Error("Only an Owner can approve announcements.");
  return ctx;
}

/** An Owner releases a pending announcement — sending now, or holding it for
 *  its scheduled time if one was set. */
export async function approveAnnouncement(id: string): Promise<SubmitResult> {
  try {
    const { db, actorName, actorId } = await requireOwnerContext();
    const { data: row, error } = await db
      .from("announcements").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "That announcement no longer exists." };
    if (row.status !== "pending") {
      return { ok: false, error: "That announcement isn't waiting for approval." };
    }
    const stamp = {
      approved_by_id: actorId,
      approved_by_name: actorName,
      approved_at: new Date().toISOString(),
    };

    if (row.scheduled_for && new Date(row.scheduled_for).getTime() > Date.now() + 30_000) {
      const { error: uErr } = await db
        .from("announcements").update({ ...stamp, status: "scheduled" }).eq("id", id);
      if (uErr) throw new Error(uErr.message);
      await writeAudit(db, actorName, actorId,
        `Communications: approved “${row.title}” (from ${row.author_name ?? "staff"}) — scheduled for ${formatWhen(row.scheduled_for)}`);
      revalidatePath("/admin");
      return {
        ok: true, status: "scheduled", warnings: [],
        summary: `Approved. “${row.title}” is scheduled for ${formatWhen(row.scheduled_for)}.`,
      };
    }

    const { error: uErr } = await db.from("announcements").update(stamp).eq("id", id);
    if (uErr) throw new Error(uErr.message);
    const res = await executeAnnouncementSend(db, { ...row, ...stamp } as AnnRow);
    await writeAudit(db, actorName, actorId,
      `Communications: approved and sent “${row.title}” (from ${row.author_name ?? "staff"})`);
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/");
    return { ok: true, status: res.status, summary: `Approved. ${res.summary}`, warnings: res.warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** An Owner declines a pending announcement — it is removed, with a record of
 *  whose it was and who declined it. */
export async function rejectAnnouncement(id: string): Promise<{ ok: true } | Fail> {
  try {
    const { db, actorName, actorId } = await requireOwnerContext();
    const { data: row, error } = await db
      .from("announcements").select("id, title, status, author_name").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "That announcement no longer exists." };
    if (row.status !== "pending") {
      return { ok: false, error: "Only a pending announcement can be declined." };
    }
    const { error: dErr } = await db.from("announcements").delete().eq("id", id);
    if (dErr) throw new Error(dErr.message);
    await writeAudit(db, actorName, actorId,
      `Communications: declined announcement “${row.title}” from ${row.author_name ?? "staff"}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export type SentAnnouncement = {
  id: string;
  date: string;
  subject: string;
  body: string;
  imageUrl: string | null;
  status: string;
  meta: string;
  channels: string;
  audienceLabel: string;
  authorName: string | null;
  scheduledFor: string | null;
  isPosted: boolean;
  isPending: boolean;
  isScheduled: boolean;
};

/** The full picture of Communications: what is waiting, what is scheduled, and
 *  what has actually gone out — newest activity first. */
export async function listAnnouncements(): Promise<
  { ok: true; sent: SentAnnouncement[]; viewerIsOwner: boolean } | Fail
> {
  try {
    const { db, isOwner } = await officeContext();
    const { data, error } = await db
      .from("announcements")
      .select(
        "id, title, body, image_url, status, audience_label, author_name, scheduled_for, channel_email, channel_sms, channel_portal, published_at, sent_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);

    const chans = (r: { channel_email: boolean; channel_sms: boolean; channel_portal: boolean }) =>
      [r.channel_email && "Email", r.channel_sms && "Text", r.channel_portal && "Portal"]
        .filter(Boolean).join(" · ") || "—";

    const sent: SentAnnouncement[] = (data ?? []).map((r) => {
      const status = r.status as string;
      const anchor =
        status === "scheduled" ? (r.scheduled_for as string | null)
          : status === "sent" ? (r.sent_at as string | null)
            : (r.published_at as string | null) ?? (r.created_at as string);
      const date = new Date((anchor ?? r.created_at) as string).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const meta =
        status === "pending" ? `Awaiting Owner approval · from ${r.author_name ?? "staff"}`
          : status === "scheduled" ? `Scheduled for ${formatWhen(r.scheduled_for as string)}`
            : status === "published" ? "Posted to the resident portal"
              : status === "sent" ? "Sent — not a portal notice"
                : status === "archived" ? "Taken down"
                  : "Draft";
      return {
        id: r.id as string,
        date,
        subject: (r.title as string) ?? "Untitled",
        body: (r.body as string) ?? "",
        imageUrl: (r.image_url as string | null) ?? null,
        status,
        meta,
        channels: chans(r as never),
        audienceLabel: (r.audience_label as string | null) ?? "",
        authorName: (r.author_name as string | null) ?? null,
        scheduledFor: status === "scheduled" ? formatWhen(r.scheduled_for as string) : null,
        isPosted: status === "published",
        isPending: status === "pending",
        isScheduled: status === "scheduled",
      };
    });
    return { ok: true, sent, viewerIsOwner: isOwner };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Take a portal announcement down. Archives rather than deletes, so the
 * send history keeps the record; getPublishedAnnouncements only reads
 * 'published', so archiving removes it from the home page and /events.
 */
export async function unpublishAnnouncement(
  id: string,
): Promise<{ ok: true } | Fail> {
  try {
    const { db } = await officeContext();
    const { error } = await db
      .from("announcements")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("status", "published");
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Fix the wording of an announcement in place. A published notice is edited
 *  live, so the correction shows on the portal immediately; the row keeps its
 *  id, status and publish date. */
export async function updateAnnouncement(input: {
  id: string;
  subject: string;
  body: string;
}): Promise<{ ok: true } | Fail> {
  try {
    const { db } = await officeContext();
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject) return { ok: false, error: "Give the announcement a subject." };
    if (!body) return { ok: false, error: "Write the message." };
    const { error } = await db
      .from("announcements")
      .update({ title: subject, body, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Permanently remove an announcement (from history and, if it was live, the
 *  public site). Unlike unpublish this deletes the row outright. */
export async function deleteAnnouncement(
  id: string,
): Promise<{ ok: true } | Fail> {
  try {
    const { db } = await officeContext();
    const { error } = await db.from("announcements").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
