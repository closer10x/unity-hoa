import { escapeHtml } from "@/lib/email/escape-html";
import {
  MAINTENANCE_COMMUNITIES,
  MAINTENANCE_COMMON_AREAS,
} from "@/lib/maintenance-request/options";

export type MaintenanceRequestEmailPayload = {
  community: string;
  location: string;
  street: string;
  details: string;
  name: string;
  phone: string;
  email: string;
};

function labelFor(
  value: string,
  list: readonly { value: string; label: string }[],
): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

function escapeMultiline(s: string): string {
  return escapeHtml(s).replaceAll("\n", "<br />");
}

export function buildMaintenanceRequestEmailHtml(
  p: MaintenanceRequestEmailPayload,
): string {
  const community = escapeHtml(labelFor(p.community, MAINTENANCE_COMMUNITIES));
  const location = escapeHtml(labelFor(p.location, MAINTENANCE_COMMON_AREAS));
  const street = escapeHtml(p.street.trim()) || "—";
  const details = p.details.trim()
    ? escapeMultiline(p.details.trim())
    : "—";
  const name = escapeHtml(p.name.trim());
  const phone = escapeHtml(p.phone.trim());
  const email = p.email.trim() ? escapeHtml(p.email.trim()) : "—";

  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.5;color:#151c23">
    <h1 style="font-size:18px;margin:0 0 12px">Common-area maintenance request</h1>
    <table style="border-collapse:collapse;width:100%;max-width:560px">
      <tr><td style="padding:6px 0;font-weight:600;width:140px">Community</td><td style="padding:6px 0">${community}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600">Location</td><td style="padding:6px 0">${location}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600">Street / cross streets</td><td style="padding:6px 0">${street}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;vertical-align:top">Details</td><td style="padding:6px 0">${details}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600">Name</td><td style="padding:6px 0">${name}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600">Phone</td><td style="padding:6px 0">${phone}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600">Email</td><td style="padding:6px 0">${email}</td></tr>
    </table>
  </div>
  `.trim();
}

export async function sendMaintenanceRequestViaResend(
  payload: MaintenanceRequestEmailPayload,
): Promise<{ ok: true } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const toRaw = process.env.MAINTENANCE_REQUEST_TO?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ??
    "Sofi Lakes Portal <onboarding@resend.dev>";

  if (!apiKey) {
    return { error: "Email delivery is not configured (missing RESEND_API_KEY)." };
  }
  if (!toRaw) {
    return {
      error: "Email delivery is not configured (missing MAINTENANCE_REQUEST_TO).",
    };
  }

  const to = toRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (to.length === 0) {
    return { error: "No recipient addresses configured." };
  }

  const communityLabel = labelFor(payload.community, MAINTENANCE_COMMUNITIES);
  const locationLabel = labelFor(payload.location, MAINTENANCE_COMMON_AREAS);
  const subject = `[Maintenance] ${communityLabel} — ${locationLabel}`;

  const replyTo = payload.email.trim() ? [payload.email.trim()] : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: buildMaintenanceRequestEmailHtml(payload),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }
    return { error: `Email provider error: ${detail}` };
  }

  return { ok: true };
}
