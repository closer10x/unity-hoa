import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AboutFlashProbe } from "@/components/marketing/about-flash-probe";

export const metadata: Metadata = {
  title: "About Us",
};

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDhFhF-u8D8R-LJkRb8eRzlYDZWq4ed82TNcNdc4LeczPMcq2cTL-cCWBmx5xdd7fPruG_PZtHAp8LyaAn1OMmRR60wl5Bh-IyXzRHKInWODU5Ukw6BDCCWY_masPPimV1ikfHVxjGuz6W4VDnw9fBnuVL1iNzmpyDyxB9opiX0BGlR3PGUmKZAAY8yYIBkKaWOkxxQs4d1kqctO-ZuVsuPYTkOt8JgmEVb0-6kbrhDaFqjq-dv8uaayAv0bpCd103-iGrpkZet2ZzD";

const MISSION_IMG = "/images/about-mission-community-art.png";

/** Subtle “behind the copy” treatment, same pattern as the hero imagery elsewhere on this page. */
const HOUSTON_MARKET_BG = "/images/houston-market-skyline.png";

const BOARD = [
  {
    name: "Sophia Filfil",
    hideName: true,
    role: "President",
    img: "/images/SophiaPhilphore.png",
    alt: "Portrait of board president Sophia Filfil",
    bio: "Sofi Lakes homeowner who runs the board like property management—short agendas, reserve numbers you can read, and vendors held accountable until gates, pools, and lighting are really fixed.",
  },
  {
    name: "William Robert Jackson",
    role: "Treasurer",
    img: "/images/william-robert-jackson-board.png",
    alt: "Portrait of board treasurer William Robert Jackson",
    bio: "Houston-area through and through—William still believes a treasurer ought to look you in the eye at the mailbox and show the math. He keeps dues straight, reserves funded before the next big Gulf Coast storm season, and monthly packets plain enough that nobody has to decode fine print to know where their money went.",
  },
  {
    name: "Phillip Dautrich",
    role: "Secretary",
    img: "/images/phillip-dautrich-board.png",
    alt: "Portrait of board secretary Phillip Dautrich",
    bio: "Keeps agendas, minutes, and notices aligned with what the board actually voted on—so residents get one clear story in email and on the portal, not three conflicting versions.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="flex-grow">
      <section className="relative min-h-[614px] flex items-center overflow-hidden bg-primary-container">
        <div
          className="absolute inset-0 opacity-40 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
          role="img"
          aria-label="Luxury residential estate architecture and landscaping"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full py-24">
          <span className="text-secondary-fixed text-xs font-bold uppercase tracking-[0.2em] mb-4 block">
            Our Legacy
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight max-w-3xl">
            Defining the Standard of{" "}
            <span className="text-secondary-fixed-dim">Modern Living.</span>
          </h1>
          <p className="mt-6 text-on-primary-container text-lg max-w-xl font-body">
            A community built on the principles of architectural integrity,
            neighborly transparency, and the expert stewardship of Unity Grid
            Management.
          </p>
        </div>
      </section>

      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-[11px] font-bold uppercase tracking-wider">
              Mission Statement
            </div>
            <h2 className="text-4xl font-bold text-on-surface leading-snug">
              Preserving Value Through Visionary Stewardship.
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              At Unity Grid Management, our mission is to cultivate a living
              environment that transcends the ordinary. We are committed to
              maintaining the aesthetic and structural excellence of our grounds
              while fostering a vibrant, interconnected community through
              transparent governance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <span className="material-symbols-outlined text-secondary text-3xl">
                  verified_user
                </span>
                <h4 className="font-bold text-on-surface">Integrity First</h4>
                <p className="text-sm text-on-surface-variant">
                  Transparent decisions, accountable leadership, and policies
                  that protect every homeowner&apos;s investment.
                </p>
              </div>
              <div className="space-y-2">
                <span className="material-symbols-outlined text-secondary text-3xl">
                  eco
                </span>
                <h4 className="font-bold text-on-surface">Sustainable Future</h4>
                <p className="text-sm text-on-surface-variant">
                  Native landscaping, efficient utilities, and long-term
                  planning that respects the land we share.
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-xl overflow-hidden shadow-2xl relative">
              <Image
                alt="Large illuminated public art installation with leaf-like canopies on a plaza at dusk, with modern buildings nearby"
                className="object-cover object-center"
                src={MISSION_IMG}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 glass-panel bg-surface/80 p-8 rounded-xl max-w-xs shadow-xl hidden md:block border border-outline-variant/20">
              <p className="italic text-primary font-headline font-semibold text-lg">
                &quot;The best neighborhoods aren&apos;t just designed; they are
                nurtured.&quot;
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-secondary">
                — Board Philosophy
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-on-surface mb-4">
              Our Journey
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              In <span className="font-semibold text-on-surface">2026</span>, our
              story is written in real time: Sofi Lakes HOA coordinating assessments,
              vendors, and common-area upkeep while Houston&apos;s inventory, rates,
              and buyer expectations keep shifting. This page is a snapshot of how
              we&apos;re operating <em>this year</em>—specific budgets, named
              responsibilities, and a board that answers to people who live on these
              streets.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 md:min-h-[600px]">
            <div className="md:col-span-7 bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-end relative overflow-hidden group min-h-[320px]">
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Image
                  alt="Houston skyline at golden hour, representing the metro real estate market behind the community"
                  className="object-cover object-center"
                  src={HOUSTON_MARKET_BG}
                  fill
                  sizes="(min-width: 768px) 58vw, 100vw"
                />
              </div>
              <div className="relative z-10">
                <span className="text-secondary font-bold text-sm tracking-widest">
                  EST. 2026 · SOFI LAKES · HOUSTON
                </span>
                <h3 className="text-3xl font-bold mt-2 mb-4">
                  Property management tuned for the 2026 market
                </h3>
                <p className="text-on-surface-variant max-w-md leading-relaxed">
                  Assessments, reserves, insurance renewals, and vendor contracts all
                  landed with new price tags this cycle—so our 2026 playbook is
                  explicit: line-item transparency, preventative maintenance on pools
                  and gates before they fail, and architectural reviews that keep
                  curb appeal aligned with what buyers are touring in Energy Corridor
                  and Katy comps. Sofi Lakes is the association office you can walk up
                  to, not a distant call center pretending Houston is generic
                  &quot;sunbelt sprawl.&quot;
                </p>
              </div>
            </div>
            <div className="md:col-span-5 grid grid-rows-2 gap-6">
              <div className="bg-primary p-8 rounded-xl text-white flex flex-col justify-center">
                <h3 className="text-4xl font-extrabold text-secondary-fixed mb-2">
                  3+
                </h3>
                <p className="text-on-primary-container uppercase tracking-widest text-xs font-bold">
                  Unique Residences
                </p>
                <p className="mt-4 text-sm opacity-80 leading-relaxed">
                  Each home adheres to a strict design code that ensures harmony
                  without sacrificing individuality.
                </p>
              </div>
              <div className="bg-secondary-container p-8 rounded-xl flex items-center gap-6">
                <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary text-4xl">
                    history_edu
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-on-secondary-container text-xl">
                    The Bylaw Evolution
                  </h4>
                  <p className="text-on-secondary-container/80 text-sm mt-1">
                    Updated in 2026 to include comprehensive renewable energy
                    integration and digital community voting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold text-on-surface">
                The Board of Directors
              </h2>
              <p className="text-on-surface-variant mt-4">
                Dedicated volunteers working to ensure the stability and growth
                of our collective investment.
              </p>
            </div>
            <Link
              href="/contact"
              className="text-secondary font-bold text-sm uppercase tracking-widest flex items-center gap-2 group"
            >
              View Full Governance{" "}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {BOARD.map((d) => (
              <div key={d.name} className="group">
                <div className="aspect-square rounded-xl overflow-hidden mb-6 bg-surface-container relative">
                  <Image
                    alt={d.alt}
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    src={d.img}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                </div>
                {!d.hideName && (
                  <h4 className="text-xl font-bold text-on-surface">{d.name}</h4>
                )}
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">
                  {d.role}
                </p>
                <p className="mt-4 text-on-surface-variant text-sm leading-relaxed">
                  {d.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-8">
          <div className="bg-primary rounded-xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary-fixed/10 -skew-x-12 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Join the Conversation.
                </h2>
                <p className="text-on-primary-container mt-2">
                  Attend our next board meeting or join a community committee
                  facilitated by Unity Grid Management.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/events"
                  className="bg-secondary text-white px-8 py-3 rounded-md font-bold text-sm shadow-lg hover:opacity-90 transition-all"
                >
                  Upcoming Meetings
                </Link>
                <Link
                  href="/contact"
                  className="bg-white/10 text-white px-8 py-3 rounded-md font-bold text-sm backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
                >
                  Apply for Committee
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <AboutFlashProbe />
    </main>
  );
}
