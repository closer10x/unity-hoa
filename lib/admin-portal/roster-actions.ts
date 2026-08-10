"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { requireServiceSupabase } from "@/lib/supabase/service";
import type { Owner } from "./types";

/**
 * Adding a home to the roster. The lot is the record of the property; the
 * owner account, when there is an email for one, is provisioned against it so
 * the household can reach the portal. Both happen here or neither does.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change the roster.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

export async function addHomeowner(input: {
  name: string;
  coOwner: string;
  community: string;
  lotNumber: string;
  streetNumber: string;
  streetName: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  sendWelcome: boolean;
}): Promise<{ ok: true; owner: Owner; note: string } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false, error: "Add the name on the deed." };
    if (!input.streetNumber.trim() || !input.streetName.trim()) {
      return { ok: false, error: "Add the street number and street name." };
    }
    if (!input.city.trim() || !input.zip.trim()) {
      return { ok: false, error: "Add the city and ZIP code." };
    }
    if (email && !EMAIL_RE.test(email)) {
      return { ok: false, error: "That email doesn't look right." };
    }

    const fullName = name + (input.coOwner.trim() ? ` & ${input.coOwner.trim()}` : "");

    // The lot number is the account number on every notice, so it has to be
    // unique within the community rather than invented per row.
    const lotNumber = input.lotNumber.trim();
    if (lotNumber) {
      const { data: clash, error: clashErr } = await db
        .from("lots")
        .select("id")
        .eq("community", input.community)
        .eq("lot_number", lotNumber)
        .maybeSingle();
      if (clashErr) throw new Error(clashErr.message);
      if (clash) {
        return { ok: false, error: `Lot ${lotNumber} is already on the roster for this community.` };
      }
    }

    let ownerProfileId: string | null = null;
    let tempPassword = "";
    if (email) {
      const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
      const match = existing?.users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        ownerProfileId = match.id;
      } else {
        tempPassword = randomBytes(9).toString("base64url");
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: fullName },
        });
        if (createErr) throw new Error(`Could not create the sign-in account: ${createErr.message}`);
        ownerProfileId = created.user?.id ?? null;
      }

      if (ownerProfileId) {
        const { error: profErr } = await db.from("profiles").upsert({
          id: ownerProfileId,
          // "basic" is what the profiles check constraint calls a resident.
          role: "basic",
          display_name: fullName,
          phone: input.phone.trim() || null,
          unit_lot: lotNumber || null,
        });
        if (profErr) throw new Error(`Profile write failed: ${profErr.message}`);
      }
    }

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .insert({
        community: input.community || null,
        lot_number: lotNumber || null,
        street_number: input.streetNumber.trim(),
        street_name: input.streetName.trim(),
        city: input.city.trim(),
        state: input.state.trim() || "Texas",
        zip: input.zip.trim(),
        owner_profile_id: ownerProfileId,
      })
      .select("*")
      .single();
    if (lotErr) throw new Error(lotErr.message);

    let note = `${fullName} added to the roster.`;
    if (email && tempPassword && input.sendWelcome) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";
      const sent = await sendWelcomeEmailViaResend({
        name: fullName,
        email,
        role: "Resident",
        tempPassword,
        loginUrl: `${siteUrl}/portal/login`,
      });
      note +=
        "error" in sent
          ? ` The welcome email could not be sent: ${sent.error}. Share their sign-in details another way, or have them use "Forgot password".`
          : " Welcome email sent with a temporary password.";
    } else if (email && !tempPassword) {
      note += " That email already had an account, so it was linked instead of created.";
    }

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: added ${fullName} at ${input.streetNumber.trim()} ${input.streetName.trim()}${
        lotNumber ? ` (Lot ${lotNumber})` : ""
      }${email ? ` — portal account ${tempPassword ? "created" : "linked"}` : " — no portal account"}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");

    const street = [lot.street_number, lot.street_name].filter(Boolean).join(" ");
    const cityLine = [lot.city, [lot.state, lot.zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    return {
      ok: true,
      note,
      owner: {
        id: lot.id as string,
        name: ownerProfileId ? fullName : "Unassigned lot",
        address: [street, cityLine].filter(Boolean).join(", ") || "No address recorded",
        contact: input.phone.trim() || "—",
        balance: "—",
        status: ownerProfileId ? "Owner on file" : "No owner linked",
        scope: (lot.community as string) ?? "all",
        flag: ownerProfileId ? "current" : "tenant",
        account: (lot.account_number as string | null) ?? (lot.lot_number ? `Lot ${lot.lot_number}` : (lot.id as string).slice(0, 8)),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
