"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createAnnouncement,
  updateAnnouncement,
} from "@/app/admin/(dashboard)/announcements/actions";
import type { AnnouncementRow, AnnouncementStatus } from "@/lib/types/community";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/lib/types/community";

const STATUSES = Object.keys(ANNOUNCEMENT_STATUS_LABELS) as AnnouncementStatus[];

type Props =
  | { mode: "create" }
  | { mode: "edit"; initial: AnnouncementRow };

export function AnnouncementForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initial = props.mode === "edit" ? props.initial : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const r =
      props.mode === "create"
        ? await createAnnouncement(fd)
        : await updateAnnouncement(fd);
    setSubmitting(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    router.push("/admin/announcements");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      {props.mode === "edit" ? (
        <input type="hidden" name="id" value={props.initial.id} />
      ) : null}
      <div className="space-y-1">
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">Title</label>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">Body</label>
        <textarea
          name="body"
          rows={5}
          defaultValue={initial?.body ?? ""}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">
          Image URL (optional)
        </label>
        <input
          name="image_url"
          type="url"
          defaultValue={initial?.image_url ?? ""}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          placeholder="https://…"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">Status</label>
        <select
          name="status"
          defaultValue={initial?.status ?? "draft"}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ANNOUNCEMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {props.mode === "create" ? (
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" name="publish_now" />
          Publish immediately (sets status to published)
        </label>
      ) : null}
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-secondary text-on-secondary disabled:opacity-50"
        >
          {submitting ? "Saving…" : props.mode === "create" ? "Create" : "Save"}
        </button>
      </div>
    </form>
  );
}
