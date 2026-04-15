"use server";

import { revalidatePath } from "next/cache";

import { getServiceClientForAdmin } from "@/lib/auth/admin-service";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  uploadDocumentFile,
  deleteDocumentFile,
} from "@/lib/supabase/documents";
import { hashPassword } from "@/lib/utils/hashPassword";
import type {
  UploadLinkRow,
  PendingDocumentRow,
  PendingDocumentWithLink,
} from "@/lib/types/uploadLinks";
import type { DocumentCategoryRow } from "@/lib/types/documents";

/* ─── Upload Links CRUD ──────────────────────────────────────────────── */

export async function listUploadLinks(): Promise<UploadLinkRow[]> {
  const client = await getServiceClientForAdmin();
  const { data } = await client
    .from("upload_links")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as UploadLinkRow[]) ?? [];
}

export async function createUploadLink(params: {
  label: string;
  password: string;
  expiresAt: string | null;
  maxUploads: number | null;
  allowedCategories: string[];
  requiresReview: boolean;
}): Promise<{ id?: string; error?: string }> {
  const session = await requireAdminUser();
  const client = await getServiceClientForAdmin();

  const password_hash = await hashPassword(params.password);

  const { data, error } = await client
    .from("upload_links")
    .insert({
      label: params.label,
      password_hash,
      created_by: session.user.id,
      expires_at: params.expiresAt,
      max_uploads: params.maxUploads,
      allowed_categories: params.allowedCategories,
      requires_review: params.requiresReview,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return { id: data.id };
}

export async function updateUploadLink(
  id: string,
  updates: Partial<Pick<UploadLinkRow, "label" | "expires_at" | "max_uploads" | "allowed_categories" | "requires_review" | "is_active">>,
): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();
  const { error } = await client.from("upload_links").update(updates).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/documents");
  return {};
}

export async function deactivateUploadLink(id: string): Promise<{ error?: string }> {
  return updateUploadLink(id, { is_active: false });
}

export async function deleteUploadLink(id: string): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();
  const { error } = await client.from("upload_links").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/documents");
  return {};
}

/* ─── Pending Documents ──────────────────────────────────────────────── */

export async function listPendingDocuments(): Promise<PendingDocumentWithLink[]> {
  const client = await getServiceClientForAdmin();

  const { data: pending } = await client
    .from("pending_documents")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  if (!pending?.length) return [];

  const linkIds = [...new Set(pending.map((p: PendingDocumentRow) => p.upload_link_id))];
  const { data: links } = await client
    .from("upload_links")
    .select("id, label")
    .in("id", linkIds);

  const linkMap = new Map<string, string>();
  for (const l of links ?? []) linkMap.set(l.id, l.label);

  const catIds = [...new Set(pending.map((p: PendingDocumentRow) => p.submitted_category).filter(Boolean))] as string[];
  const { data: cats } = catIds.length
    ? await client.from("document_categories").select("id, name").in("id", catIds)
    : { data: [] };

  const catMap = new Map<string, string>();
  for (const c of cats ?? []) catMap.set(c.id, c.name);

  return pending.map((p: PendingDocumentRow) => ({
    ...p,
    upload_link_label: linkMap.get(p.upload_link_id) ?? null,
    category_name: p.submitted_category ? catMap.get(p.submitted_category) ?? null : null,
  }));
}

export async function getPendingCount(): Promise<number> {
  const client = await getServiceClientForAdmin();
  const { count } = await client
    .from("pending_documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function approvePendingDocument(
  pendingId: string,
  overrides?: { title?: string; description?: string; categoryId?: string },
): Promise<{ error?: string }> {
  const session = await requireAdminUser();
  const client = await getServiceClientForAdmin();

  const { data: pending, error: fetchErr } = await client
    .from("pending_documents")
    .select("*")
    .eq("id", pendingId)
    .single();

  if (fetchErr || !pending) return { error: "Pending document not found" };

  const sourcePath = pending.file_path;
  const destPath = `library/${crypto.randomUUID()}-${pending.file_name}`;

  const { data: fileData, error: downloadErr } = await client.storage
    .from("pending-uploads")
    .download(sourcePath);

  if (downloadErr || !fileData) return { error: "Could not read uploaded file" };

  const uploadResult = await uploadDocumentFile(client, destPath, fileData);
  if ("error" in uploadResult) return { error: uploadResult.error };

  const { error: insertErr } = await client.from("documents").insert({
    title: overrides?.title ?? pending.submitted_title,
    description: overrides?.description ?? pending.submitted_description,
    category_id: overrides?.categoryId ?? pending.submitted_category,
    file_path: destPath,
    file_name: pending.file_name,
    file_size_bytes: pending.file_size_bytes,
    file_type: pending.file_type,
    access_level: "resident",
    uploaded_by: session.user.id,
  });

  if (insertErr) return { error: insertErr.message };

  await client
    .from("pending_documents")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq("id", pendingId);

  await client.storage.from("pending-uploads").remove([sourcePath]);

  revalidatePath("/admin/documents");
  return {};
}

export async function rejectPendingDocument(
  pendingId: string,
  reason: string,
): Promise<{ error?: string }> {
  const session = await requireAdminUser();
  const client = await getServiceClientForAdmin();

  const { data: pending } = await client
    .from("pending_documents")
    .select("file_path")
    .eq("id", pendingId)
    .single();

  if (pending) {
    await client.storage.from("pending-uploads").remove([pending.file_path]);
  }

  const { error } = await client
    .from("pending_documents")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq("id", pendingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return {};
}

export async function getPendingDocumentDownloadUrl(pendingId: string): Promise<{ url?: string; error?: string }> {
  const client = await getServiceClientForAdmin();

  const { data } = await client
    .from("pending_documents")
    .select("file_path")
    .eq("id", pendingId)
    .single();

  if (!data) return { error: "Not found" };

  const { data: signed, error } = await client.storage
    .from("pending-uploads")
    .createSignedUrl(data.file_path, 3600);

  if (error || !signed?.signedUrl) return { error: "Could not generate URL" };
  return { url: signed.signedUrl };
}
