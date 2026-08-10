import { headers } from "next/headers";

import { requireServiceSupabase } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/sms/send-sms";
import {
  isSignalWireConfigured,
  publicBaseUrl,
  verifyWebhook,
} from "@/lib/signalwire/client";

/**
 * Inbound SMS callback. A resident texts the SignalWire number, SignalWire
 * POSTs here, and the message lands in that resident's portal conversation so
 * the office answers it in one place. Set this URL on the number in the
 * SignalWire dashboard: Messaging → "When a message comes in" (POST).
 *
 * Replies with empty LaML so SignalWire sends no automatic auto-reply — the
 * office answers from the portal, which already texts back if that is wired.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_LAML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const xml = (status: number) =>
  new Response(EMPTY_LAML, { status, headers: { "Content-Type": "text/xml" } });

export async function POST(request: Request) {
  if (!isSignalWireConfigured() || !isSupabaseConfigured()) return xml(503);

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const h = await headers();
  const url = `${publicBaseUrl(h)}/api/signalwire/inbound`;
  if (!verifyWebhook("inbound", url, params, h.get("x-signalwire-signature"))) {
    return xml(403);
  }

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim();
  const sid = params.MessageSid || params.SmsSid || null;
  const to = params.To ?? null;
  if (!from || !body) return xml(200);

  try {
    const db = requireServiceSupabase();

    // Match the sender to a resident account by phone. Formats vary in the
    // profile, so compare on the normalized E.164 of each.
    const fromE164 = normalizePhone(from);
    const { data: withPhone } = await db
      .from("profiles")
      .select("id, display_name, phone")
      .not("phone", "is", null)
      .limit(5000);
    const resident = (withPhone ?? []).find(
      (p) => p.phone && normalizePhone(p.phone as string) === fromE164,
    );

    let threadId: string | null = null;
    if (resident) {
      const now = new Date().toISOString();
      // Continue the resident's most recent conversation rather than opening a
      // new one for every text, so a back-and-forth stays together.
      const { data: recent } = await db
        .from("resident_threads")
        .select("id")
        .eq("user_id", resident.id)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent) {
        threadId = recent.id as string;
        await db.from("resident_threads")
          .update({ status: "Open", last_activity_at: now })
          .eq("id", threadId);
      } else {
        const { data: created } = await db.from("resident_threads")
          .insert({
            user_id: resident.id, party: "Management office",
            subject: "Text message", status: "Open",
            resident_unread: false, last_activity_at: now,
          })
          .select("id").single();
        threadId = created?.id ?? null;
      }

      if (threadId) {
        await db.from("resident_messages").insert({
          thread_id: threadId,
          author_name: (resident.display_name as string)?.trim() || "Resident",
          is_resident: true,
          body,
        });
      }
    }

    // Log every inbound text, matched or not — an unmatched number is still
    // worth seeing, and a status callback may reference it later.
    await db.from("sms_messages").insert({
      provider_sid: sid,
      direction: "inbound",
      from_number: from,
      to_number: to,
      body,
      status: "received",
      user_id: resident?.id ?? null,
      thread_id: threadId,
    });
  } catch (e) {
    console.error("SignalWire inbound handling failed", e);
    // Still 200: a handling error must not make SignalWire retry forever.
  }

  return xml(200);
}
