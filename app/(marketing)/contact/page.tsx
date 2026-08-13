import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = { title: "Contact" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactPage({ searchParams }: PageProps) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const topicParam = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic;

  return (
    <main>
      <PageHero
        eyebrow="Contact us"
        title="Reach the management office."
        intro="Maintenance, billing, documents or a message for the board — send it here and it gets routed with your lot details. Urgent common-area issues should go by phone during office hours."
      />

      <section className="mx-auto mt-[60px] grid max-w-[1320px] items-start gap-10 px-6 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:px-11">
        <div className="rounded-2xl border border-line bg-white px-6 py-9 md:px-12 md:py-11">
          <h2 className="mb-[26px] font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">Send a message</h2>
          <ContactForm initialTopic={topicParam ?? ""} />
        </div>

        <aside className="grid gap-3.5">
          <div className="rounded-2xl bg-ink p-8 text-white">
            <div className="mb-[18px] text-xs font-bold tracking-[0.08em] text-white/55 uppercase">Management office</div>
            <div className="mb-[18px] font-display text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[26px]">
              7880 Morrison Road
              <br />
              Katy, Texas 77493
            </div>
            <div className="text-base leading-8 text-white/80">
              <a href="tel:7132083539" className="text-cream hover:text-white">713-208-3539</a>
              <br />
              <a href="mailto:info@unitygridmanagement.com" className="text-cream hover:text-white">info@unitygridmanagement.com</a>
              <br />
              Mon–Fri, 9AM–5PM
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-7">
            <div className="mb-3 text-xs font-bold tracking-[0.08em] text-faint uppercase">Emergencies</div>
            <div className="grid gap-2.5 text-[15px] leading-[1.55] text-body">
              <span><strong className="text-ink">Life safety, fire, crime</strong> — call 911 first, then the office.</span>
              <span><strong className="text-ink">Water main or major leak</strong> — <a href="tel:7132083539" className="text-moss hover:text-ink">713-208-3539</a>, available 24 hours.</span>
              <span><strong className="text-ink">Gate or access failure</strong> — the same line; a tech is dispatched the same day.</span>
            </div>
          </div>

          <div className="rounded-2xl bg-tint p-7">
            <div className="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">Already a resident?</div>
            <p className="mb-[18px] text-[15px] leading-[1.6] text-body">
              Sign in to file a request, pay dues or track a past message — no form needed.
            </p>
            <Link href="/portal" className="inline-block rounded-lg bg-ink px-5 py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-moss">
              Resident portal
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
