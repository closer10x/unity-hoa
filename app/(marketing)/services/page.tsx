import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/site/PageHero";

const SCOPE = [
  {
    n: "01",
    title: "Dues & finances",
    body: "Dues billing, collections and a reserve budget the board can read in one sitting.",
    points: [
      "Assessment billing, online payments and delinquency follow-up",
      "Monthly financial statements and annual budget preparation",
      "Reserve planning, vendor invoicing and payables",
    ],
  },
  {
    n: "02",
    title: "Grounds & upkeep",
    body: "Landscaping, pool service, gates and lighting — scheduled, inspected and tracked.",
    points: [
      "Vendor contracts, bidding and performance review",
      "Routine property inspections with written findings",
      "Resident maintenance requests for common areas and amenities",
    ],
  },
  {
    n: "03",
    title: "Rules & review",
    body: "Architectural applications, violation notices and covenant enforcement, applied evenly.",
    points: [
      "Architectural applications routed to the committee with a tracked decision",
      "Courtesy notices before formal violation letters",
      "Consistent covenant enforcement documented for every lot",
    ],
  },
  {
    n: "04",
    title: "Meetings & records",
    body: "Agendas, minutes and the document library, kept current and open to every owner.",
    points: [
      "Meeting notices, agendas and minutes posted to the portal",
      "Annual meeting and election administration",
      "Owner records, resale certificates and document requests",
    ],
  },
];

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Services"
        title="What Unity Grid handles for your association."
        intro="Finances, grounds, rules and records — run by a management office, not by volunteers squeezing it in after work. Below is the full scope of what we take on."
      />

      <section className="mx-auto mt-16 grid max-w-[1320px] gap-3.5 px-6 md:px-11">
        {SCOPE.map((s) => (
          <div
            key={s.n}
            className="grid items-start gap-6 rounded-[14px] border border-line bg-white px-6 py-8 md:grid-cols-[64px_1fr_1.1fr] md:gap-10 md:px-11 md:py-10"
          >
            <div className="font-display text-[15px] font-semibold text-faint">{s.n}</div>
            <div>
              <h2 className="mb-2.5 font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">
                {s.title}
              </h2>
              <p className="text-base leading-[1.6] text-muted">{s.body}</p>
            </div>
            <div className="grid gap-3 text-base leading-[1.55] text-body">
              {s.points.map((p) => (
                <div key={p} className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                  <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-[90px] bg-ink py-[76px] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-12 px-6 md:px-11">
          <div>
            <h2 className="mb-3 max-w-[20ch] font-display text-[34px] font-semibold tracking-[-0.03em] text-balance md:text-[42px]">
              Considering Unity Grid for your community?
            </h2>
            <p className="max-w-[52ch] text-[17px] leading-[1.6] text-white/70">
              Tell us the size of your association and what you need covered. We&apos;ll walk your
              board through scope and pricing.
            </p>
          </div>
          <Link
            href="/contact"
            className="rounded-lg bg-white px-7 py-4 text-base font-semibold whitespace-nowrap text-ink transition-colors hover:bg-cream"
          >
            Request a proposal →
          </Link>
        </div>
      </section>
    </main>
  );
}
