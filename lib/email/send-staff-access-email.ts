import { escapeHtml } from "@/lib/email/escape-html";

/**
 * Sent when someone who already had an account is given office access. They
 * keep the password they already use, so this says what changed rather than
 * handing over credentials they do not need.
 */

export type StaffAccessPayload = {
  name: string;
  email: string;
  role: string;
  loginUrl: string;
};

const C = {
  page: "#f4f6ef",
  card: "#fdfdfa",
  ink: "#2c332d",
  inkMuted: "#616a62",
  inkFaint: "#8a938a",
  accent: "#48644f",
  onAccent: "#f7f8f2",
  hairline: "#e0e4d9",
};

const SANS =
  "'Instrument Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";

export function buildStaffAccessHtml(p: StaffAccessPayload): string {
  const name = escapeHtml(p.name.trim() || "there");
  const role = escapeHtml(p.role.trim());
  const url = escapeHtml(p.loginUrl);

  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:${C.page};font-family:${SANS};color:${C.ink}">
  <div style="max-width:520px;margin:0 auto;background:${C.card};border:1px solid ${C.hairline};border-radius:16px;padding:32px">
    <p style="margin:0 0 8px;font-size:15px">Hello ${name},</p>
    <h1 style="margin:0 0 16px;font-size:21px;font-weight:600;letter-spacing:-0.01em">You now have office access</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${C.inkMuted}">
      Your Unity Grid account has been given the <strong style="color:${C.ink}">${role}</strong>
      role for the management portal. Sign in with the email and password you
      already use — nothing about your existing sign-in has changed.
    </p>
    <a href="${url}" style="display:inline-block;background:${C.accent};color:${C.onAccent};text-decoration:none;font-size:15px;font-weight:500;padding:13px 24px;border-radius:10px">
      Open the management portal
    </a>
    <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${C.inkFaint}">
      If you have forgotten your password, choose &ldquo;Forgot password?&rdquo; on the sign-in page.
    </p>
  </div>
</body></html>`;
}

export async function sendStaffAccessEmail(
  p: StaffAccessPayload,
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
      subject: "You now have Unity Grid office access",
      html: buildStaffAccessHtml(p),
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      // Keep the status text when the body is not JSON.
    }
    return { error: detail };
  }
  return { ok: true };
}
