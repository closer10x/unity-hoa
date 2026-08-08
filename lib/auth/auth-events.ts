import "server-only";

import { headers } from "next/headers";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Records sign-in attempts — successful and failed — so the office can see who
 * is getting into the portal, from where, and when.
 *
 * Deliberately never throws: an audit write must not be able to break a login,
 * or a logging outage becomes a lockout. Failures are swallowed after being
 * surfaced to the server console.
 *
 * Never records the password, or anything derived from it. The failure reason
 * is our own short label, not the provider's message, so nothing about which
 * half of the credentials was wrong leaks into the log.
 */

export type AuthEvent =
  | "sign_in"
  | "sign_out"
  | "password_reset_requested"
  /** An invited account chose its own password and finished signing up. */
  | "password_set";

/**
 * Client IP from the proxy chain. x-forwarded-for is client-controllable, so
 * this is an indicator for a human reading the log, not an access control.
 */
async function requestOrigin(): Promise<{ ip: string | null; agent: string | null }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip =
      fwd?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("cf-connecting-ip") ||
      null;
    return { ip, agent: h.get("user-agent") };
  } catch {
    return { ip: null, agent: null };
  }
}

export async function recordAuthEvent(input: {
  event: AuthEvent;
  email?: string | null;
  userId?: string | null;
  succeeded: boolean;
  failureReason?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { ip, agent } = await requestOrigin();
    await createServiceClient().from("auth_events").insert({
      event: input.event,
      email: input.email?.trim().toLowerCase() || null,
      user_id: input.userId ?? null,
      succeeded: input.succeeded,
      failure_reason: input.failureReason ?? null,
      ip,
      user_agent: agent?.slice(0, 400) ?? null,
    });
  } catch (err) {
    console.error("auth event not recorded", err);
  }
}
