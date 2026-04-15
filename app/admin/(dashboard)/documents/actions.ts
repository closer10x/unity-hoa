"use server";

import { revalidatePath } from "next/cache";

import { getServiceClientForAdmin } from "@/lib/auth/admin-service";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  signDocumentUrl,
  uploadDocumentFile,
  deleteDocumentFile,
} from "@/lib/supabase/documents";
import type {
  DocumentRow,
  DocumentWithCategory,
  DocumentCategoryRow,
  CategoryWithCount,
  DocumentFilters,
  AcknowledgmentWithUser,
  DocumentAccessLevel,
} from "@/lib/types/documents";

/* ─── Categories ──────────────────────────────────────────────────── */

export async function listCategories(): Promise<CategoryWithCount[]> {
  const client = await getServiceClientForAdmin();
  const { data: categories } = await client
    .from("document_categories")
    .select("*")
    .order("sort_order");

  if (!categories) return [];

  const { data: docs } = await client
    .from("documents")
    .select("category_id")
    .eq("is_archived", false);

  const counts = new Map<string, number>();
  for (const d of docs ?? []) {
    counts.set(d.category_id, (counts.get(d.category_id) ?? 0) + 1);
  }

  return (categories as DocumentCategoryRow[]).map((c) => ({
    ...c,
    document_count: counts.get(c.id) ?? 0,
  }));
}

/* ─── Documents list ──────────────────────────────────────────────── */

