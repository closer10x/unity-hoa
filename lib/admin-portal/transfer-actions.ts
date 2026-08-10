"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { Owner } from "./types";

/**
 * Ownership lifecycle for a lot: a sale, a no-sale transfer (family, trust,
 * LLC), or linking a first owner. One action does the whole hand-off in
 * order — provision the new resident's account, move the lot link, post the
 * chosen fees from the fee schedule to the new owner's ledger, email their
 * sign-in details — and stamps a single audit entry saying exactly what
 * happened. The old owner's account is never deleted; it just loses the lot.
 */

type Fail = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KINDS = {
  sale: "Sale",
  transfer: "Transfer",
  add: "New owner",
} as const;
export type TransferKind = keyof typeof KINDS;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can record ownership changes.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

type LotRow = {
  id: string;
  community: string | null;
  account_number: string | null;
  lot_number: string | null;
  street_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  owner_profile_id: string | null;
};

function lotAddress(l: LotRow): string {
  const street = [l.street_number, l.street_name].filter(Boolean).join(" ");
  return street || (l.lot_number ? `Lot ${l.lot_number}` : l.id.slice(0, 8));
}

function toOwnerRow(l: LotRow, name: string, phone: string): Owner {
  const street = [l.street_number, l.street_name].filter(Boolean).join(" ");
  const cityLine = [l.city, [l.state, l.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return {
    id: l.id,
    name: name || "Unassigned lot",
    address: [street, cityLine].filter(Boolean).join(", ") || "No address recorded",
    contact: phone || "—",
    balance: "—",
    status: "Owner on file",
    scope: l.community ?? "all",
    flag: "current",
    account: l.account_number ?? (l.lot_number ? `Lot ${l.lot_number}` : l.id.slice(0, 8)),
  };
}

export async function transferLot(input: {
  lotId: string;
  kind: TransferKind;
  newOwner: { name: string; email: string; phone?: string };
  /** fee_schedule ids to post to the new owner's ledger. */
  feeIds: string[];
  /** Email the new owner their sign-in details. Ignored when their account already exists. */
  sendWelcome: boolean;
  /** Closing / effective date (ISO); the posted fees carry it. */
  closingDate?: string;
}): Promise<
  | {
      ok: true;
      owner: Owner;
      summary: string;
      /** Delivery problem worth showing — the change itself still went through. */
      warning?: string;
    }
  | Fail
> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const name = input.newOwner.name.trim();
    const email = input.newOwner.email.trim().toLowerCase();
    const phone = input.newOwner.phone?.trim() ?? "";
    if (!name) return { ok: false, error: "Add the new owner's name — the one on the deed." };
    if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
    if (!(input.kind in KINDS)) return { ok: false, error: "Pick what happened to the lot." };

    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("*")
      .eq("id", input.lotId)
      .maybeSingle();
    if (lotErr) throw new Error(lotErr.message);
    if (!lot) return { ok: false, error: "That lot no longer exists." };
    const l = lot as LotRow;

    const effectiveDate =
      input.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(input.closingDate)
        ? input.closingDate
        : new Date().toISOString().slice(0, 10);

    // Who is leaving, for the record.
    let oldOwnerName = "";
    if (l.owner_profile_id) {
      const { data: oldProfile } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", l.owner_profile_id)
        .maybeSingle();
      oldOwnerName = oldProfile?.display_name?.trim() ?? "";
    }

    // ── The new owner's account: reuse an existing sign-in or create one ──
    let newUserId: string | null = null;
    try {
      const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
      newUserId = data?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    } catch {
      newUserId = null;
    }

    let tempPassword: string | null = null;
    if (!newUserId) {
      tempPassword = randomBytes(9).toString("base64url");
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (createErr || !created?.user) {
        return {
          ok: false,
          error: createErr?.message ?? "The new owner's account could not be created.",
        };
      }
      newUserId = created.user.id;
    }

    const { error: profErr } = await db.from("profiles").upsert({
      id: newUserId,
      role: "basic",
      display_name: name,
      ...(phone ? { phone } : {}),
    });
    if (profErr) throw new Error(`Profile setup failed: ${profErr.message}`);

    // ── Move the lot ──
    const { error: linkErr } = await db
      .from("lots")
      .update({ owner_profile_id: newUserId, assigned_at: new Date().toISOString() })
      .eq("id", input.lotId);
    if (linkErr) throw new Error(`The lot could not be relinked: ${linkErr.message}`);

    /* ── Bill the chosen fees to the new owner ──
       An invoice, not a ledger entry: the fees are owed at closing, but no
       money has moved yet. It posts to the books when the office collects
       it, which for a sale is usually out of escrow. */
    let feeNote = "no fees billed";
    let feeTotalCents = 0;
    const feeIds = input.feeIds.filter((id) => UUID_RE.test(id));
    if (feeIds.length) {
      const { data: fees, error: feeErr } = await db
        .from("fee_schedule")
        .select("id, name, amount_cents, category")
        .in("id", feeIds)
        .eq("active", true);
      if (feeErr) throw new Error(feeErr.message);
      if (fees?.length) {
        // Due on the closing date: these are settled at the table.
        const { data: inv, error: invErr } = await db
          .from("invoices")
          .insert({
            lot_id: input.lotId,
            community: l.community,
            bill_to_name: name,
            issued_on: effectiveDate,
            due_on: effectiveDate,
            status: "sent",
            sent_at: new Date().toISOString(),
            memo: `${KINDS[input.kind]} at ${lotAddress(l)}`,
            created_by_name: actorName,
          })
          .select("id, invoice_number")
          .single();
        if (invErr) throw new Error(`The invoice could not be raised: ${invErr.message}`);

        const { error: lineErr } = await db.from("invoice_lines").insert(
          fees.map((f) => ({
            invoice_id: inv.id as string,
            fee_id: f.id,
            description: f.name,
            quantity: 1,
            unit_amount_cents: f.amount_cents,
            amount_cents: f.amount_cents,
          })),
        );
        if (lineErr) throw new Error(`The invoice saved but its lines did not: ${lineErr.message}`);

        feeTotalCents = fees.reduce((s, f) => s + f.amount_cents, 0);
        feeNote = `${inv.invoice_number} raised for ${fees.map((f) => f.name).join(", ")} (${(feeTotalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}), due on collection`;
      }
    }

    // ── Welcome email with sign-in details (new accounts only) ──
    let warning: string | undefined;
    let welcomeNote = "no email sent";
    if (tempPassword && input.sendWelcome) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";
      const result = await sendWelcomeEmailViaResend({
        name,
        email,
        role: "Resident",
        tempPassword,
        loginUrl: `${siteUrl}/portal/login`,
      });
      if ("error" in result) {
        warning = `The change went through, but the welcome email failed: ${result.error}. Share their sign-in details another way, or have them use "Forgot password".`;
        welcomeNote = "welcome email failed";
      } else {
        welcomeNote = "welcome email sent with a temporary password";
      }
    } else if (!tempPassword) {
      welcomeNote = "existing sign-in reused — no new credentials issued";
    }

    const summary = `${KINDS[input.kind]} recorded at ${lotAddress(l)} — ${oldOwnerName ? `${oldOwnerName} → ` : ""}${name}; ${feeNote}; ${welcomeNote}`;

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Owners: ${summary}`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, owner: toOwnerRow(l, name, phone), summary, warning };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
