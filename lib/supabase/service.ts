import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export function requireServiceSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return createServiceClient();
}
