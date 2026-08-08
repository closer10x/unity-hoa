import { escapeHtml } from "@/lib/email/escape-html";

export type HouseholdInvitePayload = {
  /** The person being invited. */
  name: string;
  email: string;
  /** The resident who added them. */
  inviterName: string;
  /** Property/address for context, e.g. "2041 Still Water Lane". */
  property: string;
  /** Human-readable access level, e.g. "View only". */
  access: string;
  /** Resident portal sign-in URL. */
  portalUrl: string;
};

/* Hex approximations of the site's oklch tokens for email clients. */
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

export function buildHouseholdInviteHtml(p: HouseholdInvitePayload): string {
  const name = escapeHtml(p.name.trim());
  const inviter = escapeHtml(p.inviterName.trim());
  const property = escapeHtml(p.property.trim());
  const access = escapeHtml(p.access.trim());
  const url = escapeHtml(p.portalUrl);
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

          <p style="margin:0 0 14px;${label}">Resident portal invitation</p>
          <h1 style="margin:0 0 16px;font-family:${SANS};font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${C.ink}">
            You've been added to a household, ${name}.
          </h1>
          <p style="margin:0 0 26px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.inkMuted}">
            <strong style="color:${C.ink};font-weight:600">${inviter}</strong> added you
            to the household at <strong style="color:${C.ink};font-weight:600">${property}</strong>
            on the Unity Grid resident portal.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};border:1px solid ${C.hairline};border-radius:14px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 4px;${label}">Property</p>
              <p style="margin:0 0 16px;font-family:${SANS};font-size:15px;color:${C.ink}">${property}</p>
              <p style="margin:0 0 4px;${label}">Your access</p>
              <p style="margin:0;font-family:${SANS};font-size:15px;color:${C.ink}">${access}</p>
            </td></tr>
          </table>

          <p style="margin:24px 0 8px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.inkMuted}">
            The button below signs you in and takes you straight to
            <strong style="color:${C.ink};font-weight:600">choosing your password</strong>.
            You&rsquo;ll sign in with this email address and that password from then on.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 8px"><tr>
            <td style="background:${C.accent};border-radius:10px">
              <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:500;color:${C.onAccent};text-decoration:none">
                Open the resident portal
              </a>
            </td>
          </tr></table>

          <div style="border-top:1px solid ${C.hairline};margin:28px 0 0"></div>
          <p style="margin:18px 0 34px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.inkFaint}">
            Unity Grid Management · 7880 Morrison Road, Katy, Texas 77493<br />
            If you weren't expecting this, you can ignore this email — no account
            is active until you set a password.
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
  `.trim();
}

export async function sendHouseholdInviteViaResend(
  p: HouseholdInvitePayload,
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
      subject: "You've been added to a household on the Unity Grid resident portal",
      html: buildHouseholdInviteHtml(p),
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
