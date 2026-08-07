import type { Metadata } from "next";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";
import {
  formatEventTime,
  formatShortDate,
  getPublishedAnnouncements,
  getUpcomingEvents,
} from "@/lib/community/public-content";

export const metadata: Metadata = { title: "Events & notices" };

/* Events and notices come from the database; re-render at most every
   5 minutes so new posts appear without a redeploy. */
export const revalidate = 300;

function eventDetail(e: {
  starts_at: string;
  location: string | null;
  description: string | null;
}): string | null {
  const parts: string[] = [];
  const time = formatEventTime(e.starts_at);
  if (time) parts.push(time);
  if (e.location?.trim()) parts.push(e.location.trim());
  if (e.description?.trim()) parts.push(e.description.trim());
  if (parts.length === 0) return null;
  return parts.join(" — ");
}

export default async function EventsPage() {
  const [events, notices] = await Promise.all([
    getUpcomingEvents(6),
    getPublishedAnnouncements(3),
  ]);

  return (
    <main>
      <PageIntro
        eyebrow="Events & notices"
        title="What's happening in the neighborhood."
        lead="Meetings, closures, socials and service notices — posted here first and emailed to registered residents."
      />

      <section className={`${SECTION_PAD} pb-12 md:pb-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-6 text-[22px] font-semibold tracking-[-0.015em]">
            Upcoming
          </h2>
          {events.length > 0 ? (
            <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2 bg-surface-container-lowest px-6 py-[22px]"
                >
                  <span className="font-label text-xs text-secondary-muted">
                    {formatShortDate(e.starts_at)}
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold">{e.title}</span>
                    {eventDetail(e) ? (
                      <span className="block text-sm text-on-surface-variant">
                        {eventDetail(e)}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-outline-variant bg-surface-container-lowest px-6 py-10 md:px-10">
              <p className="mb-2.5 font-label text-xs uppercase tracking-[0.12em] text-outline">
                Nothing scheduled yet
              </p>
              <p className="max-w-[62ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
                Board meetings, socials and seasonal closures appear here as the
                board and the office schedule them. Registered residents receive
                an email reminder before each one.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={`border-t border-outline-variant ${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-8 text-[22px] font-semibold tracking-[-0.015em]">
            Recent notices
          </h2>
          {notices.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-10">
              {notices.map((n) => (
                <div key={n.id}>
                  <p className="mb-2.5 font-label text-xs text-outline">
                    {formatShortDate(n.published_at) ?? "Notice"}
                  </p>
                  <p className="mb-1.5 text-[17px] leading-snug font-semibold">
                    {n.title}
                  </p>
                  {n.body ? (
                    <p className="text-[15px] leading-relaxed text-on-surface-variant">
                      {n.body}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-outline-variant bg-surface-container-lowest px-6 py-10 md:px-10">
              <p className="mb-2.5 font-label text-xs uppercase tracking-[0.12em] text-outline">
                No notices posted
              </p>
              <p className="max-w-[62ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
                Service notices — road work, water shutoffs, amenity maintenance
                — are posted here and emailed to registered residents as they
                are issued by the office.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
