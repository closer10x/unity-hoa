import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { deleteCommunityEvent, listAllEventsForAdmin } from "@/app/admin/(dashboard)/events/actions";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { EVENT_CATEGORY_LABELS } from "@/lib/types/community";
import type { CommunityEventRow } from "@/lib/types/community";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Events",
};

export const dynamic = "force-dynamic";

const FEATURED_FALLBACK =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCd9RaQrjNP_3ZM3zlg5M4u7dDoc7e9S1FTIu92IQChkhPC9oURg5107_K5W8aX38ebMENEr11tzQYGRBrjw3UEFIrPmSw2Qd02raNNeGfU4C88fH74VTHIIIzX2jzW5ISxE1aEZarK5RsHJ-Y5a0d-gxxrMhVhCVNWonqZL3_xzuXhPOuhqVL7H1Hyeh7eT5zkwlnOYZBPHRLcr3aHiN5im8SnZ-JeQbEBSqjgJHqOE1YVIZXmWgcc7SabuNS--I935QJ8ENAfjQk0";

function formatBlock(iso: string) {
  const d = new Date(iso);
  return {
    mon: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    day: d.getUTCDate(),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }),
  };
}

export default async function AdminEventsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const res = await listAllEventsForAdmin();
  const items = "error" in res ? [] : res.items;
  const err = "error" in res ? res.error : null;

  const now = Date.now();
  const upcoming = items.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = items.filter((e) => new Date(e.starts_at).getTime() < now);
  const featured: CommunityEventRow | undefined =
    [...upcoming].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )[0] ?? past[0];

  const rsvpTotal = items.reduce((s, e) => s + (e.rsvp_count ?? 0), 0);

  return (
    <div className="p-8 pb-32">
      {err ? (
        <p className="text-error text-sm mb-6" role="alert">
          {err}
        </p>
      ) : null}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3 block">
              Community Calendar
            </span>
            <h1 className="text-5xl font-extrabold text-primary font-headline leading-tight tracking-tight mb-4">
              Unity Grid <br /> <span className="text-on-surface-variant">Social Hub</span>
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Manage neighborhood gatherings, board meetings, and seasonal activities. Residents see
              published events on the public calendar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/events/new"
              className="bg-gradient-to-br from-secondary to-secondary-fixed-dim text-white px-8 py-4 rounded-md shadow-xl shadow-secondary/20 flex items-center gap-3 font-bold text-sm tracking-wide"
            >
              <span className="material-symbols-outlined">calendar_add_on</span>
              Post new event
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="glass-panel p-8 rounded-2xl border border-white/40 shadow-sm">
            <h3 className="font-headline font-bold text-xl mb-2">At a glance</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {items.length} event{items.length === 1 ? "" : "s"} in the admin list
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-headline">{rsvpTotal}</p>
                  <p className="text-xs text-on-surface-variant">Total RSVP count</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined">celebration</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-headline">{upcoming.length}</p>
                  <p className="text-xs text-on-surface-variant">Upcoming</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {featured ? (
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row h-auto md:h-80 group border border-outline-variant/10">
              <div className="md:w-2/5 relative overflow-hidden min-h-[200px] md:min-h-0 bg-surface-container-high">
                {featured.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={featured.image_url}
                  />
                ) : (
                  <Image
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={FEATURED_FALLBACK}
                    width={600}
                    height={400}
                  />
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-center">
                  <p className="text-xs font-bold uppercase tracking-tighter text-secondary">
                    {formatBlock(featured.starts_at).mon}
                  </p>
                  <p className="text-xl font-bold text-primary">{formatBlock(featured.starts_at).day}</p>
                </div>
              </div>
              <div className="md:w-3/5 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-wider">
                      {EVENT_CATEGORY_LABELS[featured.category]}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/events/${featured.id}/edit`}
                        className="text-xs font-bold text-secondary hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteCommunityEvent.bind(null, featured.id)}>
                        <button
                          type="submit"
                          className="text-xs font-bold text-error hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  {!featured.published ? (
                    <p className="text-[10px] font-bold uppercase text-error mb-2">Draft / hidden</p>
                  ) : null}
                  <h2 className="text-2xl font-bold font-headline mb-3 text-primary">{featured.title}</h2>
                  <p className="text-on-surface-variant text-sm line-clamp-3 mb-4 leading-relaxed">
                    {featured.description ?? "No description"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold flex-wrap gap-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {formatBlock(featured.starts_at).time} UTC
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {featured.location ?? "TBD"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/30 p-12 text-center text-on-surface-variant">
              <p className="mb-4">No events yet.</p>
              <Link href="/admin/events/new" className="text-secondary font-bold text-sm">
                Post the first event
              </Link>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              All events
            </h3>
            {items.length === 0 ? null : (
              <div className="space-y-4">
                {items.map((ev) => {
                  const b = formatBlock(ev.starts_at);
                  return (
                    <div
                      key={ev.id}
                      className="flex gap-6 p-6 rounded-2xl bg-surface-container-low border border-outline-variant/10"
                    >
                      <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white border border-outline-variant/20 shadow-sm shrink-0">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                          {b.mon}
                        </p>
                        <p className="text-lg font-bold text-primary">{b.day}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-primary font-headline">{ev.title}</h3>
                          <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                            {EVENT_CATEGORY_LABELS[ev.category]}
                          </span>
                        </div>
                        {!ev.published ? (
                          <p className="text-[10px] font-bold text-error uppercase mb-2">Unpublished</p>
                        ) : null}
                        <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">
                          {ev.description ?? ""}
                        </p>
                        <div className="flex flex-wrap gap-4 text-[11px] font-medium text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>{" "}
                            {b.time} UTC
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>{" "}
                            {ev.location ?? "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>{" "}
                            {ev.rsvp_count} RSVPs
                          </span>
                        </div>
                        <div className="mt-4 flex gap-4">
                          <Link
                            href={`/admin/events/${ev.id}/edit`}
                            className="text-xs font-bold text-secondary"
                          >
                            Edit
                          </Link>
                          <form action={deleteCommunityEvent.bind(null, ev.id)}>
                            <button
                              type="submit"
                              className="text-xs font-bold text-error hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
