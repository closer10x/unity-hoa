/**
 * Files attached to resident conversations.
 *
 * The bucket is private, so the only way in is a route that checks the
 * session first and hands back a short-lived signed URL. Paths are
 * `<userId>/<threadId>/<name>` — the convention the iOS app already writes,
 * kept so the two clients read each other's attachments rather than each
 * inventing a layout.
 */

export const MESSAGE_FILES_BUCKET = "resident-message-files";

/** The bucket's own ceiling; rejecting here gives a better message than a 413. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif"]);

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
