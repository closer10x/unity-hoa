"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createCommunityEvent,
  updateCommunityEvent,
} from "@/app/admin/(dashboard)/events/actions";
import type { CommunityEventRow, EventCategory } from "@/lib/types/community";
import { EVENT_CATEGORY_LABELS } from "@/lib/types/community";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props =
  | { mode: "create" }
  | { mode: "edit"; initial: CommunityEventRow };

export function EventForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initial = props.mode === "edit" ? props.initial : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const s = String(fd.get("starts_at") ?? "").trim();
    const en = String(fd.get("ends_at") ?? "").trim();
    if (s) fd.set("starts_at", new Date(s).toISOString());
    if (en) fd.set("ends_at", new Date(en).toISOString());
    else fd.delete("ends_at");

    const r =
      props.mode === "create"
        ? await createCommunityEvent(fd)
        : await updateCommunityEvent(fd);

    setSubmitting(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    if (props.mode === "create" && "id" in r) {
      router.push("/admin/events");
      router.refresh();
      return;
    }
    router.refresh();
    router.push("/admin/events");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      {props.mode === "edit" ? <input type="hidden" name="id" value={props.initial.id} /> : null}
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
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">
          Description
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ""}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Starts
          </label>
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue(initial?.starts_at)}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Ends (optional)
          </label>
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(initial?.ends_at ?? null)}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase font-bold text-on-surface-variant">Location</label>
        <input
          name="location"
          defaultValue={initial?.location ?? ""}
          className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Category
          </label>
          <select
            name="category"
            defaultValue={initial?.category ?? "social"}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EVENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            RSVP count
          </label>
          <input
            name="rsvp_count"
            type="number"
            min={0}
            defaultValue={initial?.rsvp_count ?? 0}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          />
        </div>
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
      <label className="flex items-center gap-2 text-sm text-on-surface">
        <input
          type="checkbox"
          name="published"
          value="on"
          defaultChecked={initial?.published !== false}
        />
        Published (visible on community calendar views)
      </label>
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
          {submitting ? "Saving…" : props.mode === "create" ? "Create event" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
