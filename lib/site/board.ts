import "server-only";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * The board, for the public governance page.
 *
 * Read from the same `directors` rows the office seats and ends in
 * Board & meetings, so the website cannot drift from the record — the four
 * names hard-coded here before named two people who were never directors and
 * gave a third the wrong office.
 *
 * Deliberately narrow: a director's street address is on that row, and a
 * board roster is public while a volunteer's home address is not. Only the
 * name, the office and the term are selected, so the wider row cannot leak by
 * someone later spreading it into a component.
 */

export type BoardMember = {
  name: string;
  role: string;
  /** Term expiry as a year, for "through 2031". Null when open-ended. */
  termThrough: string | null;
};

/* Seniority, so the roster reads President first however the rows were
   entered. Anything unlisted sorts after, alphabetically by office. */
const ROLE_ORDER = [
  "President",
  "Vice president",
  "Treasurer",
  "Secretary",
  "Director",
];

function rank(role: string): number {
  const i = ROLE_ORDER.findIndex((r) => r.toLowerCase() === role.trim().toLowerCase());
  return i === -1 ? ROLE_ORDER.length : i;
}

export async function loadBoard(): Promise<BoardMember[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const db = createServiceClient();
    const { data } = await db
      .from("directors")
      .select("name, role, term_end")
      .order("name");

    const rows = (data ?? []) as { name: string; role: string; term_end: string | null }[];
    /* term_end is when the term runs out, not when somebody was removed — a
       seat ending in 2031 is current. Only a date already past is over, and a
       null end date is an open-ended appointment. */
    const today = new Date().toISOString().slice(0, 10);
    return rows
      .filter((r) => !r.term_end || r.term_end >= today)
      .map((r) => ({
        name: r.name?.trim() || "Director",
        role: r.role?.trim() || "Director",
        termThrough: r.term_end ? r.term_end.slice(0, 4) : null,
      }))
      .sort((a, b) => rank(a.role) - rank(b.role) || a.name.localeCompare(b.name));
  } catch {
    // The section says the roster is unavailable rather than inventing one.
    return [];
  }
}
