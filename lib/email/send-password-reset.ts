import { escapeHtml } from "@/lib/email/escape-html";

/**
 * Password resets go out through Resend like every other message this app
 * sends, rather than Supabase's built-in mailer — that one is rate-limited to
 * a couple of messages an hour and refuses addresses it cannot verify, which
 * made "Forgot password" silently do nothing.
 */

export type PasswordResetPayload = {
  name: string;
  email: string;
  resetUrl: string;
  /** "admin portal" or "resident portal" — what they are getting back into. */
  portalLabel: string;
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

export function buildPasswordResetHtml(p: PasswordResetPayload): string {
  const name = escapeHtml(p.name.trim() || "there");
  const url = escapeHtml(p.resetUrl);
  const portal = escapeHtml(p.portalLabel);

  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:${C.page};font-family:${SANS};color:${C.ink}">
  <div style="max-width:520px;margin:0 auto;background:${C.card};border:1px solid ${C.hairline};border-radius:16px;padding:32px">
    <p style="margin:0 0 8px;font-size:15px">Hello ${name},</p>
    <h1 style="margin:0 0 16px;font-size:21px;font-weight:600;letter-spacing:-0.01em">Reset your password</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${C.inkMuted}">
      Someone asked to reset the password for your Unity Grid ${portal} account.
      Choose a new one with the button below. The link works once and expires in an hour.
    </p>
    <a href="${url}" style="display:inline-block;background:${C.accent};color:${C.onAccent};text-decoration:none;font-size:15px;font-weight:500;padding:13px 24px;border-radius:10px">
      Choose a new password
    </a>
    <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${C.inkFaint}">
      If you did not ask for this, you can ignore this email — your password stays as it is.
    </p>
  </div>
</body></html>`;
}

export async function sendPasswordResetViaResend(
  p: PasswordResetPayload,
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
      subject: "Reset your Unity Grid password",
      html: buildPasswordResetHtml(p),
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
