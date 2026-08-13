import Image from "next/image";
import Link from "next/link";

import { getPublicDuesDisplay } from "@/app/admin/(dashboard)/hoa/actions";
import { DuesLookupCard } from "@/components/site/DuesLookupCard";
import {
  formatShortDate,
  getPublishedAnnouncements,
} from "@/lib/community/public-content";

const COMMUNITY = "Sofi Lakes";

const QUICK_LINKS = [
  {
    title: "File a maintenance request",
    body: "Common areas, gates, lighting and amenities.",
    cta: "Start a request →",
    href: "/portal/login",
  },
  {
    title: "Bylaws, CC&Rs and rules",
    body: "Every governing document, current and downloadable.",
    cta: "Open governance →",
    href: "/governance",
  },
  {
    title: "What Unity Grid handles",
    body: "Finances, grounds, rules and records for your association.",
    cta: "See services →",
    href: "/services",
  },
];

const SERVICES = [
  { n: "01", title: "Dues & finances", body: "Dues billing, collections and a reserve budget the board can read in one sitting." },
  { n: "02", title: "Grounds & upkeep", body: "Landscaping, pool service, gates and lighting — scheduled, inspected and tracked." },
  { n: "03", title: "Rules & review", body: "Architectural applications, violation notices and covenant enforcement, applied evenly." },
  { n: "04", title: "Meetings & records", body: "Agendas, minutes and the document library, kept current and open to every owner." },
];

const BOARD_ROWS = [
  { tag: "Monthly", strong: "Board meeting", rest: "— every owner is welcome; agendas post before each session", cta: "Agenda →", href: "/events" },
  { tag: "Open", strong: "Committee seats", rest: "— Architectural & Social committees welcome volunteers", cta: "Volunteer →", href: "/about" },
  { tag: "Anytime", strong: "Message the board", rest: "— routed with your lot details", cta: "Write →", href: "/contact" },
];

/* Announcements and dues config come from the database; re-render at most every
   5 minutes so published posts appear without a redeploy. */
export const revalidate = 300;

