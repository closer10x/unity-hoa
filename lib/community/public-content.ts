import { requireServiceSupabase } from "@/lib/supabase/service";
import type { AnnouncementRow } from "@/lib/types/community";

/**
 * Read-only fetchers for the public marketing pages. They run server-side with
 * the service client (announcements and events have no anon RLS policies) and
 * degrade to empty lists when Supabase is unreachable or unconfigured, so the
 * pages fall back to their no-data states instead of erroring.
 */

export type PublicAnnouncement = Pick<
  AnnouncementRow,
  "id" | "title" | "body" | "published_at"
>;

export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  category: string;
};

export async function getPublishedAnnouncements(
  limit = 3,
): Promise<PublicAnnouncement[]> {
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data as PublicAnnouncement[];
  } catch {
    return [];
  }
}

export async function getUpcomingEvents(limit = 6): Promise<PublicEvent[]> {
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("community_events")
      .select("id, title, description, starts_at, ends_at, location, category")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data as PublicEvent[];
  } catch {
    return [];
  }
}

/** The association is in greater Houston; pin dates to its local time. */
const TZ = "America/Chicago";

export function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function formatEventTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}
