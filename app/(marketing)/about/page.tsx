import type { Metadata } from "next";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";

export const metadata: Metadata = { title: "About us" };

const PRINCIPLES = [
  {
    title: "One manager per community",
    detail:
      "You reach the same person each time, and they know your streets, your vendors and your history.",
  },
  {
    title: "Open books",
    detail:
      "Monthly financials, vendor contracts and reserve balances are posted where owners can read them.",
  },
  {
    title: "Even enforcement",
    detail:
      "Rules apply the same way on every street, with written notice and a route to appeal.",
  },
] as const;

const COMMUNITIES = [
  { name: "Sofi Lakes", meta: "390 doors · Katy · managed since 2026" },
  { name: "Morrison Crossing", meta: "212 doors · Katy · managed since 2026" },
  { name: "Lakebend", meta: "148 doors · Fulshear · onboarding" },
] as const;

export default function AboutPage() {
  return (
    <main>
      <PageIntro
        eyebrow="About us"
        title="A local office, not a call center."
        lead="Unity Grid manages homeowners associations across greater Houston. Every community gets a named manager, a real phone number, and books that stay open to owners."
      />

      <section className={`${SECTION_PAD} pb-12 md:pb-16`}>
        <div className={SECTION_COL}>
          <PhotoPlaceholder
            label="photo — management team or office"
            ratio="16 / 9"
          />
        </div>
      </section>

      <section className={`border-y border-outline-variant bg-surface-container-highest ${SECTION_PAD} py-12 md:py-20`}>
        <div className={`${SECTION_COL} grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] justify-items-start gap-10`}>
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <p className="mb-3 font-label text-xs uppercase tracking-[0.12em] text-secondary-muted">
                How we work
              </p>
              <p className="mb-2 text-lg font-semibold">{p.title}</p>
              <p className="text-[15px] leading-relaxed text-on-surface-variant">
                {p.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <h2 className="mb-8 text-[clamp(26px,2.6vw,34px)] font-semibold tracking-[-0.025em]">
            Communities we manage
          </h2>
          <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
            {COMMUNITIES.map((c) => (
              <div
                key={c.name}
                className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-baseline justify-items-start gap-x-[18px] gap-y-2 bg-surface-container-lowest px-6 py-5"
              >
                <p className="text-base font-medium">{c.name}</p>
                <p className="font-label text-xs text-status-neutral">
                  {c.meta}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
