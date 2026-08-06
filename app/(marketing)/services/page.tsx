import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";

export const metadata: Metadata = { title: "Services" };

const SERVICES = [
  {
    num: "01",
    title: "Dues & finances",
    blurb:
      "Billing, collections and a reserve budget the board can read in one sitting.",
    items: [
      "HOA fee billing and collections",
      "Monthly financials and reserve tracking",
      "Budget preparation and year-end audit support",
      "Payables, receivables and vendor payments",
    ],
  },
  {
    num: "02",
    title: "Grounds & upkeep",
    blurb:
      "Landscaping, pool service, gates and lighting — scheduled, inspected and tracked.",
    items: [
      "Vendor sourcing and contract management",
      "Scheduled inspections with written reports",
      "Work orders through to close-out",
      "24-hour emergency response",
    ],
  },
  {
    num: "03",
    title: "Rules & review",
    blurb:
      "Architectural applications, violation notices and covenant enforcement, applied evenly.",
    items: [
      "Architectural review inside the 30-day window",
      "Violation notices with a route to appeal",
      "Inspection routes and photo records",
      "Hearing coordination and follow-up",
    ],
  },
  {
    num: "04",
    title: "Meetings & records",
    blurb:
      "Agendas, minutes and the document library, kept current and open to every owner.",
    items: [
      "Meeting notice inside the statutory window",
      "Agendas, minutes and motion records",
      "Owner roster and document library",
      "Board and committee support",
    ],
  },
] as const;

const ONBOARDING = [
  {
    week: "Week 1",
    title: "Records transfer",
    detail:
      "Financials, contracts, owner roster and governing documents move over and get reconciled.",
  },
  {
    week: "Week 2",
    title: "Site walk",
    detail:
      "A full inspection with the board, ending in a written condition report and a deferred-work list.",
  },
  {
    week: "Week 3",
    title: "Resident setup",
    detail:
      "Owners get portal access, payment options and a single number that reaches a person.",
  },
  {
    week: "Week 4",
    title: "First board meeting",
    detail:
      "Budget review, vendor decisions and a twelve-month calendar the board signs off on.",
  },
] as const;

export default function ServicesPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Services"
        title="Everything an association needs, run by one office."
        lead="Four areas of work, one point of contact. The board keeps the decisions; we carry the operations, the record-keeping and the follow-up."
      />

      <section className={`${SECTION_PAD} pb-12 md:pb-20`}>
        <div className={`${SECTION_COL} grid gap-px overflow-hidden rounded-2xl border border-outline-variant bg-outline-variant`}>
          {SERVICES.map((s) => (
            <div
              key={s.num}
              className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-8 bg-surface-container-lowest p-6 md:p-8"
            >
              <div>
                <p className="mb-3 font-label text-xs text-secondary-muted">
                  {s.num}
                </p>
                <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em]">
                  {s.title}
                </h2>
                <p className="max-w-[42ch] text-[15px] leading-relaxed text-on-surface-variant">
                  {s.blurb}
                </p>
              </div>
              <ul className="grid gap-2.5">
                {s.items.map((item) => (
                  <li key={item} className="text-[15px] text-on-surface-variant">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={`border-y border-outline-variant bg-surface-container-highest ${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-8 text-[clamp(26px,2.6vw,34px)] font-semibold tracking-[-0.025em]">
            Bringing an association on board
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] justify-items-start gap-8">
            {ONBOARDING.map((o) => (
              <div key={o.week}>
                <p className="mb-3 font-label text-xs text-secondary-muted">
                  {o.week}
                </p>
                <p className="mb-2 text-lg font-semibold">{o.title}</p>
                <p className="text-[15px] leading-relaxed text-on-surface-variant">
                  {o.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${SECTION_PAD} py-12 md:py-20`}>
        <div className={`${SECTION_COL} flex flex-wrap items-baseline justify-between gap-6`}>
          <p className="max-w-[52ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
            Considering a change in management? We&apos;ll review your current
            contract and budget before you commit to anything.
          </p>
          <Link
            href="/contact"
            className="rounded-[10px] bg-secondary px-5 py-3 text-base font-medium text-on-secondary hover:bg-secondary-hover"
          >
            Talk to the office
          </Link>
        </div>
      </section>
    </main>
  );
}
