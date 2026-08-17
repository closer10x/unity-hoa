import { MAX_ATTACHMENT_BYTES } from "@/lib/supabase/message-files";

/**
 * Puts a chosen file in the bucket and returns its stored path, which the
 * send action then writes onto the message.
 *
 * Client-side, shared by both portals so the office and the household upload
 * the same way — and so a size limit is not enforced in one composer and
 * forgotten in the other.
 */
export async function uploadMessageAttachment(
  file: File,
  /** Absent when the message is starting a new conversation. */
  threadId?: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `“${file.name}” is over the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB limit.`,
    };
  }

  const form = new FormData();
  form.append("file", file);
  if (threadId) form.append("threadId", threadId);

  try {
    const res = await fetch("/api/messages/attachment", { method: "POST", body: form });
    const data = (await res.json()) as { path?: string; error?: string };
    if (!res.ok || !data.path) {
      return { ok: false, error: data.error ?? "The file could not be uploaded." };
    }
    return { ok: true, path: data.path };
  } catch {
    return { ok: false, error: "The file could not be uploaded. Check your connection." };
  }
}

/**
 * A photo on a pet, a car, a maintenance request or a concern, or a plan
 * on an architectural application. Same bucket and size ceiling as a
 * message attachment; a different folder so the phone and the website
 * agree on where each kind of file lives.
 */
export async function uploadResidentPhoto(
  file: File,
  kind: "pets" | "vehicles" | "work-orders" | "arc" | "compliance",
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `“${file.name}” is over the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB limit.`,
    };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);

  try {
    const res = await fetch("/api/resident-photos", { method: "POST", body: form });
    const data = (await res.json()) as { path?: string; error?: string };
    if (!res.ok || !data.path) {
      return { ok: false, error: data.error ?? "The file could not be uploaded." };
    }
    return { ok: true, path: data.path };
  } catch {
    return { ok: false, error: "The file could not be uploaded. Check your connection." };
  }
}

/** Kilobytes or megabytes, for a chip that has to say how big a file is. */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
