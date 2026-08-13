import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/site/PageHero";
import {
  formatEventTime,
  formatShortDate,
  getPublishedAnnouncements,
  getUpcomingEvents,
} from "@/lib/community/public-content";

export const metadata: Metadata = { title: "Events" };

/* Events and notices are read live; revalidate on a timer so new ones appear
   without a redeploy. */
export const revalidate = 300;

export default async function EventsPage() {
  const [events, notices] = await Promise.all([
    getUpcomingEvents(8),
    getPublishedAnnouncements(3),
  ]);
  const [next, ...rest] = events;

  return (
    <main>
      <PageHero
        eyebrow="Events"
        title="Meetings, deadlines and neighborhood dates."
        intro="Board meetings are open to every owner. Agendas post before each session and minutes go up after. Dues deadlines are listed here too, so nothing arrives as a surprise."
      />

      {/* Next up — the soonest event */}
      {next ? (
        <section className="mx-auto mt-[60px] max-w-[1320px] px-6 md:px-11">
          <div className="grid items-center gap-8 rounded-2xl bg-ink px-6 py-9 text-white md:grid-cols-[200px_1fr_auto] md:gap-12 md:px-12 md:py-11">
            <div>
              <div className="mb-2.5 text-[13px] font-bold tracking-[0.08em] text-white/55 uppercase">Next up</div>
              <div className="font-display text-[48px] leading-[0.9] font-semibold tracking-[-0.04em] md:text-[56px]">
                {formatShortDate(next.starts_at) ?? "TBA"}
              </div>
              <div className="mt-2 text-[15px] text-white/70">{formatEventTime(next.starts_at) ?? ""}</div>
            </div>
            <div>
              <div className="mb-2.5 font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">{next.title}</div>
              {next.description ? (
                <p className="max-w-[56ch] text-base leading-[1.6] text-white/70">{next.description}</p>
              ) : null}
              {next.location ? <p className="mt-2 text-[15px] text-white/55">{next.location}</p> : null}
            </div>
            <div className="grid gap-2.5">
              <Link href="/portal/login" className="rounded-lg bg-white px-[22px] py-[13px] text-center text-[15px] font-semibold whitespace-nowrap text-ink transition-colors hover:bg-cream">
                Meeting details
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Coming up */}
      <section className="mx-auto mt-[60px] max-w-[1320px] px-6 md:px-11">
        <div className="mb-1 flex items-baseline justify-between border-b border-ink pb-3.5">
          <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">Coming up</h2>
          <span className="text-[13px] font-semibold tracking-[0.06em] text-faint uppercase">Association calendar</span>
        </div>

        {rest.length ? (
          rest.map((e) => (
            <div key={e.id} className="grid grid-cols-[100px_1fr] items-center gap-4 border-b border-line py-6 md:grid-cols-[130px_140px_1fr_auto] md:gap-7">
              <span className="font-display text-[20px] font-semibold tracking-[-0.02em] md:text-[22px]">{formatShortDate(e.starts_at) ?? "TBA"}</span>
              <span className="justify-self-start rounded-full bg-tint px-3 py-1.5 text-xs font-bold tracking-[0.06em] text-moss uppercase">{e.category}</span>
              <span className="col-span-2 text-base leading-[1.55] text-body md:col-span-1">
                <strong className="text-ink">{e.title}</strong>
                {e.location ? <span className="text-muted"> — {e.location}</span> : null}
              </span>
              <Link href="/portal/login" className="hidden text-[15px] font-semibold whitespace-nowrap text-moss hover:text-ink md:block">Details →</Link>
            </div>
          ))
        ) : next ? null : (
          <p className="py-10 text-[17px] leading-[1.6] text-muted">
            No upcoming events are posted right now. Meeting dates and dues deadlines appear here as
            the office schedules them — registered residents also get them by email.
          </p>
        )}
      </section>

      {/* Recent notices */}
      {notices.length ? (
        <section className="mx-auto mt-[70px] max-w-[1320px] px-6 md:px-11">
          <div className="mb-6 flex items-baseline justify-between gap-8">
            <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">Recent notices</h2>
            <Link href="/" className="text-[15px] font-semibold whitespace-nowrap text-moss hover:text-ink">Community news →</Link>
          </div>
          <div className="grid gap-3.5 md:grid-cols-3">
            {notices.map((n) => (
              <article key={n.id} className="rounded-[14px] border border-line bg-white px-7 py-7">
                <div className="mb-2.5 text-[13px] font-bold tracking-[0.06em] text-moss uppercase">{formatShortDate(n.published_at) ?? "Notice"}</div>
                <h3 className="mb-2 font-display text-[19px] leading-[1.25] font-semibold tracking-[-0.02em] text-balance">{n.title}</h3>
                {n.body ? <p className="text-[15px] leading-[1.6] text-muted line-clamp-3">{n.body.split(/\n{2,}/)[0]}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-20 max-w-[1320px] px-6 md:px-11">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-tint px-6 py-9 md:px-12 md:py-10">
          <div>
            <div className="mb-2 font-display text-2xl font-semibold tracking-[-0.02em]">Want an event on this calendar?</div>
            <div className="max-w-[62ch] text-base leading-[1.6] text-body">
              The Social Committee reviews resident-hosted gatherings that use common areas. Send the
              date and details to the management office.
            </div>
          </div>
          <Link href="/contact" className="rounded-lg bg-ink px-[26px] py-[15px] text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-moss">
            Propose an event
          </Link>
        </div>
      </section>
    </main>
  );
}
