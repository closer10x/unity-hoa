import { NextResponse } from "next/server";

import { escapeHtml } from "@/lib/email/escape-html";
import { communityLabel } from "@/lib/accounts/account-number";

/**
 * General contact form: emails the office inbox via Resend, tagged with the
 * chosen topic (including maintenance requests).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOPIC_LABELS: Record<string, string> = {
  maintenance: "Maintenance request",
  dues: "Dues or billing",
  arc: "Architectural application",
  violation: "A violation notice",
  board: "Message for the board",
  committee: "Joining a committee",
  other: "Something else",
};

export async function POST(req: Request) {
  let body: {
    community?: string;
    name?: string;
    email?: string;
    topic?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const community = body.community?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const topic = body.topic?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (!community || !name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json(
      { error: "Community, name, a valid email and a message are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.MAINTENANCE_REQUEST_TO?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ??
    "Unity Grid Management <onboarding@resend.dev>";
  if (!apiKey || !to) {
    return NextResponse.json(
      { error: "The office inbox isn't configured yet — please call instead." },
      { status: 503 },
    );
  }

  const topicLabel = TOPIC_LABELS[topic] ?? "General message";
  const communityName = communityLabel(community) ?? community;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.5;color:#151c23">
    <h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(topicLabel)} — ${escapeHtml(communityName)}</h1>
    <table style="border-collapse:collapse;width:100%;max-width:560px">
      <tr><td style="padding:6px 0;font-weight:600;width:120px">From</td><td style="padding:6px 0">${escapeHtml(name)} · ${escapeHtml(email)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;vertical-align:top">Message</td><td style="padding:6px 0">${escapeHtml(message).replaceAll("\n", "<br />")}</td></tr>
    </table>
  </div>`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: `[${topicLabel}] ${communityName} — ${name}`,
      html,
      reply_to: [email],
    }),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json(
      { error: `Sending failed: ${detail?.message ?? res.statusText}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
