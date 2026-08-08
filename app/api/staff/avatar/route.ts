import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { canManageStaff } from "@/lib/admin-portal/permissions";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Staff profile photos. The bucket is private, so the file is read back
 * through a signed URL rather than a public link — a photo of an employee is
 * not something to leave open on the internet.
 */

const BUCKET = "profile-avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const profileId = String(form.get("profileId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim() || "the account";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a photo." }, { status: 400 });
  }
  if (!UUID_RE.test(profileId)) {
    return NextResponse.json(
      { error: "This person has no sign-in account yet, so there is nowhere to keep a photo. Send them an invite first." },
      { status: 400 },
    );
  }
  // Anyone may change their own photo; changing someone else's is a staff
  // management action.
  if (profileId !== session.user.id && !canManageStaff(session.profile.staff_role)) {
    return NextResponse.json({ error: "Only an Administrator can change someone else's photo." }, { status: 403 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is over 5 MB — use a smaller one." }, { status: 400 });
  }

  const service = requireServiceSupabase();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profileId}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: `The upload failed: ${upErr.message}` }, { status: 502 });
  }

  const { data: before } = await service
    .from("profiles")
    .select("avatar_path")
    .eq("id", profileId)
    .maybeSingle();

  const { error: profErr } = await service
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", profileId);
  if (profErr) {
    await service.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: `Could not save the photo: ${profErr.message}` }, { status: 502 });
  }

  // The replaced file is no longer referenced by anything.
  const previous = before?.avatar_path as string | null;
  if (previous && previous !== path) {
    await service.storage.from(BUCKET).remove([previous]);
  }

  await service.from("admin_audit_log").insert({
    action: `Team: updated the profile photo for ${name}`,
    actor_name: session.profile.display_name?.trim() || session.user.email || "Staff",
    actor_user_id: UUID_RE.test(session.user.id) ? session.user.id : null,
  });

  const { data: signed } = await service.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 8);

  return NextResponse.json({ ok: true, photoUrl: signed?.signedUrl ?? null });
}
