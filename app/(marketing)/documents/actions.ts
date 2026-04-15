"use server";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signDocumentUrl } from "@/lib/supabase/documents";
import type {
  DocumentWithCategory,
  DocumentCategoryRow,
  CategoryWithCount,
  DocumentFilters,
} from "@/lib/types/documents";

function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createServiceClient();
}

export async function listPublicCategories(): Promise<CategoryWithCount[]> {
  const client = getClient();
  if (!client) return [];

  const { data: categories } = await client
    .from("document_categories")
    .select("*")
    .order("sort_order");

  if (!categories) return [];

  const { data: docs } = await client
    .from("documents")
    .select("category_id")
    .eq("is_archived", false)
    .in("access_level", ["public", "resident"]);

  const counts = new Map<string, number>();
  for (const d of docs ?? []) {
    counts.set(d.category_id, (counts.get(d.category_id) ?? 0) + 1);
  }

  return (categories as DocumentCategoryRow[]).map((c) => ({
    ...c,
    document_count: counts.get(c.id) ?? 0,
  }));
}

export async function listPublicDocuments(
  filters: DocumentFilters = {},
  page = 0,
  pageSize = 20,
): Promise<{ items: DocumentWithCategory[]; total: number }> {
  const client = getClient();
  if (!client) return { items: [], total: 0 };

  let query = client
    .from("documents")
    .select("*, document_categories(*)", { count: "exact" })
    .eq("is_archived", false)
    .in("access_level", ["public", "resident"]);

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
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

export async function listPublicPinnedDocuments(): Promise<DocumentWithCategory[]> {
  const client = getClient();
  if (!client) return [];

  const { data } = await client
    .from("documents")
    .select("*, document_categories(*)")
    .eq("is_pinned", true)
    .eq("is_archived", false)
    .in("access_level", ["public", "resident"])
    .order("uploaded_at", { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map((d: Record<string, unknown>) => {
    const category = d.document_categories as DocumentCategoryRow;
    const { document_categories: _unused, ...rest } = d;
    return { ...rest, category } as DocumentWithCategory;
  });
}

export async function getPublicDocumentStats(): Promise<{
  totalDocuments: number;
  lastUpdated: string | null;
}> {
  const client = getClient();
  if (!client) return { totalDocuments: 0, lastUpdated: null };

  const { count } = await client
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false)
    .in("access_level", ["public", "resident"]);

  const { data: latest } = await client
    .from("documents")
    .select("uploaded_at")
    .eq("is_archived", false)
    .in("access_level", ["public", "resident"])
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    totalDocuments: count ?? 0,
    lastUpdated: latest?.uploaded_at ?? null,
  };
}

export async function getPublicDocumentDownloadUrl(id: string): Promise<{ url?: string; error?: string }> {
  const client = getClient();
  if (!client) return { error: "Not configured" };

  const { data: doc } = await client
    .from("documents")
    .select("file_path, file_name, access_level")
    .eq("id", id)
    .single();

  if (!doc) return { error: "Document not found" };
  if (doc.access_level !== "public" && doc.access_level !== "resident") {
    return { error: "Access denied" };
  }

  const url = await signDocumentUrl(client, doc.file_path, 3600);
  if (!url) return { error: "Could not generate download URL" };

  const current = await client.from("documents").select("download_count").eq("id", id).single();
  if (current.data) {
    await client.from("documents").update({
      download_count: current.data.download_count + 1,
      last_downloaded_at: new Date().toISOString(),
    }).eq("id", id);
  }

  return { url };
}
