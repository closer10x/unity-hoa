"use server";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/utils/hashPassword";
import type { UploadLinkPublicInfo } from "@/lib/types/uploadLinks";
import type { DocumentCategoryRow } from "@/lib/types/documents";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/* ─── Get link public info (no password needed) ──────────────────────── */

export async function getUploadLinkInfo(
  token: string,
): Promise<{ link?: UploadLinkPublicInfo; categories?: DocumentCategoryRow[]; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Service unavailable" };

  const client = createServiceClient();

  const { data, error } = await client
    .from("upload_links")
    .select("id, label, expires_at, max_uploads, upload_count, allowed_categories, requires_review, is_active")
    .eq("id", token)
    .maybeSingle();

  if (error || !data) return { error: "Upload link not found" };

  if (!data.is_active) return { error: "This upload link has been deactivated" };

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { error: "This upload link has expired" };
  }

  if (data.max_uploads && data.upload_count >= data.max_uploads) {
    return { error: "This upload link has reached its maximum number of uploads" };
  }

  let categories: DocumentCategoryRow[] = [];
  if (data.allowed_categories?.length) {
    const { data: cats } = await client
      .from("document_categories")
      .select("*")
      .in("id", data.allowed_categories)
      .order("sort_order");
    categories = (cats as DocumentCategoryRow[]) ?? [];
  } else {
    const { data: cats } = await client
      .from("document_categories")
      .select("*")
      .order("sort_order");
    categories = (cats as DocumentCategoryRow[]) ?? [];
  }

  return { link: data as UploadLinkPublicInfo, categories };
}

/* ─── Validate password ──────────────────────────────────────────────── */

export async function validateUploadPassword(
  token: string,
  password: string,
  clientIp?: string,
  userAgent?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Service unavailable" };

  const client = createServiceClient();

  const { data: link } = await client
    .from("upload_links")
    .select("id, password_hash, is_active, expires_at, max_uploads, upload_count")
    .eq("id", token)
    .maybeSingle();

  if (!link) return { success: false, error: "Upload link not found" };
  if (!link.is_active) return { success: false, error: "This upload link has been deactivated" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, error: "This upload link has expired" };
  }
  if (link.max_uploads && link.upload_count >= link.max_uploads) {
    return { success: false, error: "Maximum uploads reached" };
  }

  // Rate limiting check
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await client
    .from("upload_link_sessions")
    .select("*", { count: "exact", head: true })
    .eq("upload_link_id", token)
    .eq("success", false)
    .gte("accessed_at", windowStart);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    await logSession(client, token, clientIp, userAgent, false);
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const valid = await verifyPassword(password, link.password_hash);

  await logSession(client, token, clientIp, userAgent, valid);

  if (!valid) {
    return { success: false, error: "Invalid password" };
  }

  await client
    .from("upload_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token);

  return { success: true };
}

async function logSession(
  client: ReturnType<typeof createServiceClient>,
  linkId: string,
  ip?: string,
  ua?: string,
  success?: boolean,
) {
  await client.from("upload_link_sessions").insert({
    upload_link_id: linkId,
    ip_address: ip ?? null,
    user_agent: ua ?? null,
    success: success ?? false,
  });
}

/* ─── Upload file via public link ────────────────────────────────────── */

export async function uploadViaLink(
  token: string,
  formData: FormData,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Service unavailable" };

  const client = createServiceClient();

  const { data: link } = await client
    .from("upload_links")
    .select("id, is_active, expires_at, max_uploads, upload_count, allowed_categories, requires_review")
    .eq("id", token)
    .maybeSingle();

  if (!link) return { error: "Upload link not found" };
  if (!link.is_active) return { error: "This upload link has been deactivated" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { error: "Link expired" };
  if (link.max_uploads && link.upload_count >= link.max_uploads) return { error: "Max uploads reached" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) return { error: "File exceeds 50 MB limit" };

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
  ];

  if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
    return { error: "File type not allowed" };
  }

  const title = formData.get("title") as string;
  if (!title?.trim()) return { error: "Title is required" };

  const categoryId = formData.get("category_id") as string | null;
  const description = formData.get("description") as string | null;
  const submitterName = formData.get("submitter_name") as string | null;
  const submitterEmail = formData.get("submitter_email") as string | null;

  // Validate category against allowed list
  if (categoryId && link.allowed_categories?.length) {
    if (!link.allowed_categories.includes(categoryId)) {
      return { error: "Selected category is not allowed for this upload link" };
    }
  }

  const uuid = crypto.randomUUID();
  const filePath = `${token}/${uuid}-${file.name}`;

  // Upload to pending-uploads bucket
  // NOTE: Production should integrate a virus/malware scanning service (ClamAV, VirusTotal API) here
  const { error: uploadErr } = await client.storage
    .from("pending-uploads")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) return { error: uploadErr.message };

  if (link.requires_review) {
    const { error: insertErr } = await client.from("pending_documents").insert({
      upload_link_id: token,
      file_path: filePath,
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type || "application/octet-stream",
      submitted_title: title.trim(),
      submitted_description: description?.trim() || null,
      submitted_category: categoryId || null,
      submitter_name: submitterName?.trim() || null,
      submitter_email: submitterEmail?.trim() || null,
    });

    if (insertErr) return { error: insertErr.message };
  } else {
    const destPath = `library/${uuid}-${file.name}`;

    const { data: fileData, error: dlErr } = await client.storage
      .from("pending-uploads")
      .download(filePath);

    if (dlErr || !fileData) return { error: "Upload processing failed" };

    const { error: mvErr } = await client.storage
      .from("documents")
      .upload(destPath, fileData, { cacheControl: "3600", upsert: false });

    if (mvErr) return { error: mvErr.message };

    const { error: insertErr } = await client.from("documents").insert({
      title: title.trim(),
      description: description?.trim() || null,
      category_id: categoryId || null,
      file_path: destPath,
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type || "application/octet-stream",
      access_level: "resident",
    });

    if (insertErr) return { error: insertErr.message };

    await client.storage.from("pending-uploads").remove([filePath]);
  }

  await client
    .from("upload_links")
    .update({ upload_count: link.upload_count + 1 })
    .eq("id", token);

  return {};
}
