import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

export async function signDocumentUrl(
  client: SupabaseClient,
  filePath: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresInSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadDocumentFile(
  client: SupabaseClient,
  filePath: string,
  file: File | Blob,
): Promise<{ path: string } | { error: string }> {
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
  if (error) return { error: error.message };
  return { path: data.path };
}

export async function deleteDocumentFile(
  client: SupabaseClient,
  filePath: string,
): Promise<{ error?: string }> {
  const { error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .remove([filePath]);
  if (error) return { error: error.message };
  return {};
}
