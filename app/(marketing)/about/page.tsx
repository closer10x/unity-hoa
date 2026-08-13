import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/site/PageHero";
import { loadBoard } from "@/lib/site/board";

const PRINCIPLES = [
  { title: "One office", body: "Dues, repairs, rules and records in one place" },
  { title: "In writing", body: "Answers documented, not left on a voicemail" },
  { title: "Applied evenly", body: "The same standard for every lot, every time" },
];

const SEATS = ["President", "Vice president", "Treasurer", "Secretary"];

const COMMITTEES = [
  { title: "Architectural Committee", body: "Reviews exterior change applications" },
  { title: "Social Committee", body: "Plans neighborhood events through the year" },
];

export const metadata: Metadata = { title: "About" };

/* Board seats are read from the directors the office seats, so the page
   re-renders on a timer when a seat changes. */
export const revalidate = 300;

export default async function AboutPage() {
  const board = await loadBoard();
  const holderFor = (seat: string) =>
    board.find((m) => m.role.trim().toLowerCase() === seat.toLowerCase()) ?? null;

  return (
    <main>
      <PageHero
        eyebrow="About"
        title="A management office that neighbors can actually reach."
        intro="Unity Grid Management handles the day-to-day of homeowners associations across greater Houston. We handle the money, the vendors and the paperwork; residents get straight answers, and the volunteer board gets its evenings back."
      />

      <section className="mx-auto mt-16 grid max-w-[1320px] items-center gap-10 px-6 md:grid-cols-[1fr_1.05fr] md:gap-[72px] md:px-11">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image src="/images/about-mission-community-art.png" alt="The community Unity Grid manages" fill sizes="(max-width:768px) 100vw, 620px" className="object-cover" />
        </div>
        <div>
          <h2 className="mb-5 font-display text-[34px] font-semibold tracking-[-0.03em] text-balance md:text-[40px]">
            How we work
          </h2>
          <div className="grid gap-[22px] text-[17px] leading-[1.62] text-body">
            <p>
              Most association problems are not complicated — they are unanswered. A request goes
              to an inbox nobody owns, a rule lives in a PDF nobody can find, an invoice sits until
              someone remembers it. We put one office behind all of it.
            </p>
            <p>
              Every request gets logged, assigned and closed with a written answer. Every document
              is public to owners. Every dollar shows up on a statement the board can read without
              a finance background.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="bg-white px-[22px] py-6">
                <div className="mb-1.5 font-display text-[17px] font-semibold tracking-[-0.02em]">{p.title}</div>
                <div className="text-sm leading-[1.55] text-muted">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-[100px] bg-ink py-[84px] text-white">
        <div className="mx-auto max-w-[1320px] px-6 md:px-11">
          <h2 className="mb-3 font-display text-[36px] font-semibold tracking-[-0.03em] md:text-[44px]">Board &amp; committees</h2>
          <p className="mb-10 max-w-[62ch] text-[17px] leading-[1.6] text-white/70">
            The board is your neighbors — owners elected by owners. Committee seats open through the
            year and no experience is required.
          </p>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {SEATS.map((seat) => {
              const holder = holderFor(seat);
              return (
                <div key={seat} className="rounded-xl border border-white/15 bg-white/[0.07] px-6 py-[26px]">
                  <div className="mb-3.5 text-xs font-bold tracking-[0.08em] text-sage uppercase">{seat}</div>
                  <div className="font-display text-xl font-semibold tracking-[-0.02em]">{holder ? holder.name : "Open seat"}</div>
                  <div className="mt-1.5 text-sm leading-[1.55] text-white/60">
                    {holder ? "Serving on the current board" : "Elected at the annual meeting"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
            {COMMITTEES.map((c) => (
              <div key={c.title} className="flex items-center justify-between gap-5 rounded-xl border border-white/15 bg-white/[0.07] px-6 py-[26px]">
                <div>
                  <div className="mb-1 font-display text-xl font-semibold tracking-[-0.02em]">{c.title}</div>
                  <div className="text-[15px] text-white/60">{c.body}</div>
                </div>
                <Link href="/contact" className="text-[15px] font-semibold whitespace-nowrap text-cream hover:text-white">Volunteer →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-[90px] max-w-[1320px] px-6 md:px-11">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-tint px-6 py-9 md:px-12 md:py-11">
          <div>
            <div className="mb-2 font-display text-[24px] font-semibold tracking-[-0.03em] md:text-[28px]">
              Bring a suggestion, a question, or a complaint.
            </div>
            <div className="max-w-[62ch] text-base leading-[1.6] text-body">
              All three are useful. Every owner is welcome at the monthly meeting.
            </div>
          </div>
          <Link href="/events" className="rounded-lg bg-ink px-[26px] py-[15px] text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-moss">
            See meeting dates
          </Link>
        </div>
      </section>
    </main>
  );
}
