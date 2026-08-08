"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { parseDuesFrequency } from "@/lib/community/billing-display";
import { parseDollarsToCents } from "@/lib/format/money";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Community billing settings — the HOA fee, its cadence and the due day —
 * edited from the community row and stored on hoa_dashboard_metrics, the
 * same row the public dues lookup and the dashboard read from.
 */

export type CommunityBilling = {
  /** Fee in dollars as typed, e.g. "1350.00"; empty when not set. */
  feeDollars: string;
  /** "monthly" | "quarterly" | "annual" | "custom" | "" when not set. */
  cadence: string;
  /** "1".."28" or "" when not set. */
  dueDay: string;
  /** "1".."12" (January–December) or "" when not set; matters for annual billing. */
  dueMonth: string;
};

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change community billing.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

export async function getCommunityBilling(): Promise<
  { ok: true; billing: CommunityBilling } | Fail
> {
  try {
    const { db } = await officeContext();
    const { data, error } = await db
      .from("hoa_dashboard_metrics")
      .select("hoa_fee_amount_cents, dues_frequency, hoa_due_day_of_month, hoa_due_month")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      ok: true,
      billing: {
        feeDollars:
          data?.hoa_fee_amount_cents != null
            ? (data.hoa_fee_amount_cents / 100).toFixed(2)
            : "",
        cadence: (data?.dues_frequency as string | null) ?? "",
        dueDay:
          data?.hoa_due_day_of_month != null ? String(data.hoa_due_day_of_month) : "",
        dueMonth: data?.hoa_due_month != null ? String(data.hoa_due_month) : "",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateCommunityBilling(input: {
  communityName: string;
  feeDollars: string;
  cadence: string;
  dueDay: string;
  dueMonth: string;
}): Promise<{ ok: true; billing: CommunityBilling } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const feeRaw = input.feeDollars.trim();
    let hoa_fee_amount_cents: number | null =
      feeRaw === "" ? null : parseDollarsToCents(feeRaw);
    if (hoa_fee_amount_cents != null && hoa_fee_amount_cents < 0) {
      return { ok: false, error: "The HOA fee can't be negative." };
    }
    if (feeRaw !== "" && hoa_fee_amount_cents == null) {
      return { ok: false, error: "Enter the HOA fee as a dollar amount, like 1350.00." };
    }

    const dues_frequency = parseDuesFrequency(input.cadence);

    let hoa_due_day_of_month: number | null = null;
    if (input.dueDay.trim() !== "") {
      const d = parseInt(input.dueDay, 10);
      if (!Number.isFinite(d) || d < 1 || d > 28) {
        return { ok: false, error: "The due day must be between the 1st and the 28th." };
      }
      hoa_due_day_of_month = d;
    }

    let hoa_due_month: number | null = null;
    if (input.dueMonth.trim() !== "") {
      const mo = parseInt(input.dueMonth, 10);
      if (!Number.isFinite(mo) || mo < 1 || mo > 12) {
        return { ok: false, error: "Pick a due month between January and December." };
      }
      hoa_due_month = mo;
    }

    const { error } = await db
      .from("hoa_dashboard_metrics")
      .update({ hoa_fee_amount_cents, dues_frequency, hoa_due_day_of_month, hoa_due_month })
      .eq("id", 1);
    if (error) throw new Error(error.message);

    const MONTHS = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const summary = [
      hoa_fee_amount_cents != null
        ? `HOA fee $${(hoa_fee_amount_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : "HOA fee cleared",
      dues_frequency ?? "no cadence",
      hoa_due_month != null && hoa_due_day_of_month != null
        ? `due ${MONTHS[hoa_due_month - 1]} ${hoa_due_day_of_month}`
        : hoa_due_day_of_month != null
          ? `due day ${hoa_due_day_of_month}`
          : "no due day",
    ].join(", ");
    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Communities: billing for ${input.communityName} — ${summary}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/payment");
    return {
      ok: true,
      billing: {
        feeDollars:
          hoa_fee_amount_cents != null ? (hoa_fee_amount_cents / 100).toFixed(2) : "",
        cadence: dues_frequency ?? "",
        dueDay: hoa_due_day_of_month != null ? String(hoa_due_day_of_month) : "",
        dueMonth: hoa_due_month != null ? String(hoa_due_month) : "",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
