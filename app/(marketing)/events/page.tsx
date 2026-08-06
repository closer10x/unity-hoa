import type { Metadata } from "next";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";

export const metadata: Metadata = { title: "Events & notices" };


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
        </div>
      </section>

      <section className={`border-t border-outline-variant ${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-8 text-[22px] font-semibold tracking-[-0.015em]">
            Recent notices
          </h2>
          <div className="rounded-[14px] border border-outline-variant bg-surface-container-lowest px-6 py-10 md:px-10">
            <p className="mb-2.5 font-label text-xs uppercase tracking-[0.12em] text-outline">
              No notices posted
            </p>
            <p className="max-w-[62ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
              Service notices — road work, water shutoffs, amenity maintenance
              — are posted here and emailed to registered residents as they are
              issued by the office.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
