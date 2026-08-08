import { NextResponse } from "next/server";

import { DOCUMENTS_BUCKET, uploadDocumentFile } from "@/lib/supabase/documents";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Admin document library: GET lists categories for the add-form's picker,
 * POST uploads a file to the documents bucket and records the library row.
 */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

async function adminUserId(): Promise<string | null> {
  if (!isSupabaseAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" ? user.id : null;
}

export async function GET() {
  if (!(await adminUserId())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const service = requireServiceSupabase();
  const { data, error } = await service
    .from("document_categories")
    .select("id, name")
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ categories: data });
}

export async function POST(req: Request) {
  const userId = await adminUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Files are capped at 25 MB." },
      { status: 400 },
    );
  }
  if (!title || !categoryId) {
    return NextResponse.json(
      { error: "A title and a category are required." },
      { status: 400 },
    );
  }

  const service = requireServiceSupabase();
  const safeName = file.name.replaceAll(/[^\w.\-]+/g, "_").slice(-100);
  const filePath = `library/${crypto.randomUUID()}-${safeName}`;

  const uploaded = await uploadDocumentFile(service, filePath, file);
  if ("error" in uploaded) {
    return NextResponse.json(
      { error: `Upload failed: ${uploaded.error}` },
      { status: 502 },
    );
  }

  const { data: row, error: insertErr } = await service
    .from("documents")
    .insert({
      title,
      category_id: categoryId,
      file_path: uploaded.path,
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type || "application/octet-stream",
      uploaded_by: userId,
      // New documents are drafts: the office publishes them deliberately.
      // Without this the column default would make every upload readable by
      // residents the moment it lands.
      access_level: "manager_only",
    })
    .select("id, title, uploaded_at")
    .single();
  if (insertErr) {
    // Don't leave an orphaned file behind the failed row.
    await service.storage.from(DOCUMENTS_BUCKET).remove([uploaded.path]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, document: row });
}
