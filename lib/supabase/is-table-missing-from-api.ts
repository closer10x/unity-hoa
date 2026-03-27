import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST when a `public.*` table was never migrated or not exposed. */
export function isTableMissingFromApi(
  err: PostgrestError | null,
  tableName: string,
): boolean {
  if (!err) return false;
  const m = err.message ?? "";
  if (!m.includes(tableName)) return false;
  return err.code === "PGRST205" || m.includes("schema cache");
}
