"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { mintSetPasswordUrl } from "@/lib/email/set-password-link";
import { requireServiceSupabase } from "@/lib/supabase/service";

import { loadPendingSignups } from "./server-data";
import type { ResidentSignup } from "./types";

/**
 * Approving or declining a request from the public sign-up form.
 *
 * The form itself writes one row and touches nothing else, so everything that
 * makes a resident real happens here, in one place, under an office account:
 * the sign-in is created, the profile is written, the home is linked, and the
 * household is emailed a link to choose their own password — never a password
 * somebody else generated.
 *
 * Declining is deliberately quiet. The request is closed with a reason for
 * the audit trail and nothing is sent: an automatic "you were refused" email
 * to somebody who mistyped their own address is a phone call the office did
 * not need, and a real refusal is a conversation, not a form letter.
 */

type Fail = { ok: false; error: string };
type Done = { ok: true; note: string; signups: ResidentSignup[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can review sign-up requests.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

export async function approveResidentSignup(id: string): Promise<Done | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: req } = await db
      .from("resident_signups")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!req) return { ok: false, error: "That request is no longer there." };
    if (req.status !== "pending") {
      return { ok: false, error: `That request was already ${req.status}.` };
    }
    if (!req.lot_id) {
      return { ok: false, error: "That request has no home attached, so there is nothing to link it to." };
    }

    const { data: lot } = await db
      .from("lots")
      .select("id, lot_number, street_number, street_name, owner_profile_id")
      .eq("id", req.lot_id)
      .maybeSingle();
    if (!lot) {
      return { ok: false, error: "That home is no longer on the roster. Decline the request and add the lot first." };
    }

    const email = String(req.email).trim().toLowerCase();
    const name = String(req.name).trim();

    /* The address may already have an account — an earlier invite, or a
       household member. Reuse it rather than colliding with it. */
    const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const prior = existing?.users.find((u) => u.email?.toLowerCase() === email);

    let profileId = prior?.id ?? null;
    let created = false;
    if (!profileId) {
      /* Created with a password only this server ever sees; the email that
         follows carries a link to replace it. Nobody is mailed a password
         they did not choose. */
      const { data: made, error: createErr } = await db.auth.admin.createUser({
        email,
        password: randomBytes(9).toString("base64url"),
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (createErr) return { ok: false, error: `Could not create the sign-in: ${createErr.message}` };
      profileId = made.user?.id ?? null;
      created = true;
    }
    if (!profileId) return { ok: false, error: "Could not create the sign-in account." };

    const { error: profErr } = await db.from("profiles").upsert({
      id: profileId,
      // "basic" is what the profiles check constraint calls a resident.
      role: "basic",
      display_name: name,
      phone: req.phone ?? null,
      unit_lot: lot.lot_number ?? null,
    });
    if (profErr) return { ok: false, error: `Profile write failed: ${profErr.message}` };

    /* Consent carried onto the account, where the sender looks — the words
       they agreed to stay on the request as the proof. A resident who ticked
       the box on the form should not have to tick it again in the portal. */
    const { error: prefErr } = await db
      .from("notification_preferences")
      .upsert({ user_id: profileId, sms_opt_in: Boolean(req.sms_opt_in) });
    if (prefErr) {
      return { ok: false, error: `Text-message preference failed to save: ${prefErr.message}` };
    }

    /* The link itself. A home already showing an owner is not an error —
       a spouse, or a sale the roster has caught up with — but it is a
       decision, so the note says which one happened. */
    const replaced = Boolean(lot.owner_profile_id) && lot.owner_profile_id !== profileId;
    const { error: lotErr } = await db
      .from("lots")
      .update({ owner_profile_id: profileId })
      .eq("id", lot.id);
    if (lotErr) return { ok: false, error: `Could not link the home: ${lotErr.message}` };

    const street = [lot.street_number, lot.street_name].filter(Boolean).join(" ");
    const home = [street, lot.lot_number ? `Lot ${lot.lot_number}` : ""]
      .filter(Boolean)
      .join(" · ");

    let note = `${name} is linked to ${home}.`;
    const setPasswordUrl = await mintSetPasswordUrl(db, email, "portal");
    const sent = setPasswordUrl
      ? await sendWelcomeEmailViaResend({
          name,
          email,
          role: "Resident",
          setPasswordUrl,
          loginUrl: `${getEmailBaseUrl()}/portal/login`,
        })
      : { error: "the sign-in link could not be created" };
    note +=
      "error" in sent
        ? ` The welcome email could not be sent: ${sent.error}. Use Resend on their row once that is fixed.`
        : " A link to choose their password is on the way.";
    if (replaced) note += " That home was previously linked to another account, which has been replaced.";

    const { error: closeErr } = await db
      .from("resident_signups")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
        reviewed_by_name: actorName,
        linked_profile_id: profileId,
      })
      .eq("id", id);
    if (closeErr) return { ok: false, error: `Approved, but the request stayed open: ${closeErr.message}` };

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action:
        `Owners: approved the sign-up request from ${name} (${email}) for ${home}` +
        ` — portal account ${created ? "created" : "linked"}` +
        (req.sms_opt_in ? ", opted in to text messages" : "") +
        (replaced ? ", replacing the previous owner account" : ""),
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) return { ok: false, error: `Audit write failed: ${auditErr.message}` };

    revalidatePath("/admin");
    revalidatePath("/portal");

    return { ok: true, note, signups: await loadPendingSignups(db) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function declineResidentSignup(
  id: string,
  reason: string,
): Promise<Done | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: req } = await db
      .from("resident_signups")
      .select("name, email, status")
      .eq("id", id)
      .maybeSingle();
    if (!req) return { ok: false, error: "That request is no longer there." };
    if (req.status !== "pending") {
      return { ok: false, error: `That request was already ${req.status}.` };
    }

    const why = reason.trim().slice(0, 300);
    const { error } = await db
      .from("resident_signups")
      .update({
        status: "declined",
        decline_reason: why || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
        reviewed_by_name: actorName,
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: declined the sign-up request from ${req.name} (${req.email})${why ? ` — ${why}` : ""}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) return { ok: false, error: `Audit write failed: ${auditErr.message}` };

    revalidatePath("/admin");
    return {
      ok: true,
      note: `The request from ${req.name} is closed. Nothing was sent to them — call or email if they should hear why.`,
      signups: await loadPendingSignups(db),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
