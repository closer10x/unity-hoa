import { NextResponse } from "next/server";

import {
  MAX_ATTACHMENT_BYTES,
  MESSAGE_FILES_BUCKET,
} from "@/lib/supabase/message-files";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Puts a file in the bucket and hands back its path. The message is written
 * separately, by the send action, with that path on it.
 *
 * Two steps rather than one so the upload can finish — and fail — while the
 * composer is still open: a 12MB photo that dies half way should leave the
 * typed message where it is, not swallow it with the request.
 *
 * An orphan is the accepted cost. A file uploaded for a message that is never
 * sent sits unreferenced in the bucket; that is a cleanup job, and it is the
 * right way round, because the alternative is a message row pointing at a file
 * that was never stored.
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
    return NextResponse.json({ error: "Sign in to attach a file." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  /* Optional: a resident attaching a photo to the message that *starts* a
     conversation has no thread to name yet. Those land in the sender's own
     pending folder, and the message that carries the path is what makes them
     readable — the reader's permission is checked against the thread the
     message belongs to, never against where the bytes happen to sit. */
  const threadId = String(form.get("threadId") ?? "").trim();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: `Attachments are capped at ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.` },
      { status: 400 },
    );
  }

  const service = requireServiceSupabase();
  const [{ data: thread }, { data: profile }] = await Promise.all([
    threadId
      ? service.from("resident_threads").select("id, user_id").eq("id", threadId).maybeSingle()
      : Promise.resolve({ data: null }),
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  // The same scope rule as reading: staff any conversation, a resident only
  // their own. Staff have no pending folder — they always answer into a
  // thread that already exists.
  const isStaff = profile?.role === "admin";
  if (threadId && (!thread || (!isStaff && thread.user_id !== user.id))) {
    return NextResponse.json({ error: "That conversation isn't available." }, { status: 404 });
  }
  if (!threadId && isStaff) {
    return NextResponse.json({ error: "Which conversation?" }, { status: 400 });
  }

  /* `<userId>/<threadId>/<name>`, the layout the iOS app already writes, so
     both clients read the same shelf. The uuid keeps two photos of the same
     porch, both called IMG_0001.jpeg, from overwriting each other. */
  const safeName = file.name.replaceAll(/[^\w.\-]+/g, "_").slice(-80) || "attachment";
  const path = `${user.id}/${threadId || "pending"}/${crypto.randomUUID()}-${safeName}`;

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
