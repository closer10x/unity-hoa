/**
 * SMS via Twilio's REST API (no SDK dependency, mirroring the Resend email
 * helper). Configure in .env.local:
 *
 *   TWILIO_ACCOUNT_SID  — from the Twilio console dashboard
 *   TWILIO_AUTH_TOKEN   — same page, keep secret
 *   TWILIO_FROM         — your Twilio phone number, E.164 (+17135550100)
 *
 * Callers treat a config error the same as a send failure: surface it,
 * never block the surrounding action on it.
 */

export type SmsResult = { ok: true; sid: string } | { error: string };

/** Best-effort US-centric normalization to E.164; returns null if hopeless. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return /^\+\d{8,15}$/.test(digits) ? digits : null;
  }
  const bare = digits.replace(/\D/g, "");
  if (bare.length === 10) return `+1${bare}`;
  if (bare.length === 11 && bare.startsWith("1")) return `+${bare}`;
  return null;
}

export async function sendSms(
  to: string,
  body: string,
): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();

  if (!sid || !token || !from) {
    return { error: "SMS is not configured (missing Twilio credentials)." };
  }
  const toE164 = normalizePhone(to);
  if (!toE164) {
    return { error: `"${to}" is not a valid phone number.` };
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body }),
    },
  );

  const data = (await res.json().catch(() => null)) as {
    sid?: string;
    message?: string;
  } | null;

  if (!res.ok || !data?.sid) {
    return { error: `SMS send failed: ${data?.message ?? res.statusText}` };
  }
  return { ok: true, sid: data.sid };
}
