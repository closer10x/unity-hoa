import Link from "next/link";

import { DuesLookupCard } from "@/components/site/DuesLookupCard";
import { HeroMedia } from "@/components/site/HeroMedia";

const QUICK_LINKS = [
  {
    href: "/admin/login",
    title: "File a maintenance request",
    detail: "Common areas, gates, lighting and amenities.",
  },
  {
    href: "/admin/login",
    title: "Bylaws, CC&Rs and rules",
    detail: "Every governing document, current and downloadable.",
  },
  {
    href: "/admin/login",
    title: "What Unity Grid handles",
    detail: "Finances, grounds, rules and records for your association.",
  },
] as const;

const CAPABILITIES = [
  {
    n: "01",
    title: "Dues & finances",
    detail:
      "Dues billing, collections and a reserve budget the board can read in one sitting.",
  },
  {
    n: "02",
    title: "Grounds & upkeep",
    detail:
      "Landscaping, pool service, gates and lighting — scheduled, inspected and tracked.",
  },
  {
    n: "03",
    title: "Rules & review",
    detail:
      "Architectural applications, violation notices and covenant enforcement, applied evenly.",
  },
  {
    n: "04",
    title: "Meetings & records",
    detail:
      "Agendas, minutes and the document library, kept current and open to every owner.",
  },
] as const;

const BOARD_ROWS = [
  {
    mark: "Monthly",
    title: "Board meeting",
    detail: " — every owner is welcome; agendas post before each session",
    action: "Agenda",
    href: "/admin/login",
  },
  {
    mark: "Open",
    title: "Committee seats",
    detail: " — Architectural & Social committees welcome volunteers",
    action: "Volunteer",
    href: "/admin/login",
  },
  {
    mark: "Anytime",
    title: "Message the board",
    detail: " — routed with your lot details",
    action: "Write",
    href: "/admin/login",
  },
] as const;

/**
 * Every section pads the full-bleed outer element and centres a 1200px inner
 * column, so all content shares one left edge. Putting the padding and the
 * max-width on the same element would inset these columns past the header.
 */
const PAD = "px-4 sm:px-6 md:px-8";
const COLUMN = "mx-auto w-full max-w-[1200px]";

