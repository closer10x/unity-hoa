import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "work-order-images";

export const WORK_ORDER_IMAGES_BUCKET = BUCKET;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signAttachmentUrls(
  client: SupabaseClient,
  paths: string[],
  expiresInSec = 3600,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const path of paths) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSec);
    if (!error && data?.signedUrl) {
      map.set(path, data.signedUrl);
    }
  }
  return map;
}
