import type { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * The engine that actually carries an announcement out — resolving who it
 * reaches, firing the channels, and stamping the row with what happened.
 *
 * It lives apart from announcement-actions.ts on purpose: the same send has
 * three callers, and only one of them holds a staff session. An Owner sending
 * now, an Owner approving a queued one, and the cron sweep firing a scheduled
 * one all funnel through executeAnnouncementSend. The cron has no session and
 * passes the service client straight in, so nothing here may depend on
 * requireAdminUser — that gate is the actions layer's job, applied before the
 * row is ever written.
 */

type Db = ReturnType<typeof requireServiceSupabase>;

export type AnnRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  status: string;
  audience: string | null;
  audience_label: string | null;
  channel_email: boolean;
  channel_sms: boolean;
  channel_portal: boolean;
  scheduled_for: string | null;
  author_id: string | null;
  author_name: string | null;
  approved_by_id: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  published_at: string | null;
  sent_at: string | null;
  send_summary: string | null;
  created_at: string;
};

export type AnnAudience = "all" | "delinquent" | "board" | string;

/** Who an announcement reaches, counted from the roster rather than guessed. */
export async function resolveRecipients(
  db: Db,
  audience: AnnAudience,
  needEmails = true,
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
  if (needEmails && profileIds.length) {
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const wanted = new Set(profileIds);
    for (const u of users?.users ?? []) {
      if (wanted.has(u.id) && u.email) emails.push(u.email);
    }
  }

  return { households: scoped.length, emails, label: audience };
}

/**
 * Fire whatever channels the row asks for and record the outcome on the row
 * itself. The portal channel is special: the announcement row *is* the portal
 * notice, so "posting" it is flipping this same row to published — no second
 * insert. Email- or text-only announcements never become published; they end
 * at 'sent' so they stay off the public site.
 *
 * Returns what actually happened. Whatever the office is told, it matches the
 * row — a channel that could not run becomes a warning, never a false "sent".
 */
export async function executeAnnouncementSend(
  db: Db,
  row: AnnRow,
): Promise<{ status: "published" | "sent"; summary: string; warnings: string[] }> {
  const done: string[] = [];
  const warnings: string[] = [];
  const now = new Date().toISOString();

  if (row.channel_portal) {
    done.push("posted to the resident portal");
  }

  if (row.channel_email) {
    const key = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    if (!key || !from) {
      warnings.push("Email is not configured yet, so no email went out.");
    } else {
      const recipients = await resolveRecipients(db, row.audience ?? "all");
      if (recipients.emails.length === 0) {
        warnings.push("No owners in that audience have an email on file, so no email went out.");
      } else {
        const sent = await sendBatch(
          key, from, recipients.emails, row.title, row.body ?? "", row.image_url,
        );
        done.push(`emailed ${sent.delivered} of ${recipients.emails.length} owners`);
        if (sent.failed > 0) {
          warnings.push(`${sent.failed} email${sent.failed === 1 ? "" : "s"} could not be delivered.`);
        }
      }
    }
  }

  if (row.channel_sms) {
    warnings.push("Text messaging is not connected yet, so no texts were sent.");
  }

  const status: "published" | "sent" = row.channel_portal ? "published" : "sent";
  const summary = done.length
    ? `“${row.title}” ${done.join(" and ")}.`
    : `“${row.title}” was not sent — nothing was configured to carry it.`;

  const patch: Record<string, unknown> = { status, sent_at: now, send_summary: summary };
  if (row.channel_portal) patch.published_at = now;
  const { error } = await db.from("announcements").update(patch).eq("id", row.id);
  if (error) throw new Error(error.message);

  return { status, summary, warnings };
}

/**
 * The cron sweep: send every scheduled announcement whose time has come. Each
 * one is independent — a failure is recorded and the rest still go — so one
 * bad row never wedges the queue.
 */
export async function runDueAnnouncements(
  db: Db,
): Promise<{ processed: number; results: string[] }> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await db
    .from("announcements")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);

  const results: string[] = [];
  for (const row of (due ?? []) as AnnRow[]) {
    try {
      const r = await executeAnnouncementSend(db, row);
      results.push(r.summary);
    } catch (e) {
      results.push(`Failed “${row.title}”: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return { processed: (due ?? []).length, results };
}

/** Append a line to the audit trail. Best-effort from the cron; strict from actions. */
export async function writeAudit(
  db: Db,
  actorName: string,
  actorId: string | null,
  action: string,
): Promise<void> {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

/** Resend takes one message at a time here; failures are counted, not thrown. */
export async function sendBatch(
  key: string,
  from: string,
  emails: string[],
  subject: string,
  body: string,
  imageUrl: string | null,
): Promise<{ delivered: number; failed: number }> {
  let delivered = 0;
  let failed = 0;
  const image = imageUrl
    ? `<img src="${imageUrl}" alt="" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px" />`
    : "";
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#22271f">
    ${image}
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

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A scheduled time in the association's local voice: "Aug 14, 2026 at 9:00 AM". */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an invalid date";
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
  }).format(d);
  return `${day} at ${time}`;
}
