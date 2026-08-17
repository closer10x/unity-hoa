import { NextResponse } from "next/server";

import { MESSAGE_FILES_BUCKET } from "@/lib/supabase/message-files";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Opens a file attached to a resident conversation.
 *
 * The bucket is private, so this route is the only door: it checks the
 * session, proves the caller is allowed to read *this* conversation, and
 * redirects to a signed URL that expires in two minutes.
 *
 * The scope rule is the portal's: staff read every conversation, a resident
 * reads only their own. It is enforced against the thread's owner rather than
 * the file's path — a path is a string a caller can guess at, and the row is
 * the record of who the conversation belongs to.
 *
 * `?download=1` saves instead of opening, for the files a browser would
 * otherwise render as a wall of bytes.
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
    return NextResponse.json({ error: "Sign in to open attachments." }, { status: 401 });
  }

  const service = requireServiceSupabase();
  const [{ data: message }, { data: profile }] = await Promise.all([
    service
      .from("resident_messages")
      .select("id, attachment_path, thread_id, resident_threads(user_id)")
      .eq("id", id)
      .maybeSingle(),
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  /* One answer for "no such message" and "not yours": otherwise the pair of
     them tells a stranger which message ids are real. */
  const owner = (message?.resident_threads as { user_id?: string } | null)?.user_id;
  const isStaff = profile?.role === "admin";
  if (!message?.attachment_path || (!isStaff && owner !== user.id)) {
    return NextResponse.json({ error: "That attachment isn't available." }, { status: 404 });
  }

  const path = message.attachment_path as string;
  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";
  const fileName = path.slice(path.lastIndexOf("/") + 1);

  const { data: signed, error } = await service.storage
    .from(MESSAGE_FILES_BUCKET)
    .createSignedUrl(path, 120, wantsDownload ? { download: fileName } : undefined);
  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: `The file could not be opened: ${error?.message ?? "no URL"}` },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