export async function listDocuments(
  filters: DocumentFilters = {},
  page = 0,
  pageSize = 20,
): Promise<{ items: DocumentWithCategory[]; total: number }> {
  const client = await getServiceClientForAdmin();

  let query = client
    .from("documents")
    .select("*, document_categories(*)", { count: "exact" });

  if (!filters.showArchived) {
    query = query.eq("is_archived", false);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.accessLevel) {
    query = query.eq("access_level", filters.accessLevel);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},file_name.ilike.${term}`);
  }
  if (filters.fileType) {
    query = query.eq("file_type", filters.fileType);
  }
  if (filters.dateRange && filters.dateRange !== "custom") {
    const days = parseInt(filters.dateRange, 10);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    query = query.gte("uploaded_at", since);
  }
  if (filters.dateFrom) {
    query = query.gte("uploaded_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("uploaded_at", filters.dateTo);
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("uploaded_at", { ascending: true });
      break;
    case "a-z":
      query = query.order("title", { ascending: true });
      break;
    case "z-a":
      query = query.order("title", { ascending: false });
      break;
    case "most-downloaded":
      query = query.order("download_count", { ascending: false });
      break;
    case "recently-updated":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query
        .order("is_pinned", { ascending: false })
        .order("uploaded_at", { ascending: false });
  }

  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error || !data) return { items: [], total: 0 };

  const items: DocumentWithCategory[] = data.map((d: Record<string, unknown>) => {
    const category = d.document_categories as DocumentCategoryRow;
    const { document_categories: _unused, ...rest } = d;
    return { ...rest, category } as DocumentWithCategory;
  });

  return { items, total: count ?? 0 };
}

/* ─── Single document ─────────────────────────────────────────────── */

export async function getDocument(id: string): Promise<DocumentWithCategory | null> {
  const client = await getServiceClientForAdmin();

  const { data, error } = await client
    .from("documents")
    .select("*, document_categories(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const category = data.document_categories as DocumentCategoryRow;
  const { document_categories: _unused, ...rest } = data;
  return { ...rest, category } as DocumentWithCategory;
}

/* ─── Pinned documents ────────────────────────────────────────────── */

export async function listPinnedDocuments(): Promise<DocumentWithCategory[]> {
  const client = await getServiceClientForAdmin();

  const { data } = await client
    .from("documents")
    .select("*, document_categories(*)")
    .eq("is_pinned", true)
    .eq("is_archived", false)
    .order("uploaded_at", { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map((d: Record<string, unknown>) => {
    const category = d.document_categories as DocumentCategoryRow;
    const { document_categories: _unused, ...rest } = d;
    return { ...rest, category } as DocumentWithCategory;
  });
}

/* ─── Recently added ──────────────────────────────────────────────── */

export async function listRecentDocuments(limit = 3): Promise<DocumentWithCategory[]> {
  const client = await getServiceClientForAdmin();

  const { data } = await client
    .from("documents")
    .select("*, document_categories(*)")
    .eq("is_archived", false)
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((d: Record<string, unknown>) => {
    const category = d.document_categories as DocumentCategoryRow;
    const { document_categories: _unused, ...rest } = d;
    return { ...rest, category } as DocumentWithCategory;
  });
}

/* ─── Upload ──────────────────────────────────────────────────────── */

export async function uploadDocument(formData: FormData): Promise<{ id?: string; error?: string }> {
  const client = await getServiceClientForAdmin();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) return { error: "File exceeds 50 MB limit" };

  const title = formData.get("title") as string;
  const categoryId = formData.get("category_id") as string;
  const accessLevel = (formData.get("access_level") as DocumentAccessLevel) || "resident";
  const description = (formData.get("description") as string) || null;
  const version = (formData.get("version") as string) || "v1.0";
  const effectiveDate = (formData.get("effective_date") as string) || null;
  const expirationDate = (formData.get("expiration_date") as string) || null;
  const isPinned = formData.get("is_pinned") === "true";
  const requiresAck = formData.get("requires_acknowledgment") === "true";
  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const uuid = crypto.randomUUID();
  const filePath = `library/${uuid}-${file.name}`;

  const uploadResult = await uploadDocumentFile(client, filePath, file);
  if ("error" in uploadResult) return { error: uploadResult.error };

  const { data: session } = await client.auth.getUser();

  const { data, error } = await client.from("documents").insert({
    title,
    description,
    category_id: categoryId,
    file_path: filePath,
    file_name: file.name,
    file_size_bytes: file.size,
    file_type: file.type || "application/octet-stream",
    version,
    effective_date: effectiveDate || null,
    expiration_date: expirationDate || null,
    tags,
    access_level: accessLevel,
    is_pinned: isPinned,
    requires_acknowledgment: requiresAck,
    uploaded_by: session?.user?.id ?? null,
  }).select("id").single();

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return { id: data.id };
}

/* ─── Update document ─────────────────────────────────────────────── */

export async function updateDocument(
  id: string,
  updates: Partial<Pick<DocumentRow,
    "title" | "description" | "category_id" | "access_level" | "version" |
    "effective_date" | "expiration_date" | "tags" | "is_pinned" | "is_archived" | "requires_acknowledgment"
  >>,
): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();

  const { error } = await client.from("documents").update(updates).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return {};
}

/* ─── Archive / Unarchive ─────────────────────────────────────────── */

export async function archiveDocuments(ids: string[]): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();
  const { error } = await client.from("documents").update({ is_archived: true }).in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/admin/documents");
  return {};
}

export async function unarchiveDocuments(ids: string[]): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();
  const { error } = await client.from("documents").update({ is_archived: false }).in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/admin/documents");
  return {};
}

/* ─── Delete ──────────────────────────────────────────────────────── */

export async function deleteDocuments(ids: string[]): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();

  const { data: docs } = await client.from("documents").select("file_path").in("id", ids);
  if (docs?.length) {
    for (const doc of docs) {
      await deleteDocumentFile(client, doc.file_path);
    }
  }

  const { error } = await client.from("documents").delete().in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return {};
}

/* ─── Download signed URL ─────────────────────────────────────────── */

export async function getDocumentDownloadUrl(id: string): Promise<{ url?: string; error?: string }> {
  const client = await getServiceClientForAdmin();

  const { data: doc } = await client.from("documents").select("file_path, file_name").eq("id", id).single();
  if (!doc) return { error: "Document not found" };

  const url = await signDocumentUrl(client, doc.file_path, 3600);
  if (!url) return { error: "Could not generate download URL" };

  await client.from("documents").update({
    download_count: (await client.from("documents").select("download_count").eq("id", id).single()).data?.download_count + 1,
    last_downloaded_at: new Date().toISOString(),
  }).eq("id", id);

  const { data: session } = await client.auth.getUser();
  if (session?.user) {
    await client.from("document_downloads").insert({
      document_id: id,
      user_id: session.user.id,
    });
  }

  return { url };
}

/* ─── Increment view count ────────────────────────────────────────── */

export async function incrementViewCount(id: string): Promise<void> {
  const client = await getServiceClientForAdmin();
  const { data } = await client.from("documents").select("view_count").eq("id", id).single();
  if (data) {
    await client.from("documents").update({ view_count: data.view_count + 1 }).eq("id", id);
  }
}

/* ─── Acknowledgment ──────────────────────────────────────────────── */

export async function acknowledgeDocument(documentId: string): Promise<{ error?: string }> {
  const client = await getServiceClientForAdmin();
  const { data: session } = await client.auth.getUser();
  if (!session?.user) return { error: "Not authenticated" };

  const { error } = await client.from("document_acknowledgments").insert({
    document_id: documentId,
    user_id: session.user.id,
  });

  if (error && !error.message.includes("duplicate")) return { error: error.message };
  revalidatePath("/admin/documents");
  return {};
}

export async function getUserAcknowledgments(userId: string): Promise<Set<string>> {
  const client = await getServiceClientForAdmin();
  const { data } = await client
    .from("document_acknowledgments")
    .select("document_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((d) => d.document_id));
}

export async function getDocumentAcknowledgments(documentId: string): Promise<AcknowledgmentWithUser[]> {
  const client = await getServiceClientForAdmin();
  const { data } = await client
    .from("document_acknowledgments")
    .select("*")
    .eq("document_id", documentId)
    .order("acknowledged_at", { ascending: false });

  if (!data?.length) return [];

  const userIds = [...new Set(data.map((a) => a.user_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = new Map<string, string | null>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.display_name);
  }

  return data.map((a) => ({
    ...a,
    user_display_name: profileMap.get(a.user_id) ?? null,
    user_email: null,
  }));
}

/* ─── Unacknowledged docs for current user ────────────────────────── */

export async function listUnacknowledgedDocuments(userId: string): Promise<DocumentWithCategory[]> {
  const client = await getServiceClientForAdmin();

  const { data: allRequired } = await client
    .from("documents")
    .select("*, document_categories(*)")
    .eq("requires_acknowledgment", true)
    .eq("is_archived", false);

  if (!allRequired?.length) return [];

  const { data: acked } = await client
    .from("document_acknowledgments")
    .select("document_id")
    .eq("user_id", userId);

  const ackedSet = new Set((acked ?? []).map((a) => a.document_id));

  return allRequired
    .filter((d) => !ackedSet.has(d.id))
    .map((d: Record<string, unknown>) => {
      const category = d.document_categories as DocumentCategoryRow;
      const { document_categories: _unused, ...rest } = d;
      return { ...rest, category } as DocumentWithCategory;
    });
}

/* ─── Version history ─────────────────────────────────────────────── */

export async function getVersionHistory(documentId: string): Promise<DocumentRow[]> {
  const client = await getServiceClientForAdmin();

  const versions: DocumentRow[] = [];
  let currentId: string | null = documentId;

  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const result = await client
      .from("documents")
      .select("*")
      .eq("superseded_by", currentId)
      .maybeSingle();
    const older = result.data as DocumentRow | null;
    if (!older) break;
    versions.push(older);
    currentId = older.id;
  }

  return versions;
}

/* ─── Stats ───────────────────────────────────────────────────────── */

export async function getDocumentStats(): Promise<{
  totalDocuments: number;
  lastUpdated: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { totalDocuments: 0, lastUpdated: null };
  }
  const client = createServiceClient();
  const { count } = await client
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false);

  const { data: latest } = await client
    .from("documents")
    .select("uploaded_at")
    .eq("is_archived", false)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    totalDocuments: count ?? 0,
    lastUpdated: latest?.uploaded_at ?? null,
  };
}

/* ─── All tags (for autocomplete) ─────────────────────────────────── */

export async function listAllTags(): Promise<string[]> {
  const client = await getServiceClientForAdmin();
  const { data } = await client.from("documents").select("tags");
  if (!data) return [];
  const set = new Set<string>();
  for (const d of data) {
    for (const t of d.tags ?? []) set.add(t);
  }
  return [...set].sort();
}
