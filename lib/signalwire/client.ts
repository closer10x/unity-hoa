import "server-only";

import crypto from "node:crypto";

import { normalizePhone } from "@/lib/sms/send-sms";

/**
 * SignalWire, through its Twilio-compatible ("LaML") API. The same request
 * shape, the same signature scheme, so this mirrors the existing Twilio helper
 * and the Stripe webhook's verify-then-handle pattern.
 *
 * Configure in .env.local (and on Vercel):
 *   SIGNALWIRE_PROJECT_ID  — the Project ID (the "account" in LaML URLs)
 *   SIGNALWIRE_API_TOKEN   — the API token; also the key that signs webhooks
 *   SIGNALWIRE_SPACE_URL   — your space host, e.g. example.signalwire.com
 *   SIGNALWIRE_FROM        — the SignalWire number, E.164 (+17135550100)
 */

export type SignalWireConfig = {
  projectId: string;
  apiToken: string;
  spaceUrl: string;
  from: string;
};

export function signalWireConfig(): Partial<SignalWireConfig> {
  return {
    projectId: process.env.SIGNALWIRE_PROJECT_ID?.trim() || undefined,
    apiToken: process.env.SIGNALWIRE_API_TOKEN?.trim() || undefined,
    spaceUrl: process.env.SIGNALWIRE_SPACE_URL?.trim().replace(/^https?:\/\//, "") || undefined,
    from: process.env.SIGNALWIRE_FROM?.trim() || undefined,
  };
}

export function isSignalWireConfigured(): boolean {
  const c = signalWireConfig();
  return Boolean(c.projectId && c.apiToken && c.spaceUrl && c.from);
}

/**
 * Verify a webhook actually came from SignalWire. The scheme is Twilio's: HMAC
 * -SHA1 of the exact callback URL followed by each POST field, sorted by name
 * and concatenated key+value, keyed by the API token, base64. A request that
 * does not match is discarded — this is the only thing standing between the
 * endpoint and anyone who guesses the URL.
 */
export function verifyWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const token = signalWireConfig().apiToken;
  if (!token || !signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type SendResult = { ok: true; sid: string } | { ok: false; error: string };

/**
 * Send one text through SignalWire. Low-level: it does not consult the on/off
 * switch — callers gate on that before deciding to send at all — but it does
 * take the status callback URL so a delivery receipt can find its way back.
 */
export async function sendSignalWireSms(input: {
  to: string;
  body: string;
  statusCallback?: string;
}): Promise<SendResult> {
  const c = signalWireConfig();
  if (!c.projectId || !c.apiToken || !c.spaceUrl || !c.from) {
    return { ok: false, error: "SignalWire is not configured." };
  }
  const to = normalizePhone(input.to);
  if (!to) return { ok: false, error: `"${input.to}" is not a valid phone number.` };

  const params = new URLSearchParams({ To: to, From: c.from, Body: input.body });
  if (input.statusCallback) params.set("StatusCallback", input.statusCallback);

  try {
    const res = await fetch(
      `https://${c.spaceUrl}/api/laml/2010-04-01/Accounts/${c.projectId}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${c.projectId}:${c.apiToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok || !data?.sid) {
      return { ok: false, error: data?.message ?? `SignalWire returned ${res.status}.` };
    }
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The text could not be sent." };
  }
}

/**
 * The public base URL a webhook was reached at, used to rebuild the exact
 * string SignalWire signed. The signature is over the URL as configured in the
 * dashboard, so if this app is reached at several hostnames (a Vercel alias vs
 * the custom domain) the reconstruction must match the one you entered there.
 * Set SIGNALWIRE_WEBHOOK_BASE to that origin to pin it; otherwise it is rebuilt
 * from the forwarded headers, which is correct for a single-domain setup.
 */
export function publicBaseUrl(headers: Headers): string {
  const pinned = process.env.SIGNALWIRE_WEBHOOK_BASE?.trim().replace(/\/$/, "");
  if (pinned) return pinned;
  const proto = headers.get("x-forwarded-proto") ?? "https";
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  return `${proto}://${host}`;
}

/**
 * Verify, and on failure log enough to diagnose the usual cause — a URL that
 * does not match the dashboard — without ever logging the signing key. Returns
 * whether the request is genuine.
 */
export function verifyWebhook(
  label: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const ok = verifyWebhookSignature(url, params, signature);
  if (!ok) {
    console.error(
      `SignalWire ${label} signature rejected. Reconstructed URL: ${url}. ` +
        `If this is a real SignalWire request, set SIGNALWIRE_WEBHOOK_BASE to the ` +
        `exact origin configured on the number.`,
    );
  }
  return ok;
}
