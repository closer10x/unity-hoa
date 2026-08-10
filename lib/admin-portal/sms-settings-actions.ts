"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { isSignalWireConfigured } from "@/lib/signalwire/client";
import { writeAudit } from "./announcement-send";

/**
 * The master on/off switch for text messaging, stored on the association's
 * settings singleton (community_settings id=1). Off means nothing texts anyone,
 * regardless of provider configuration — the one-click way to stop all sends.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") throw new Error("Only staff can change settings.");
  const db = requireServiceSupabase();
  const actorName = session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

export async function getSmsSettings(): Promise<
  { ok: true; enabled: boolean; configured: boolean } | Fail
> {
  try {
    const { db } = await officeContext();
    const { data, error } = await db
      .from("community_settings").select("sms_enabled").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return {
      ok: true,
      enabled: Boolean(data?.sms_enabled),
      configured: isSignalWireConfigured(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setSmsEnabled(enabled: boolean): Promise<{ ok: true } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    const { error } = await db
      .from("community_settings")
      .upsert({ id: 1, sms_enabled: enabled, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await writeAudit(db, actorName, actorId,
      `Settings: turned text messaging ${enabled ? "on" : "off"}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
