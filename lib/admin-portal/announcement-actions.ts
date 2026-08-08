"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Announcements to owners. A portal notice is a row residents read in their
 * portal; email goes out through Resend. Whatever actually happened is what
 * gets reported back — the office should never be told a notice went out
 * when it did not.
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
  return { db, actorName, actorId };
}

export type AnnouncementAudience = "all" | "delinquent" | "board" | string;

/** Who an announcement reaches, counted from the roster rather than guessed. */
export async function countAnnouncementAudience(
  audience: AnnouncementAudience,
): Promise<{ ok: true; households: number; emails: number } | Fail> {
  try {
    const { db } = await officeContext();
    const recipients = await resolveRecipients(db, audience);
    return { ok: true, households: recipients.households, emails: recipients.emails.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

async function resolveRecipients(
  db: ReturnType<typeof requireServiceSupabase>,
  audience: AnnouncementAudience,
): Promise<{ households: number; emails: string[]; label: string }> {
  const { data: lots, error } = await db
    .from("lots")
    .select("owner_profile_id, community")
    .limit(2000);
  if (error) throw new Error(error.message);

  const scoped = (lots ?? []).filter((l) =>
    audience === "all" || audience === "delinquent" || audience === "board"
      ? true
      : l.community === audience,
  );
  const profileIds = scoped
    .map((l) => l.owner_profile_id as string | null)
    .filter((id): id is string => Boolean(id));

  const emails: string[] = [];
  if (profileIds.length) {
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const wanted = new Set(profileIds);
    for (const u of users?.users ?? []) {
      if (wanted.has(u.id) && u.email) emails.push(u.email);
    }
  }

  return { households: scoped.length, emails, label: audience };
}

/** What has actually gone out, newest first — the real sent history. */
export async function listAnnouncements(): Promise<
  { ok: true; sent: { id: string; date: string; subject: string; meta: string }[] } | Fail
> {
  try {
    const { db } = await officeContext();
    const { data, error } = await db
      .from("announcements")
      .select("id, title, body, status, published_at, created_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return {
      ok: true,
      sent: (data ?? []).map((r) => {
        const when = (r.published_at as string | null) ?? (r.created_at as string);
        return {
          id: r.id as string,
          date: new Date(when).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          subject: (r.title as string) ?? "Untitled",
          meta:
            r.status === "published"
              ? "Posted to the resident portal"
              : `Status: ${r.status as string}`,
        };
      }),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function sendAnnouncement(input: {
  subject: string;
  body: string;
  audience: AnnouncementAudience;
  audienceLabel: string;
  channels: { email: boolean; sms: boolean; portal: boolean };
}): Promise<
  | { ok: true; summary: string; warnings: string[]; postedAt: string }
  | Fail
> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject) return { ok: false, error: "Give the announcement a subject." };
    if (!body) return { ok: false, error: "Write the message." };
    if (!input.channels.email && !input.channels.portal && !input.channels.sms) {
      return { ok: false, error: "Pick at least one way to send it." };
    }

    const recipients = await resolveRecipients(db, input.audience);
    const done: string[] = [];
    const warnings: string[] = [];

    if (input.channels.portal) {
      const { error } = await db.from("announcements").insert({
        title: subject,
        body,
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (error) throw new Error(`The portal notice could not be posted: ${error.message}`);
      done.push("posted to the resident portal");
    }

    if (input.channels.email) {
      const key = process.env.RESEND_API_KEY?.trim();
      const from = process.env.RESEND_FROM?.trim();
      if (!key || !from) {
        warnings.push("Email is not configured yet, so no email went out.");
      } else if (recipients.emails.length === 0) {
        warnings.push("No owners in that audience have an email on file, so no email went out.");
      } else {
        const sent = await sendBatch(key, from, recipients.emails, subject, body);
        done.push(`emailed ${sent.delivered} of ${recipients.emails.length} owners`);
        if (sent.failed > 0) {
          warnings.push(`${sent.failed} email${sent.failed === 1 ? "" : "s"} could not be delivered.`);
        }
      }
    }

    if (input.channels.sms) {
      warnings.push("Text messaging is not connected yet, so no texts were sent.");
    }

    const postedAt = new Date().toISOString();
    const summary = done.length
      ? `“${subject}” ${done.join(" and ")} for ${input.audienceLabel.toLowerCase()}.`
      : `“${subject}” was not sent — nothing was configured to carry it.`;

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Communications: announcement “${subject}” — ${
        done.length ? done.join(", ") : "nothing sent"
      } (${input.audienceLabel})`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, summary, warnings, postedAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Resend takes one message at a time here; failures are counted, not thrown. */
async function sendBatch(
  key: string,
  from: string,
  emails: string[],
  subject: string,
  body: string,
): Promise<{ delivered: number; failed: number }> {
  let delivered = 0;
  let failed = 0;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#22271f">
    <h1 style="font-size:19px;margin:0 0 14px">${escapeHtml(subject)}</h1>
    ${body
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 12px">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
      .join("")}
  </div>`;

  for (const to of emails) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (res.ok) delivered += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { delivered, failed };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
