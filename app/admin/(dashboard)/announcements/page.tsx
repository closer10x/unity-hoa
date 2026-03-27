import type { Metadata } from "next";
import Link from "next/link";

import { deleteAnnouncement, listAnnouncements } from "@/app/admin/(dashboard)/announcements/actions";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/lib/types/community";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Announcements",
};

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const res = await listAnnouncements();
  const items = "error" in res ? [] : res.items;
  const err = "error" in res ? res.error : null;

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Announcements</h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Draft, publish, and archive community broadcasts. Published items surface on the admin
            dashboard.
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold shadow-md"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New announcement
        </Link>
      </div>

      {err ? (
        <p className="text-error text-sm" role="alert">
          {err}
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-on-surface-variant py-8 border border-dashed border-outline-variant/30 rounded-xl text-center">
            No announcements yet.{" "}
            <Link href="/admin/announcements/new" className="text-secondary font-semibold">
              Create one
            </Link>
            .
          </li>
        ) : (
          items.map((a) => (
            <li
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/10"
            >
              <div className="min-w-0">
                <p className="font-bold text-on-surface truncate">{a.title}</p>
                <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                  {a.body ?? "—"}
                </p>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant mt-2">
                  {ANNOUNCEMENT_STATUS_LABELS[a.status]}
                  {a.published_at
                    ? ` · ${new Date(a.published_at).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link
                  href={`/admin/announcements/${a.id}/edit`}
                  className="text-sm font-semibold text-secondary"
                >
                  Edit
                </Link>
                <form action={deleteAnnouncement.bind(null, a.id)}>
                  <button type="submit" className="text-sm font-semibold text-error hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
