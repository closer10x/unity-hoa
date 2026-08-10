import { headers } from "next/headers";

import { requireServiceSupabase } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  isSignalWireConfigured,
  publicBaseUrl,
  verifyWebhook,
} from "@/lib/signalwire/client";

/**
 * Delivery-status callback. As a text the office sent moves through queued →
 * sent → delivered (or fails), SignalWire POSTs the new state here and we
 * record it against the message. Set this URL as the StatusCallback on outbound
 * messages (the send helper passes it), or on the number in the dashboard.
 *
 * The row is matched by MessageSid. If we have not logged that outbound message
 * yet (a race, or a send that predates logging), the status is recorded as a
 * standalone row rather than dropped, so nothing about delivery is lost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSignalWireConfigured() || !isSupabaseConfigured()) {
    return Response.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const h = await headers();
  const url = `${publicBaseUrl(h)}/api/signalwire/status`;
  if (!verifyWebhook("status", url, params, h.get("x-signalwire-signature"))) {
    return Response.json({ ok: false, error: "bad signature" }, { status: 403 });
  }

  const sid = params.MessageSid || params.SmsSid || null;
  const status = params.MessageStatus || params.SmsStatus || null;
  const errorCode = params.ErrorCode || null;
  if (!sid || !status) return Response.json({ ok: true });

  try {
    const db = requireServiceSupabase();
    const { data: existing } = await db
      .from("sms_messages").select("id").eq("provider_sid", sid).maybeSingle();

    if (existing) {
      await db.from("sms_messages")
        .update({ status, error_code: errorCode })
        .eq("provider_sid", sid);
    } else {
      await db.from("sms_messages").insert({
        provider_sid: sid,
        direction: "outbound",
        to_number: params.To ?? null,
        from_number: params.From ?? null,
        status,
        error_code: errorCode,
      });
    }
  } catch (e) {
    console.error("SignalWire status handling failed", e);
  }

  return Response.json({ ok: true });
}