export default function HomePage() {
  return (
    <main>
      <section className={`${PAD} pt-5 md:pt-8`}>
        <div className={COLUMN}>
          <HeroMedia />
        </div>
      </section>

      <section className={`${PAD} pt-8 pb-10 md:pt-14 md:pb-[76px]`}>
        <div
          className={`${COLUMN} grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-16`}
        >
          <div>
          <p className="mb-6 font-label text-xs uppercase tracking-[0.14em] text-secondary-muted">
            Managed communities · Greater Houston
          </p>
          <h1 className="mb-6 text-[clamp(38px,4.4vw,60px)] leading-[1.05] font-semibold tracking-[-0.028em] text-balance">
            Everything for your home, in one place.
          </h1>
          <p className="mb-[34px] max-w-[50ch] text-[19px] leading-relaxed text-on-surface-variant text-pretty">
            Pay your HOA dues, ask for a repair, or read the rules — without
            hunting for a phone number. Unity Grid runs the day-to-day of your
            association so the neighborhood stays well kept and the board stays
            out of the weeds.
          </p>

          <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 bg-surface-container-lowest px-[22px] py-5 text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <span>
                  <strong className="text-base font-semibold">
                    {item.title}
                  </strong>
                  <span className="mt-[3px] block text-sm text-on-surface-variant">
                    {item.detail}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="font-label text-xs text-secondary-muted"
                >
                  →
                </span>
              </Link>
            ))}
            </div>
          </div>

          {/* Bottom-aligned with the quick-links box so the two columns end on
              the same line. */}
          <div className="self-end">
            <DuesLookupCard />
          </div>
        </div>
      </section>

      <section className="border-y border-outline-variant bg-surface-container-highest px-4 py-12 sm:px-6 md:px-8 md:py-24">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[72px]">
          <div>
            <p className="mb-5 font-label text-xs uppercase tracking-[0.14em] text-secondary-muted">
              What Unity Grid does
            </p>
            <h2 className="mb-5 text-[clamp(30px,3vw,40px)] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">
              A management office that neighbors can actually reach.
            </h2>
            <p className="mb-6 max-w-[42ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
              We handle the money, the vendors and the paperwork behind the
              association. Residents get straight answers; the volunteer board
              gets its evenings back.
            </p>
            <Link
              href="/payment"
              className="text-base font-medium text-secondary hover:underline"
            >
              Pay your HOA fee →
            </Link>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-12 gap-y-10">
            {CAPABILITIES.map((c) => (
              <div key={c.n}>
                <p className="mb-3 font-label text-xs text-secondary-muted">
                  {c.n}
                </p>
                <p className="mb-2 text-lg font-semibold">{c.title}</p>
                <p className="text-[15px] leading-relaxed text-on-surface-variant">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${PAD} py-12 md:py-24`}>
        <div
          className={`${COLUMN} grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-16`}
        >
          <div className="overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-high">
            <img
              className="block h-full w-full object-cover"
              style={{ aspectRatio: "4 / 3" }}
              src="/images/community-pool.webp"
              alt="Families enjoying the community pool on a sunny afternoon"
            />
          </div>

          <div>
          <p className="mb-5 font-label text-xs uppercase tracking-[0.14em] text-secondary-muted">
            Your voice
          </p>
          <h2 className="mb-5 text-[clamp(30px,3vw,40px)] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">
            The board is your neighbors. Come say something.
          </h2>
          <p className="mb-8 max-w-[48ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
            Every owner is welcome at the monthly meeting, and committee seats
            open through the year. Bring a suggestion, a question, or a
            complaint — all three are useful.
          </p>

          <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
            {BOARD_ROWS.map((row) => (
              <div
                key={row.title}
                className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-1.5 bg-surface-container-lowest px-6 py-[22px]"
              >
                <span className="font-label text-xs text-secondary-muted">
                  {row.mark}
                </span>
                <span>
                  <strong className="font-semibold">{row.title}</strong>
                  <span className="text-on-surface-variant">{row.detail}</span>
                </span>
                <Link
                  href={row.href}
                  className="text-[15px] whitespace-nowrap text-secondary hover:underline"
                >
                  {row.action}
                </Link>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`border-t border-outline-variant ${PAD} py-10 md:py-[72px]`}>
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">
              Community news
            </h2>
            <Link
              href="/admin/login"
              className="text-[15px] text-secondary hover:underline"
            >
              All updates &amp; events
            </Link>
          </div>

          <div className="rounded-[14px] border border-outline-variant bg-surface-container-lowest px-6 py-10 md:px-10">
            <p className="mb-2.5 font-label text-xs uppercase tracking-[0.12em] text-outline">
              No posts yet
            </p>
            <p className="max-w-[62ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
              Announcements from your association are published here as they
              happen — meeting recaps, service notices and community updates.
              Registered residents also receive every notice by email.
            </p>
          </div>
        </div>
      </section>

      <section className={`border-t border-outline-variant ${PAD} py-10 md:py-[72px]`}>
        <div className={COLUMN}>
          <div className="flex flex-wrap items-center justify-between gap-x-16 gap-y-6 rounded-[18px] border border-outline-variant bg-surface-container-lowest px-6 py-8 md:px-10">
            <div className="min-w-0 flex-[1_1_340px]">
              <p className="mb-2.5 font-label text-xs uppercase tracking-[0.14em] text-secondary-muted">
                Administration
              </p>
              <p className="mb-2 text-[22px] font-semibold tracking-[-0.015em]">
                Board members &amp; management staff
              </p>
              <p className="max-w-[52ch] text-[15px] leading-relaxed text-on-surface-variant text-pretty">
                Announcements, events, maintenance, finances and community
                records are managed from the administrator portal.
              </p>
            </div>
            <Link
              href="/admin/login"
              className="rounded-[10px] bg-secondary px-6 py-[13px] text-base font-medium text-on-secondary transition-colors hover:bg-secondary-hover"
            >
              Sign in to administration
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