export default async function HomePage() {
  const [announcements, dues] = await Promise.all([
    getPublishedAnnouncements(3),
    getPublicDuesDisplay(),
  ]);
  const lead = announcements[0] ?? null;

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-6 pt-[84px] md:grid-cols-[1.08fr_1fr] md:gap-[72px] md:px-11">
        <div>
          <div className="mb-7 inline-flex items-center gap-[9px] rounded-md bg-tint px-[14px] py-[7px] text-[13px] font-semibold text-moss">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Now managing {COMMUNITY}
          </div>
          <h1 className="mb-[26px] font-display text-[48px] leading-[0.96] font-extrabold tracking-[-0.04em] text-balance md:text-[76px]">
            Everything for your home, in one place.
          </h1>
          <p className="mb-[34px] max-w-[54ch] text-[19px] leading-[1.6] text-body text-pretty">
            Pay your HOA dues, ask for a repair, or read the rules — without hunting for a
            phone number. Unity Grid runs the day-to-day of your association so the
            neighborhood stays well kept and the board stays out of the weeds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/portal" className="rounded-lg bg-moss px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-ink">
              Pay your HOA fee
            </Link>
            <Link href="/portal/login" className="rounded-lg border border-line bg-white px-7 py-4 text-base font-semibold text-ink transition-colors hover:border-ink">
              File a maintenance request
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 grid-rows-[200px_148px] gap-3.5">
          <div className="relative col-span-2 overflow-hidden rounded-xl bg-stone">
            {/* Drone footage over the community; muted + looping so it plays
                inline as a silent backdrop. The still is the poster fallback
                while it loads, or if autoplay is blocked. */}
            <video
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/images/hero-neighborhood.png"
            >
              <source src="/video/hero-drone.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <Image src="/images/community-pool.webp" alt="Community pool" fill sizes="320px" className="object-cover" />
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-ink p-6 text-white">
            <div className="text-[13px] font-semibold tracking-[0.06em] text-white/55 uppercase">Office hours</div>
            <div>
              <div className="font-display text-[26px] font-semibold tracking-[-0.02em]">Mon–Fri</div>
              <div className="mt-1 text-[15px] text-white/70">9AM–5PM · 713-208-3539</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="mx-auto mt-[76px] max-w-[1320px] px-6 md:px-11">
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_LINKS.map((c) => (
            <Link key={c.title} href={c.href} className="block rounded-xl border border-line bg-white p-7 transition-colors hover:border-moss">
              <div className="mb-2 font-display text-[21px] font-semibold tracking-[-0.02em]">{c.title}</div>
              <div className="mb-5 text-[15px] leading-[1.55] text-muted">{c.body}</div>
              <div className="text-[15px] font-semibold text-moss">{c.cta}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Dues lookup — real card wired to live dues config */}
      <section className="mx-auto mt-[88px] max-w-[1320px] px-6 md:px-11">
        <div className="grid items-start gap-10 rounded-2xl border border-line bg-white px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14 md:px-12 md:py-[46px]">
          <div>
            <h2 className="mb-4 font-display text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] md:text-[40px]">Look up your dues</h2>
            <p className="mb-4 max-w-[42ch] text-base leading-[1.6] text-body">
              Pick your community, then enter the account number from your statement and your
              house number to see what&apos;s owed.
            </p>
            <p className="text-sm leading-[1.6] text-muted">
              Your account number is printed on your statement — it looks like SL48213.
              Registered residents can{" "}
              <Link href="/portal/login" className="text-moss hover:text-ink">sign in</Link>{" "}
              instead and skip this step.
            </p>
          </div>
          <DuesLookupCard dues={dues} />
        </div>
      </section>

      {/* Dark services band */}
      <section className="mt-[100px] bg-ink py-[92px] text-white">
        <div className="mx-auto max-w-[1320px] px-6 md:px-11">
          <div className="mb-14 grid items-end gap-10 md:grid-cols-2 md:gap-[72px]">
            <h2 className="font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance md:text-[52px]">
              A management office that neighbors can actually reach.
            </h2>
            <div>
              <p className="mb-6 text-[18px] leading-[1.62] text-white/70 text-pretty">
                We handle the money, the vendors and the paperwork behind the association.
                Residents get straight answers; the volunteer board gets its evenings back.
              </p>
              <Link href="/portal" className="inline-block rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-cream">
                Pay your HOA fee →
              </Link>
            </div>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.n} className="bg-ink px-[26px] pt-[30px] pb-[34px]">
                <div className="mb-[22px] text-[13px] font-semibold text-sage">{s.n}</div>
                <div className="mb-2.5 font-display text-[21px] font-semibold tracking-[-0.02em]">{s.title}</div>
                <div className="text-[15px] leading-[1.6] text-white/65">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Board / community */}
      <section className="mx-auto mt-[100px] grid max-w-[1320px] items-center gap-10 px-6 md:grid-cols-[1fr_1.05fr] md:gap-[72px] md:px-11">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image src="/images/community-pool.webp" alt="Families at the community pool" fill sizes="(max-width:768px) 100vw, 620px" className="object-cover" />
        </div>
        <div>
          <h2 className="mb-5 font-display text-[38px] leading-[1.04] font-semibold tracking-[-0.03em] text-balance md:text-[46px]">
            The board is your neighbors. Come say something.
          </h2>
          <p className="mb-[30px] text-[18px] leading-[1.62] text-body text-pretty">
            Every owner is welcome at the monthly meeting, and committee seats open through the
            year. Bring a suggestion, a question, or a complaint — all three are useful.
          </p>
          <div className="grid gap-2.5">
            {BOARD_ROWS.map((r) => (
              <div key={r.strong} className="grid grid-cols-[72px_1fr_auto] items-center gap-[18px] rounded-[10px] border border-line bg-white px-5 py-[18px]">
                <span className="text-xs font-bold tracking-[0.06em] text-moss uppercase">{r.tag}</span>
                <span className="text-[15px] leading-[1.5] text-body">
                  <strong className="text-ink">{r.strong}</strong> {r.rest}
                </span>
                <Link href={r.href} className="text-[15px] font-semibold whitespace-nowrap text-moss hover:text-ink">{r.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community news — live announcements */}
      <section className="mx-auto mt-[100px] max-w-[1320px] px-6 md:px-11">
        <div className="mb-7 flex items-baseline justify-between gap-10">
          <h2 className="font-display text-[34px] font-semibold tracking-[-0.03em] md:text-[40px]">Community news</h2>
          <Link href="/events" className="text-[15px] font-semibold whitespace-nowrap text-moss hover:text-ink">All updates &amp; events →</Link>
        </div>
        {lead ? (
          <article className="rounded-2xl border border-line bg-white px-6 py-9 md:px-12 md:py-11">
            <div className="mb-3.5 text-[13px] font-bold tracking-[0.06em] text-moss uppercase">
              {formatShortDate(lead.published_at) ?? "Announcement"}
            </div>
            <h3 className="mb-[18px] max-w-[36ch] font-display text-[26px] leading-[1.2] font-semibold tracking-[-0.03em] text-balance md:text-[30px]">
              {lead.title}
            </h3>
            {lead.body
              ? lead.body.split(/\n{2,}/).slice(0, 3).map((p, i) => (
                  <p key={i} className={`mb-3.5 max-w-[76ch] text-[17px] leading-[1.65] text-pretty ${i === 0 ? "text-body" : "text-muted"}`}>{p}</p>
                ))
              : null}
          </article>
        ) : (
          <article className="rounded-2xl border border-line bg-white px-6 py-9 md:px-12 md:py-11">
            <p className="max-w-[62ch] text-[17px] leading-[1.65] text-muted">
              Announcements from your association are published here as they happen — meeting
              recaps, service notices and community updates. Registered residents also receive
              every notice by email.
            </p>
          </article>
        )}
      </section>

      {/* Administration CTA */}
      <section className="mx-auto mt-6 max-w-[1320px] px-6 md:px-11">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-tint px-6 py-8 md:px-12 md:py-10">
          <div>
            <div className="mb-2 font-display text-2xl font-semibold tracking-[-0.02em]">Board members &amp; management staff</div>
            <div className="max-w-[64ch] text-base leading-[1.6] text-body">
              Announcements, events, maintenance, finances and community records are managed from
              the administrator portal.
            </div>
          </div>
          <Link href="/admin/login" className="rounded-lg bg-ink px-[26px] py-[15px] text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-moss">
            Sign in to administration
          </Link>
        </div>
      </section>
    </main>
  );
}
