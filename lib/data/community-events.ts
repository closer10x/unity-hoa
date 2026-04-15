import { requireServiceSupabase } from "@/lib/supabase/service";
import type { CommunityEventRow } from "@/lib/types/community";

/** Published events for public marketing pages (server-only; uses service role like other public reads). */
export async function fetchPublishedCommunityEvents(
  limit = 200,
): Promise<{ items: CommunityEventRow[] } | { error: string }> {
  try {
    const supabase = requireServiceSupabase();
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .eq("published", true)
      .order("starts_at", { ascending: true })
      .limit(limit);
    if (error) return { error: error.message };
    return { items: (data ?? []) as CommunityEventRow[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
