import { escapeHtml } from "@/lib/email/escape-html";

export type WelcomeEmailPayload = {
  name: string;
  email: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
};

export function buildWelcomeEmailHtml(p: WelcomeEmailPayload): string {
  const name = escapeHtml(p.name.trim());
  const email = escapeHtml(p.email.trim());
  const role = escapeHtml(p.role.trim());
  const password = escapeHtml(p.tempPassword);
  const url = escapeHtml(p.loginUrl);

  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#151c23;max-width:560px">
    <h1 style="font-size:18px;margin:0 0 12px">Welcome to Unity Grid Management</h1>
    <p>Hi ${name},</p>
    <p>An administrator account has been created for you on the Unity Grid
    admin portal as <strong>${role}</strong>. Sign in with:</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:6px 16px 6px 0;font-weight:600">Sign-in page</td><td style="padding:6px 0"><a href="${url}">${url}</a></td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:600">Email</td><td style="padding:6px 0">${email}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:600">Temporary password</td><td style="padding:6px 0;font-family:ui-monospace,monospace">${password}</td></tr>
    </table>
    <p><strong>Please change this password after your first sign-in.</strong>
    This temporary password was generated automatically and sent only to you.</p>
    <p style="color:#5c6670">If you weren't expecting this invitation, reply to
    this email and we'll remove the account.</p>
  </div>
  `.trim();
}

export async function sendWelcomeEmailViaResend(
  p: WelcomeEmailPayload,
): Promise<{ ok: true } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ??
    "Unity Grid Management <onboarding@resend.dev>";

  if (!apiKey) {
    return { error: "Email delivery is not configured (missing RESEND_API_KEY)." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [p.email.trim()],
      subject: "Your Unity Grid admin portal account",
      html: buildWelcomeEmailHtml(p),
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      /* ignore */
    }
    return { error: `Email send failed: ${detail}` };
  }
  return { ok: true };
}
