"use server";

import { headers } from "next/headers";

import { SMS_CONSENT_TEXT } from "@/lib/signup/consent";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * The public sign-up form's server side.
 *
 * Two things happen here and nothing else: a household searches the roster
 * for their own home, and files a request to be given portal access to it.
 * No account is created, no lot is touched, nothing is linked — approval in
 * the office does all of that, so a stranger filling this in gains nothing
 * but a row in a queue.
 *
 * Everything runs on the service key against a deny-all table, so the
 * browser can neither read the queue nor write anything this file did not
 * decide to write.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Requests from one address in an hour before we stop taking them. */
const HOURLY_LIMIT = 5;

export type HomeOption = {
  id: string;
  /** "1420 Willow Bend Ln · Lot 12" — what the picker shows. */
  label: string;
  community: string | null;
};

type LotRow = {
  id: string;
  community: string | null;
  lot_number: string | null;
  street_number: string | null;
  street_name: string | null;
  city: string | null;
};

const homeLabel = (l: LotRow) =>
  [
    [l.street_number, l.street_name].filter(Boolean).join(" "),
    l.lot_number ? `Lot ${l.lot_number}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Homes matching what they have typed so far.
 *
 * Deliberately narrow: an id, the address, and the community. Never the
 * owner's name, and never whether the home already has one — a public search
 * that says which houses have nobody registered against them is a list worth
 * having for the wrong reasons.
 *
 * Filtering happens in memory. A community is a few hundred lots, every
 * keystroke would otherwise be a LIKE across three columns, and matching
 * "1420 willow" against a split address is something Postgres would need to
 * be told how to do twice.
 */
export async function searchHomes(query: string): Promise<HomeOption[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (!isSupabaseConfigured()) return [];

  const db = createServiceClient();
  const { data } = await db
    .from("lots")
    .select("id, community, lot_number, street_number, street_name, city")
    .order("street_name", { ascending: true });

  const terms = q.split(/\s+/).filter(Boolean);
  const rows = (data ?? []) as LotRow[];

  return rows
    .map((l) => ({ l, hay: `${homeLabel(l)} ${l.city ?? ""}`.toLowerCase() }))
    /* Every word has to appear somewhere, so "willow 12" finds Lot 12 on
       Willow Bend without the resident having to type it in order. */
    .filter(({ hay }) => terms.every((t) => hay.includes(t)))
    .slice(0, 8)
    .map(({ l }) => ({ id: l.id, label: homeLabel(l), community: l.community }));
}

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  lotId: string;
  note: string;
  /** Honeypot: a field no human sees, so anything in it is a bot. */
  website?: string;
};

type SignupResult = { ok: true; home: string } | { ok: false; error: string };

export async function submitResidentSignup(input: SignupInput): Promise<SignupResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Sign-up is not available right now. Please call the office." };
  }

  /* Silently accepted, never stored: telling a bot which check it failed is
     telling it what to change. */
  if (input.website?.trim()) return { ok: true, home: "" };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  /* Composed once, here, so the roster and every notice show one spelling —
     the two columns keep the parts for anyone who needs to greet them. */
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const note = input.note.trim().slice(0, 500);

  if (!firstName || !lastName) return { ok: false, error: "Please enter your first and last name." };
  if (name.length > 120) return { ok: false, error: "That name is longer than we can store." };
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "That email address doesn't look right." };
  }
  if (phone && !/^[\d\s()+.-]{7,20}$/.test(phone)) {
    return { ok: false, error: "That phone number doesn't look right." };
  }
  if (input.smsOptIn && !phone) {
    return { ok: false, error: "Add a mobile number if you'd like text messages." };
  }
  if (!input.lotId) {
    return { ok: false, error: "Choose your home from the list so we know which account to open." };
  }

  const db = createServiceClient();

  const { data: lot } = await db
    .from("lots")
    .select("id, community, lot_number, street_number, street_name, city")
    .eq("id", input.lotId)
    .maybeSingle();
  if (!lot) {
    return { ok: false, error: "We couldn't find that home. Search again and pick it from the list." };
  }

  const head = await headers();
  const ip =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip")?.trim() ||
    null;

  /* One person filling in the form for two homes is ordinary; a hundred in
     an hour is not. Counted on the address rather than the email, which
     costs a bot nothing to change. */
  if (ip) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("resident_signups")
      .select("id", { count: "exact", head: true })
      .eq("submitted_ip", ip)
      .gte("created_at", hourAgo);
    if ((count ?? 0) >= HOURLY_LIMIT) {
      return {
        ok: false,
        error: "That's a few requests from here already. Please call the office and we'll finish it for you.",
      };
    }
  }

  /* A second submission for the same home and address is somebody who is not
     sure the first one worked. Tell them it did rather than queueing it
     twice for the office to reconcile. */
  const { data: already } = await db
    .from("resident_signups")
    .select("id")
    .eq("status", "pending")
    .eq("lot_id", lot.id)
    .ilike("email", email)
    .maybeSingle();
  if (already) {
    return { ok: true, home: homeLabel(lot as LotRow) };
  }

  const now = new Date().toISOString();
  const { error } = await db.from("resident_signups").insert({
    first_name: firstName,
    last_name: lastName,
    name,
    email,
    phone: phone || null,
    sms_opt_in: input.smsOptIn,
    sms_consent_text: input.smsOptIn ? SMS_CONSENT_TEXT : null,
    sms_consent_at: input.smsOptIn ? now : null,
    lot_id: lot.id,
    community: lot.community,
    note: note || null,
    submitted_ip: ip,
    user_agent: head.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) {
    return { ok: false, error: "Something went wrong sending that. Please try again." };
  }

  return { ok: true, home: homeLabel(lot as LotRow) };
}
