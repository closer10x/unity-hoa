import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Proof of payment against an invoice — a photographed check, a wire receipt,
 * a closing statement. The bucket is private: a scanned check carries a
 * routing and account number along the bottom, so these are read back through
 * short-lived signed URLs and never a public link.
 */

const BUCKET = "invoice-attachments";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const invoiceId = String(form.get("invoiceId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  }
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: "That invoice could not be identified." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Attach an image or a PDF — JPEG, PNG, WebP or PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 10 MB." }, { status: 400 });
  }

  const service = requireServiceSupabase();

  const { data: inv } = await service
    .from("invoices")
    .select("invoice_number")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) {
    return NextResponse.json({ error: "That invoice no longer exists." }, { status: 404 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${invoiceId}/${Date.now()}.${ext}`;

  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: `The upload failed: ${upErr.message}` }, { status: 502 });
  }

  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";

  const { data: row, error: rowErr } = await service
    .from("invoice_attachments")
    .insert({
      invoice_id: invoiceId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
      byte_size: file.size,
      uploaded_by_name: actorName,
    })
    .select("id")
    .single();
  if (rowErr) {
    // Don't leave the file behind a row that failed to save.
    await service.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: `Could not record it: ${rowErr.message}` }, { status: 502 });
  }

  await service.from("admin_audit_log").insert({
    action: `Invoices: attached ${file.name} to ${inv.invoice_number}`,
    actor_name: actorName,
    actor_user_id: UUID_RE.test(session.user.id) ? session.user.id : null,
  });

  return NextResponse.json({ ok: true, id: row.id, fileName: file.name });
}
