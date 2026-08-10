"use server";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * What a household owes, looked up from the public site.
 *
 * This page is open to the internet, so the account number alone is not
 * enough — the street number has to match the same lot. Nothing identifying
 * comes back: no owner name, no contact, no address beyond what was already
 * typed. A lot that does not match and a street number that does not match
 * return the same answer, so the form cannot be used to walk the roster.
 */

export type DuesLine = {
  id: string;
  date: string;
  description: string;
  amount: string;
};

export type DuesLookupResult =
  | {
      found: true;
      /** Positive when money is owed, negative when the account is ahead. */
      balanceCents: number;
      balance: string;
      charges: DuesLine[];
      payments: DuesLine[];
      lastPaymentOn: string | null;
    }
  | { found: false; reason: string };

const usd = (cents: number) =>
  (Math.abs(cents) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

/** Digits only: people type "Lot 42", "#42" and "42" for the same thing. */
function digits(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

const NO_MATCH =
  "We couldn't match that account number and street number. Check both against your statement, or contact the office.";

export async function lookupDues(input: {
  community: string;
  accountNumber: string;
  streetNumber: string;
}): Promise<DuesLookupResult> {
  try {
    if (!isSupabaseConfigured()) {
      return { found: false, reason: NO_MATCH };
    }
    const account = digits(input.accountNumber);
    const street = digits(input.streetNumber);
    if (!account || !street) return { found: false, reason: NO_MATCH };

    const db = createServiceClient();

    const { data: lots, error } = await db
      .from("lots")
      .select("id, lot_number, street_number, community")
      .eq("community", input.community)
      .limit(2000);
    if (error) throw new Error(error.message);

    const lot = (lots ?? []).find(
      (l) =>
        digits(String(l.lot_number ?? "")) === account &&
        digits(String(l.street_number ?? "")) === street,
    );
    // Same answer whether the lot is unknown or the street number is wrong.
    if (!lot) return { found: false, reason: NO_MATCH };

    const { data: rows, error: txErr } = await db
      .from("finance_transactions")
      .select("id, occurred_on, description, amount_cents, owner_entry")
      .eq("lot_id", lot.id)
      .not("owner_entry", "is", null)
      .order("occurred_on", { ascending: false })
      .limit(200);
    if (txErr) throw new Error(txErr.message);

    const charges: DuesLine[] = [];
    const payments: DuesLine[] = [];
    let balanceCents = 0;
    let lastPaymentOn: string | null = null;

    for (const r of rows ?? []) {
      const cents = Number(r.amount_cents) || 0;
      const line: DuesLine = {
        id: r.id as string,
        date: dateLabel(r.occurred_on as string | null),
        description: (r.description as string) ?? "",
        amount: usd(cents),
      };
      if (r.owner_entry === "payment") {
        payments.push(line);
        balanceCents -= cents;
        if (!lastPaymentOn) lastPaymentOn = dateLabel(r.occurred_on as string | null);
      } else {
        charges.push(line);
        balanceCents += cents;
      }
    }

    return {
      found: true,
      balanceCents,
      balance: usd(balanceCents),
      charges,
      payments,
      lastPaymentOn,
    };
  } catch {
    return { found: false, reason: NO_MATCH };
  }
}
