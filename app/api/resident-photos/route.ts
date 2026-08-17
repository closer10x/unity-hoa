import { NextResponse } from "next/server";

import {
  MAX_ATTACHMENT_BYTES,
  MESSAGE_FILES_BUCKET,
  isImageAttachment,
  isRecordPhotoKind,
} from "@/lib/supabase/message-files";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Puts a pet, vehicle or work-order photo in the same private bucket
 * messages use. The path is `{userId}/{kind}/{uuid}-{name}` — the layout
 * the iPhone already writes — so both clients read the same shelf.
 *
 * The row that points at the path is written separately. An orphan is the
 * accepted cost: a photo chosen and then abandoned sits unreferenced, which
 * is the right way round because the alternative is a pet with no file.
 */
export async function POST(req: Request) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to attach a photo." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "").trim();
  if (!isRecordPhotoKind(kind)) {
    return NextResponse.json({ error: "Which kind of photo?" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo." }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: `Photos are capped at ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.` },
      { status: 400 },
    );
  }
  if (!file.type.startsWith("image/") && !isImageAttachment(file.name)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or HEIC image." }, { status: 400 });
  }

  const safeName = file.name.replaceAll(/[^\w.\-]+/g, "_").slice(-80) || "photo.jpg";
  const path = `${user.id}/${kind}/${crypto.randomUUID()}-${safeName}`;

  const service = requireServiceSupabase();
  const { error } = await service.storage
    .from(MESSAGE_FILES_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, path, name: file.name, size: file.size });
}
