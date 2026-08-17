/**
 * Files in the private resident-message-files bucket.
 *
 * Messages land at `<userId>/<threadId>/<name>`. Pets, vehicles,
 * maintenance photos, ARC plans and compliance photos use the same first
 * folder (the owner's auth uid) so existing storage RLS covers them:
 * `<userId>/pets|vehicles|work-orders|arc|compliance/<name>`.
 * The only way to read a private object is a route that checks the session
 * and hands back a short-lived signed URL.
 */

export const RECORD_PHOTO_KINDS = [
  "pets", "vehicles", "work-orders", "arc", "compliance",
] as const;
export type RecordPhotoKind = (typeof RECORD_PHOTO_KINDS)[number];

/** Kinds that accept a PDF or a common document, not just a photo. */
export const RECORD_DOCUMENT_KINDS = ["arc"] as const;
export type RecordDocumentKind = (typeof RECORD_DOCUMENT_KINDS)[number];

export function isRecordDocumentKind(value: string): value is RecordDocumentKind {
  return (RECORD_DOCUMENT_KINDS as readonly string[]).includes(value);
}

export function isRecordPhotoKind(value: string): value is RecordPhotoKind {
  return (RECORD_PHOTO_KINDS as readonly string[]).includes(value);
}

export const MESSAGE_FILES_BUCKET = "resident-message-files";

/** The bucket's own ceiling; rejecting here gives a better message than a 413. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif"]);
const DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx", "dwg", "dxf", "txt", "rtf", "odt"]);

/** Word, Excel, drawings and plain text — what an ARC packet usually is. */
export function isDocumentAttachment(path: string): boolean {
  const name = attachmentName(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot > -1 && DOC_EXT.has(name.slice(dot + 1));
}

export function isAllowedArcFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("image/") || file.type === "application/pdf") return true;
  return isImageAttachment(file.name) || isDocumentAttachment(file.name);
}

/** The last segment, which is what a person calls the file. */
export function attachmentName(path: string): string {
  const last = path.slice(path.lastIndexOf("/") + 1);
  /* Uploads from this app are prefixed with a uuid to keep two photos of the
     same porch from overwriting one another. The prefix is plumbing, so it is
     not what the recipient is shown. */
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

/**
 * Whether to show it or link to it, decided from the extension.
 *
 * The stored mime type would be better, but it lives on the storage object
 * rather than the message row, and one HEAD per message to find out would
 * cost more than it settles.
 */
export function isImageAttachment(path: string): boolean {
  const name = attachmentName(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot > -1 && IMAGE_EXT.has(name.slice(dot + 1));
}

/** Where the browser fetches it. One route, both portals. */
export function attachmentUrl(messageId: string, download = false): string {
  return `/api/messages/${messageId}/attachment${download ? "?download=1" : ""}`;
}

/**
 * Signed-URL door for a pet, vehicle, work-order or compliance photo,
 * or an ARC plan. `index` picks which path on a multi-file row.
 */
export function recordPhotoUrl(kind: RecordPhotoKind, id: string, index?: number): string {
  const q = index != null ? `?i=${index}` : "";
  return `/api/resident-photos/${kind}/${id}${q}`;
}
