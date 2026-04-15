import type { Metadata } from "next";
import Link from "next/link";

import { MAINTENANCE_REQUEST_PUBLIC_HREF } from "@/lib/maintenance-request/options";

export const metadata: Metadata = {
  title: "Governance",
};

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ4zyerDUmuUG7PtP-JsVBj_r_Y-lUm5M1X8sD3OvjRGQz4PG-9953S4aw76kpTyhflFUg-Nil890a4FFo3MPoNSwLDNq7_maPsQxotL4F6gg3GUG_9pSsStTV0pRMpK4ymUohXkQBV9Id1W5-PrwFTgb7uADJneNn7eyx9eAjwumV5SXTVXnyaVOP4TsjUFPQZQls45etzR2kfb2qd_STnEs9NEQdENpeJ3rH0MDXoQNagQGFLu5Mp7mSSWKx4LWwuRj-ruSR_Cw3";

const CARDS = [
  {
    id: "maintenance",
    icon: "handyman" as const,
    title: "Maintenance Requests",
    description:
      "Report issues with common areas or request specialized community maintenance services.",
    href: MAINTENANCE_REQUEST_PUBLIC_HREF,
    cta: "Submit a Request",
  },
  {
    id: "governing",
    icon: "gavel" as const,
    title: "Governing Documents",
    description:
      "Access the Bylaws, Covenants (CC&Rs), and Community Rules that shape our estate.",
    href: "/documents",
    cta: "Browse Documents",
  },
  {
    id: "forms",
    icon: "description" as const,
    title: "Find a Form",
    description:
      "Download architectural review forms, parking permits, and event registration sheets.",
    href: "/documents",
    cta: "Document Library",
  },
] as const;

export default function GovernancePage() {
  return (
    <main className="flex-grow">
      <section className="relative py-20 md:py-28 bg-gradient-to-br from-primary via-primary to-primary-container overflow-hidden min-h-[380px] flex items-center">
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-8 w-full">
          <span className="text-secondary-fixed font-bold tracking-[0.2em] text-[11px] uppercase mb-4 block">
            Resident Resources
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-on-primary tracking-tight max-w-3xl leading-[1.1] font-headline">
            Community Governance
          </h1>
          <p className="text-on-primary-container text-lg md:text-xl mt-6 max-w-2xl leading-relaxed">
            Transparent access to maintenance, official records, and the forms
            you need—aligned with how your association operates.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 bg-gradient-to-br from-secondary to-secondary-fixed-dim text-on-secondary px-6 py-3.5 rounded-md font-bold text-sm shadow-lg shadow-secondary/20 hover:opacity-95 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                folder_open
              </span>
              Document Library
            </Link>
            <Link
              href={MAINTENANCE_REQUEST_PUBLIC_HREF}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/25 px-6 py-3.5 rounded-md font-bold text-sm hover:bg-white/15 transition-colors"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                engineering
              </span>
              Maintenance
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 -mt-16 md:-mt-20 relative z-10 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card) => {
            const inner = (
              <>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center mb-8 ring-1 ring-outline-variant/30">
                    <span
                      className="material-symbols-outlined text-secondary text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden
                    >
                      {card.icon}
                    </span>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-primary mb-3">
                    {card.title}
                  </h2>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>
                <span className="text-secondary font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                  {card.cta}
                  <span
                    className="material-symbols-outlined text-lg"
                    aria-hidden
                  >
                    east
                  </span>
                </span>
              </>
            );

            return (
              <Link
                key={card.id}
                href={card.href}
                id={card.id}
                className="scroll-mt-28 bg-surface-container-lowest p-10 rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/10 hover:border-secondary/30 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-surface-container-low border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="font-label text-sm uppercase tracking-[0.15em] text-secondary font-bold mb-4 block">
                How we govern
              </span>
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-primary leading-tight mb-6">
                Clarity for homeowners and the board.
              </h2>
              <p className="text-on-surface-variant leading-relaxed mb-6">
                Governance is more than paperwork—it is how decisions are
                documented, how common property is cared for, and how every
                homeowner can find what they need without chasing answers.
              </p>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li className="flex gap-3">
                  <span
                    className="material-symbols-outlined text-secondary shrink-0"
                    aria-hidden
                  >
                    verified_user
                  </span>
                  <span>
                    Official documents are centralized in the document library
                    for consistent access.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span
                    className="material-symbols-outlined text-secondary shrink-0"
                    aria-hidden
                  >
                    history_edu
                  </span>
                  <span>
                    Forms and templates stay organized so projects and requests
                    move forward smoothly.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span
                    className="material-symbols-outlined text-secondary shrink-0"
                    aria-hidden
                  >
                    support
                  </span>
                  <span>
                    Maintenance requests help protect property values and
                    resident safety.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-surface-container-highest to-surface-container p-8 md:p-10 border border-outline-variant/30">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="material-symbols-outlined text-3xl text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  balance
                </span>
                <h3 className="font-headline text-xl font-bold text-primary">
                  Need something else?
                </h3>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                For questions that are not covered here, reach out to management
                or visit the services hub for full community support.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contact"
                  className="inline-flex justify-center items-center bg-primary text-on-primary px-6 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Contact management
                </Link>
                <Link
                  href="/services"
                  className="inline-flex justify-center items-center border border-secondary/30 text-secondary px-6 py-3 rounded-md font-bold text-sm hover:bg-secondary/5 transition-colors"
                >
                  Services hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
