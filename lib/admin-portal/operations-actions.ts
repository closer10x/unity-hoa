"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { Address, Booking, BookingStatus, Vendor } from "./types";

/**
 * Amenity bookings and the vendor roster, persisted. Both sections used to
 * mutate client state only, so every reservation and every vendor vanished on
 * refresh. Each write here lands in the database and stamps the audit trail.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const BOOKING_STATUSES: BookingStatus[] = ["Requested", "Approved", "Completed", "Cancelled"];

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can manage bookings and vendors.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  action: string,
  actorName: string,
  actorId: string | null,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

/* ---------- shared display shapes (must match lib/admin-portal/server-data) ---------- */

const money = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const dateLabel = (d: string | null) =>
  d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "—";

const dayLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

type BookingRow = {
  id: string;
  resident_name: string | null;
  amenity: string | null;
  starts_at: string | null;
  guest_count: number | null;
  event_type: string | null;
  deposit_status: string | null;
  status: string | null;
};

function toBooking(b: BookingRow): Booking {
  return {
    id: b.id,
    date: dayLabel(b.starts_at),
    amenity: b.amenity ?? "Amenity",
    detail: [b.resident_name, b.guest_count ? `${b.guest_count} guests` : null, b.event_type]
      .filter(Boolean)
      .join(" · "),
    deposit: b.deposit_status ?? "Not required",
    status: (BOOKING_STATUSES.includes(b.status as BookingStatus) ? b.status : "Requested") as BookingStatus,
  };
}

