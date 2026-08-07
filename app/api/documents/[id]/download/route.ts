import { NextResponse } from "next/server";

import { DOCUMENTS_BUCKET } from "@/lib/supabase/documents";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Open or download a library document. The bucket is private, so this route
 * is the only door: it checks the session, enforces the document's access
 * level, logs the download, and redirects to a short-lived signed URL.
 *
 * `?download=1` asks the browser to save instead of opening the PDF inline.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to open documents." }, { status: 401 });
  }

  const service = requireServiceSupabase();
  const [{ data: doc }, { data: profile }] = await Promise.all([
    service
      .from("documents")
      .select("id, title, file_path, file_name, access_level, is_archived")
      .eq("id", id)
      .maybeSingle(),
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!doc) {
    return NextResponse.json({ error: "That document no longer exists." }, { status: 404 });
  }

  // Staff see everything; residents see what the office published to them.
  const isStaff = profile?.role === "admin";
  const residentVisible =
    !doc.is_archived && (doc.access_level === "public" || doc.access_level === "resident");
  if (!isStaff && !residentVisible) {
    return NextResponse.json({ error: "That document isn't available." }, { status: 403 });
  }

  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";
  const { data: signed, error: signErr } = await service.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.file_path, 120, wantsDownload ? { download: doc.file_name } : undefined);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: `The file could not be opened: ${signErr?.message ?? "no URL"}` },
      { status: 500 },
    );
  }

  // Best-effort bookkeeping — never blocks the open.
  const { data: current } = await service
    .from("documents")
    .select("download_count")
    .eq("id", id)
    .maybeSingle();
  await service
    .from("documents")
    .update({
      download_count: (current?.download_count ?? 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", id);
  await service.from("document_downloads").insert({ document_id: id, user_id: user.id });

  return NextResponse.redirect(signed.signedUrl, 302);
}
