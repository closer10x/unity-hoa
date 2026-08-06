import type { Metadata } from "next";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";

export const metadata: Metadata = { title: "Events & notices" };

const EVENTS = [
  {
    date: "Sep 9",
    title: "Monthly board meeting",
    detail: "6:30 PM, Clubhouse Annex — open forum at the start.",
    action: "Agenda",
  },
  {
    date: "Sep 20",
    title: "Fall community social",
    detail: "5:00 PM at the Great Hall. Bring a dish; the office brings the rest.",
    action: "RSVP",
  },
  {
    date: "Oct 4",
    title: "Pool closes for the season",
    detail: "Gate tags stop working at 8:00 PM. Furniture is stored the same week.",
    action: "Details",
  },
] as const;

const NOTICES = [
  {
    photo: "photo — lake path landscaping",
    meta: "Mar 24 · Community",
    title: "Spring landscaping begins along the lake path",
    body: "Drought-resistant native plantings replace seasonal beds at the north entry.",
  },
  {
    photo: "photo — great hall interior",
    meta: "Mar 18 · Events",
    title: "Resident gala and annual homeowner meeting",
    body: "Dinner at the Great Hall, followed by the 2024 budget presentation.",
  },
  {
    photo: "photo — north gate entry",
    meta: "Mar 12 · Safety",
    title: "Touchless entry arrives at the north gate",
    body: "Existing remotes keep working through the transition period.",
  },
] as const;

export default function EventsPage() {
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
          <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
            {EVENTS.map((e) => (
              <div
                key={e.title}
                className="flex flex-wrap items-baseline gap-x-5 gap-y-2 bg-surface-container-lowest px-6 py-[22px]"
              >
                <span className="flex-none font-label text-xs text-secondary-muted">
                  {e.date}
                </span>
                <span className="min-w-0 flex-[1_1_220px]">
                  <span className="font-semibold">{e.title}</span>
                  <span className="block text-sm text-on-surface-variant">
                    {e.detail}
                  </span>
                </span>
                <span className="flex-none text-[15px] text-secondary">
                  {e.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`border-t border-outline-variant ${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-8 text-[22px] font-semibold tracking-[-0.015em]">
            Recent notices
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-10">
            {NOTICES.map((n) => (
              <div key={n.title}>
                <PhotoPlaceholder
                  label={n.photo}
                  ratio="16 / 9"
                  className="mb-4"
                />
                <p className="mb-2.5 font-label text-xs text-outline">
                  {n.meta}
                </p>
                <p className="mb-1.5 text-[17px] leading-snug font-semibold">
                  {n.title}
                </p>
                <p className="text-[15px] leading-relaxed text-on-surface-variant">
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