type VendorRow = {
  id: string;
  name: string;
  trade: string | null;
  contract_start: string | null;
  contract_end: string | null;
  insurance_expires_on: string | null;
  ytd_spend_cents: number | null;
  active: boolean | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

function toVendor(v: VendorRow): Vendor {
  const expires = v.insurance_expires_on;
  return {
    id: v.id,
    name: v.name,
    trade: v.trade ?? "—",
    contract:
      v.contract_start && v.contract_end
        ? `${dateLabel(v.contract_start)} – ${dateLabel(v.contract_end)}`
        : "No term recorded",
    spend: money(v.ytd_spend_cents),
    insurance: expires ? `Expires ${dateLabel(expires)}` : "Not on file",
    // Insurance is current only against a real date — never against the mere
    // presence of text in a box.
    ok: expires ? new Date(expires).getTime() > Date.now() : false,
    active: v.active !== false,
    contact: [v.contact_name, v.contact_phone, v.contact_email]
      .filter(Boolean)
      .join(" · ") || "No contact recorded",
  };
}

/* ---------- bookings ---------- */

type Clock = { h: number; m: number };

/**
 * Reads the office's shorthand: "4–9PM", "6:30 PM", "10AM to 2PM", "18:00".
 * A range whose opening time omits the meridiem inherits the closing one, so
 * "4–9PM" starts at 16:00 and not 04:00.
 */
function parseTimeRange(time: string): { start: Clock; end: Clock | null } | null {
  const parts = time
    // "p.m." and "P. M." are the same thing as "pm".
    .replace(/\b([ap])\.\s?m\.?/gi, "$1m")
    .split(/\s*(?:[–—-]|\bto\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const read = (t: string) => t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)\.?$/i) ?? t.match(/^(\d{1,2})(?::(\d{2}))?()$/);
  const a = read(parts[0]);
  if (!a) return null;
  const b = parts[1] ? read(parts[1]) : null;
  if (parts[1] && !b) return null;

  const meridiem = (m: RegExpMatchArray | null) => (m?.[3] ?? "").toLowerCase();
  const toClock = (m: RegExpMatchArray, mer: string): Clock | null => {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (min > 59) return null;
    if (mer === "pm") {
      if (h > 12) return null;
      if (h !== 12) h += 12;
    } else if (mer === "am") {
      if (h > 12) return null;
      if (h === 12) h = 0;
    } else if (h > 23) {
      return null;
    }
    return { h, m: min };
  };

  const start = toClock(a, meridiem(a) || meridiem(b));
  if (!start) return null;
  const end = b ? toClock(b, meridiem(b) || meridiem(a)) : null;
  if (b && !end) return null;
  return { start, end };
}

function atTime(dateISO: string, c: Clock): string {
  const [y, mo, d] = dateISO.split("-").map(Number);
  return new Date(y, mo - 1, d, c.h, c.m).toISOString();
}

export async function createBooking(input: {
  amenity: string;
  residentName: string;
  phone: string;
  /** ISO date from the picker. */
  date: string;
  time: string;
  /** As typed; blank when the office didn't ask. */
  guestCount: string;
  eventType: string;
  setupNotes: string;
  officeNotes: string;
  depositStatus: string;
  alcohol: boolean;
  insuranceOnFile: boolean;
  outsideVendors: boolean;
  afterHours: boolean;
}): Promise<{ ok: true; booking: Booking } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    if (!input.residentName.trim()) return { ok: false, error: "Who is it for?" };
    if (!input.amenity.trim()) return { ok: false, error: "Pick the amenity." };
    if (!ISO_DATE_RE.test(input.date)) return { ok: false, error: "Pick the reservation date." };

    const window = parseTimeRange(input.time);
    if (!window) {
      return { ok: false, error: "That time didn't read — try something like 4–9 PM or 6:30 PM." };
    }
    // The certificate is what makes an alcohol booking insurable; the table
    // records the pair, so the rule is enforced here too, not only in the form.
    if (input.alcohol && !input.insuranceOnFile) {
      return {
        ok: false,
        error: "Alcohol events need a certificate of insurance — mark it or drop the alcohol flag.",
      };
    }

    let guests: number | null = null;
    if (input.guestCount.trim()) {
      const n = Number(input.guestCount.trim());
      if (!Number.isInteger(n) || n < 0) {
        return { ok: false, error: "Guest count should be a whole number." };
      }
      guests = n;
    }

    // Only the requirements with their own columns are stored as flags. The
    // rest have no column yet, so they are named in the office notes rather
    // than counted into a display string.
    const notes = [
      input.phone.trim() ? `Phone: ${input.phone.trim()}` : null,
      input.setupNotes.trim() ? `Setup & teardown: ${input.setupNotes.trim()}` : null,
      input.outsideVendors ? "Outside vendors coming in." : null,
      input.afterHours ? "After-hours access requested." : null,
      input.officeNotes.trim() || null,
    ]
      .filter(Boolean)
      .join("\n");

    const startsAt = atTime(input.date, window.start);
    const { data, error } = await db
      .from("bookings")
      .insert({
        resident_name: input.residentName.trim(),
        amenity: input.amenity,
        starts_at: startsAt,
        ends_at: window.end ? atTime(input.date, window.end) : null,
        guest_count: guests,
        event_type: input.eventType.trim() || null,
        deposit_status: input.depositStatus || "Not required",
        alcohol: input.alcohol,
        insurance_on_file: input.insuranceOnFile,
        status: "Requested",
        office_notes: notes || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const booking = toBooking(data as BookingRow);
    await audit(
      db,
      `Bookings: booked ${booking.amenity} on ${booking.date} for ${input.residentName.trim()}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, booking };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setBookingStatus(input: {
  id: string;
  status: BookingStatus;
}): Promise<{ ok: true; booking: Booking } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That booking isn't a saved record." };
    if (!BOOKING_STATUSES.includes(input.status)) {
      return { ok: false, error: "That isn't a valid booking state." };
    }

    const { data: existing, error: getErr } = await db
      .from("bookings")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That booking no longer exists." };

    const { data, error } = await db
      .from("bookings")
      .update({ status: input.status })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const booking = toBooking(data as BookingRow);
    await audit(
      db,
      `Bookings: ${booking.amenity} on ${booking.date} for ${existing.resident_name ?? "resident"} — ${input.status}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, booking };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ---------- vendors ---------- */

export async function createVendor(input: {
  name: string;
  trade: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** Structured per product rule 6 — the columns are discrete too. */
  address: Address;
  /** ISO dates from the pickers; blank when not agreed yet. */
  contractStart: string;
  contractEnd: string;
  insuranceExpiresOn: string;
}): Promise<{ ok: true; vendor: Vendor } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    if (!input.name.trim()) return { ok: false, error: "Add the company name." };
    if (!input.contactName.trim() && !input.contactPhone.trim() && !input.contactEmail.trim()) {
      return { ok: false, error: "Add a contact — a name, phone or email." };
    }

    const dates: [string, string][] = [
      [input.contractStart, "contract start"],
      [input.contractEnd, "contract end"],
      [input.insuranceExpiresOn, "insurance expiry"],
    ];
    for (const [value, label] of dates) {
      if (value.trim() && !ISO_DATE_RE.test(value.trim())) {
        return { ok: false, error: `Pick the ${label} date from the calendar.` };
      }
    }
    const start = input.contractStart.trim() || null;
    const end = input.contractEnd.trim() || null;
    const insurance = input.insuranceExpiresOn.trim() || null;
    if (start && end && end < start) {
      return { ok: false, error: "The contract ends before it starts — check those dates." };
    }

    const { data, error } = await db
      .from("vendors")
      .insert({
        name: input.name.trim(),
        trade: input.trade.trim() || null,
        contact_name: input.contactName.trim() || null,
        contact_phone: input.contactPhone.trim() || null,
        contact_email: input.contactEmail.trim() || null,
        street_number: input.address.streetNo.trim() || null,
        street_name: input.address.street.trim() || null,
        unit: input.address.unit.trim() || null,
        city: input.address.city.trim() || null,
        state: input.address.state.trim() || null,
        zip: input.address.zip.trim() || null,
        contract_start: start,
        contract_end: end,
        insurance_expires_on: insurance,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const vendor = toVendor(data as VendorRow);
    await audit(
      db,
      `Vendors: added ${vendor.name} (${vendor.trade})`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, vendor };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setVendorActive(input: {
  id: string;
  active: boolean;
}): Promise<{ ok: true; active: boolean } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();
    if (!UUID_RE.test(input.id)) return { ok: false, error: "That vendor isn't a saved record." };

    const { data: existing, error: getErr } = await db
      .from("vendors")
      .select("id, name")
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That vendor no longer exists." };

    const { error } = await db
      .from("vendors")
      .update({ active: input.active })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    await audit(
      db,
      `Vendors: ${input.active ? "reinstated" : "deactivated"} ${existing.name}`,
      actorName,
      actorId,
    );

    revalidatePath("/admin");
    return { ok: true, active: input.active };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
