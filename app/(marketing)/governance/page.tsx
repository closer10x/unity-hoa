import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/site/PageHero";
import { loadBoard } from "@/lib/site/board";

const DOCS = [
  { title: "Declaration of Covenants, Conditions & Restrictions", body: "The recorded CC&Rs that run with every lot", date: "Mar 2026" },
  { title: "Bylaws", body: "How the association is organized, elected and run", date: "Mar 2026" },
  { title: "Architectural guidelines", body: "Standards for exterior changes, fences, paint and additions", date: "Apr 2026" },
  { title: "Community rules & regulations", body: "Pool, parking, trash, pets and amenity use", date: "Jun 2026" },
  { title: "Collection & enforcement policy", body: "Notice steps, deadlines and fees before any action", date: "Jun 2026" },
  { title: "Annual budget & assessment schedule", body: "What dues cover this year, line by line", date: "Jan 2026" },
];

const STEPS = [
  { step: "STEP 1", title: "Observation", body: "Found on inspection or reported by a neighbor, then verified by staff." },
  { step: "STEP 2", title: "Courtesy notice", body: "A written heads-up naming the rule and a reasonable window to fix it." },
  { step: "STEP 3", title: "Formal notice", body: "Sent per the enforcement policy, with the owner's right to be heard." },
  { step: "STEP 4", title: "Board hearing", body: "Unresolved matters go to the board — most never get this far." },
];

export const metadata: Metadata = { title: "Governance" };

/* The board roster is read from the directors the office seats; revalidate on a
   timer so a seat change appears without a redeploy. */
export const revalidate = 300;

export default async function GovernancePage() {
  const board = await loadBoard();

  return (
    <main>
      <PageHero
        eyebrow="Governance"
        title="Bylaws, CC&Rs and rules."
        intro="Every governing document, current and downloadable. If a rule affects your lot, it is on this page — no request form, no waiting on a callback."
      />

      <section className="mx-auto mt-[60px] grid max-w-[1320px] items-start gap-10 px-6 md:grid-cols-[1fr_320px] md:gap-14 md:px-11">
        <div>
          <div className="mb-1 flex items-baseline justify-between border-b border-ink pb-3.5">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Governing documents</h2>
            <span className="text-[13px] font-semibold tracking-[0.06em] text-faint uppercase">Updated</span>
          </div>

          {DOCS.map((d) => (
            <Link
              key={d.title}
              href="/portal/login"
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-[22px] text-ink transition-colors hover:text-moss md:grid-cols-[1fr_120px_96px] md:gap-6"
            >
              <span>
                <span className="mb-1 block text-[17px] font-semibold md:text-[18px]">{d.title}</span>
                <span className="text-[15px] text-muted">{d.body}</span>
              </span>
              <span className="hidden text-[15px] text-muted md:block">{d.date}</span>
              <span className="text-right text-[15px] font-semibold whitespace-nowrap text-moss">Open →</span>
            </Link>
          ))}
        </div>

        <aside className="grid gap-3.5 md:sticky md:top-[104px]">
          <div className="rounded-[14px] bg-tint p-7">
            <div className="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">Planning an exterior change?</div>
            <p className="mb-[18px] text-[15px] leading-[1.6] text-body">
              Fences, paint, roofing, sheds and additions need an approved application before work starts.
            </p>
            <Link href="/portal/login" className="inline-block rounded-lg bg-ink px-5 py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-moss">
              Submit an application
            </Link>
          </div>
          <div className="rounded-[14px] border border-line bg-white p-7">
            <div className="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">Need a resale certificate?</div>
            <p className="mb-[18px] text-[15px] leading-[1.6] text-body">
              Title companies and closing agents can request association documents from the management office.
            </p>
            <Link href="/contact" className="text-[15px] font-semibold text-moss hover:text-ink">Contact the office →</Link>
          </div>
        </aside>
      </section>

      {/* Real board roster */}
      {board.length ? (
        <section className="mx-auto mt-[90px] max-w-[1320px] px-6 md:px-11">
          <div className="mb-6 flex items-baseline justify-between border-b border-ink pb-3.5">
            <h2 className="font-display text-[30px] font-semibold tracking-[-0.03em]">Sofi Lakes board</h2>
            <span className="text-[13px] font-semibold tracking-[0.06em] text-faint uppercase">Elected by owners</span>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((m) => (
              <div key={`${m.name}-${m.role}`} className="rounded-[14px] border border-line bg-white px-7 py-6">
                <div className="mb-2 text-xs font-bold tracking-[0.08em] text-moss uppercase">{m.role}</div>
                <div className="font-display text-xl font-semibold tracking-[-0.02em]">{m.name}</div>
                {m.termThrough ? (
                  <div className="mt-1.5 text-sm text-muted">Term through {m.termThrough}</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-[90px] max-w-[1320px] px-6 md:px-11">
        <h2 className="mb-7 font-display text-[32px] font-semibold tracking-[-0.03em] md:text-4xl">How enforcement works</h2>
        <div className="grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="bg-white px-[26px] pt-[30px] pb-[34px]">
              <div className="mb-5 text-[13px] font-bold text-faint">{s.step}</div>
              <div className="mb-2 font-display text-[19px] font-semibold tracking-[-0.02em]">{s.title}</div>
              <div className="text-[15px] leading-[1.6] text-muted">{s.body}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
