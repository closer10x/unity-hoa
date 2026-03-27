import { requireAdminUser } from "@/lib/auth/require-admin";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Service-role client; call only after verifying an admin session. */
export async function getServiceClientForAdmin() {
  await requireAdminUser();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase service role is not configured");
  }
  return createServiceClient();
}
