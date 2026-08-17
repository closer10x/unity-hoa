import { NextResponse } from "next/server";

import {
  MESSAGE_FILES_BUCKET,
  attachmentName,
  isRecordPhotoKind,
} from "@/lib/supabase/message-files";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is string => typeof p === "string" && p.length > 0);
}

/**
 * Opens a photo on a pet, a registered vehicle, a work order or a concern,
 * or a plan on an architectural application.
 *
 * The bucket is private, so this route is the only door: it checks the
 * session, proves the caller may see *this* row, and redirects to a signed
 * URL that expires in two minutes. Staff see every household's files;
 * a resident sees only their own.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (!isRecordPhotoKind(kind) || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "That file isn't available." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to open files." }, { status: 401 });
  }

  const service = requireServiceSupabase();
  const { data: profile } = await service
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const isStaff = profile?.role === "admin";

  const url = new URL(req.url);
  const index = Number.parseInt(url.searchParams.get("i") ?? "0", 10);
  const download = url.searchParams.get("download") === "1";

  let path: string | null = null;
  let allowed = isStaff;

  if (kind === "pets" || kind === "vehicles") {
    const table = kind === "pets" ? "resident_pets" : "resident_vehicles";
    const { data: row } = await service
      .from(table)
      .select("user_id, photo_path")
      .eq("id", id)
      .maybeSingle();
    path = (row?.photo_path as string | null) ?? null;
    allowed = Boolean(path) && (isStaff || row?.user_id === user.id);
  } else if (kind === "work-orders") {
    const { data: row } = await service
      .from("work_orders")
      .select("photo_path, reported_by_email")
      .eq("id", id)
      .maybeSingle();
    path = (row?.photo_path as string | null) ?? null;
    const email = user.email?.trim().toLowerCase() ?? "";
    const reported = (row?.reported_by_email as string | null)?.trim().toLowerCase() ?? "";
    const ownByEmail = Boolean(email && reported && email === reported);
    const ownByPath = Boolean(path && path.startsWith(`${user.id}/`));
    allowed = Boolean(path) && (isStaff || ownByEmail || ownByPath);
  } else if (kind === "arc") {
    const { data: row } = await service
      .from("arc_applications")
      .select("attachment_paths, owner_name, address")
      .eq("id", id)
      .maybeSingle();
    const paths = pathList(row?.attachment_paths);
    path = Number.isFinite(index) && index >= 0 ? (paths[index] ?? null) : null;
    const ownByPath = Boolean(path && path.startsWith(`${user.id}/`));
    const name = (profile?.display_name as string | null)?.trim() ?? "";
    const owner = (row?.owner_name as string | null)?.trim() ?? "";
    const ownByName = Boolean(name && owner && name.toLowerCase() === owner.toLowerCase());
    allowed = Boolean(path) && (isStaff || ownByPath || ownByName);
  } else {
    const { data: row } = await service
      .from("concern_reports")
      .select("photo_path, reporter_user_id")
      .eq("id", id)
      .maybeSingle();
    path = (row?.photo_path as string | null) ?? null;
    const ownByUser = row?.reporter_user_id === user.id;
    const ownByPath = Boolean(path && path.startsWith(`${user.id}/`));
    allowed = Boolean(path) && (isStaff || ownByUser || ownByPath);
  }

  if (!path || !allowed) {
    return NextResponse.json({ error: "That file isn't available." }, { status: 404 });
  }

  const { data: signed, error } = await service.storage
    .from(MESSAGE_FILES_BUCKET)
    .createSignedUrl(path, 120, download ? { download: attachmentName(path) } : undefined);
  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: `The file could not be opened: ${error?.message ?? "no URL"}` },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
