import { escapeHtml } from "@/lib/email/escape-html";

export type WelcomeEmailPayload = {
  name: string;
  email: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
};

/* Hex approximations of the site's oklch tokens (email clients can't read
   oklch): sage-tinted surface, ink, sage accent, hairline, muted ink. */
const C = {
  page: "#f4f6ef",
  card: "#fdfdfa",
  panel: "#f1f4ea",
  ink: "#2c332d",
  inkMuted: "#616a62",
  inkFaint: "#8a938a",
  accent: "#48644f",
  onAccent: "#f7f8f2",
  hairline: "#e0e4d9",
};

const SANS =
  "'Instrument Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function buildWelcomeEmailHtml(p: WelcomeEmailPayload): string {
  const name = escapeHtml(p.name.trim());
  const email = escapeHtml(p.email.trim());
  const role = escapeHtml(p.role.trim());
  const password = escapeHtml(p.tempPassword);
  const url = escapeHtml(p.loginUrl);

  const label = `font-family:${MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.inkMuted}`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.hairline};border-radius:18px">
        <tr><td style="padding:34px 40px 0 40px">

          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:11px;height:11px;border-radius:2px;background:${C.accent};font-size:0;line-height:0">&nbsp;</td>
            <td style="padding-left:10px;font-family:${SANS};font-size:16px;font-weight:600;color:${C.ink};white-space:nowrap">Unity Grid</td>
            <td style="padding-left:9px;font-family:${MONO};font-size:10px;letter-spacing:0.1em;color:${C.inkFaint};white-space:nowrap">MANAGEMENT</td>
          </tr></table>

          <div style="border-top:1px solid ${C.hairline};margin:26px 0 28px"></div>

          <p style="margin:0 0 14px;${label}">Administrator account</p>
          <h1 style="margin:0 0 16px;font-family:${SANS};font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${C.ink}">
            Welcome aboard, ${name}.
          </h1>
          <p style="margin:0 0 26px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.inkMuted}">
            An administrator account has been created for you on the Unity Grid
            portal as <strong style="color:${C.ink};font-weight:600">${role}</strong>.
            Here is everything you need for your first sign-in.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};border:1px solid ${C.hairline};border-radius:14px">
            <tr><td style="padding:20px 24px 6px 24px">
              <p style="margin:0 0 4px;${label}">Sign-in page</p>
              <p style="margin:0 0 16px;font-family:${SANS};font-size:15px"><a href="${url}" style="color:${C.accent};text-decoration:none">${url}</a></p>
              <p style="margin:0 0 4px;${label}">Email</p>
              <p style="margin:0 0 16px;font-family:${SANS};font-size:15px;color:${C.ink}">${email}</p>
              <p style="margin:0 0 4px;${label}">Temporary password</p>
              <p style="margin:0 0 20px;font-family:${MONO};font-size:16px;letter-spacing:0.04em;color:${C.ink}">${password}</p>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr>
            <td style="background:${C.accent};border-radius:10px">
              <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:500;color:${C.onAccent};text-decoration:none">
                Sign in to the portal
              </a>
            </td>
          </tr></table>

          <p style="margin:18px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.inkMuted}">
            <strong style="color:${C.ink};font-weight:600">Please change this password after your first sign-in.</strong>
            It was generated automatically and sent only to you.
          </p>

          <div style="border-top:1px solid ${C.hairline};margin:28px 0 0"></div>
          <p style="margin:18px 0 34px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.inkFaint}">
            Unity Grid Management · 7880 Morrison Road, Katy, Texas 77493<br />
            If you weren't expecting this invitation, reply to this email and
            we'll remove the account.
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
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
