import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";

export const metadata: Metadata = { title: "Governance" };

const DOCUMENTS = [
  { title: "Declaration of Covenants, Conditions & Restrictions", meta: "PDF · 1.4 MB · amended 2024" },
  { title: "Bylaws", meta: "PDF · 480 KB · amended 2023" },
  { title: "Architectural guidelines", meta: "PDF · 720 KB · current" },
  { title: "Community rules & regulations", meta: "PDF · 310 KB · current" },
  { title: "Annual budget", meta: "PDF · 220 KB · 2026" },
  { title: "Reserve study", meta: "PDF · 1.1 MB · 2025" },
] as const;

const ARC_STEPS = [
  { n: "01", label: "Submit", detail: "plans, materials, colors and a site sketch. Photos help." },
  { n: "02", label: "Review", detail: "the Architectural Committee meets twice monthly." },
  { n: "03", label: "Decision", detail: "written approval, conditions, or the reason for denial." },
  { n: "04", label: "Close out", detail: "tell us when work finishes so the file can be closed." },
] as const;

const BOARD = [
  { name: "Phillip Dautrich", role: "President", note: "Term through the 2027 annual meeting" },
  { name: "William Robert Jackson", role: "Vice president", note: "Term through the 2027 annual meeting" },
  { name: "Renee Alvarado", role: "Treasurer", note: "Term through the 2026 annual meeting" },
  { name: "Susan Ngo", role: "Secretary", note: "Term through the 2026 annual meeting" },
] as const;

export default function GovernancePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Governance"
        title="The rules, the record, and who decides."
        lead="Every governing document for your community, the process for changing your home's exterior, and the neighbors who vote on it."
      />

      <section className={`${SECTION_PAD} pb-12 md:pb-20`}>
        <div className={SECTION_COL}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">
              Document library
            </h2>
            <span className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
              Sign-in required
            </span>
          </div>

          <p className="mb-6 max-w-[62ch] text-[15px] leading-relaxed text-on-surface-variant text-pretty">
            Governing documents are available to registered residents. Sign in
            with your resident account to download them, or{" "}
            <Link href="/contact" className="text-secondary hover:underline">
              ask the office
            </Link>{" "}
            for a copy.
          </p>

          <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
            {DOCUMENTS.map((d) => (
              <div
                key={d.title}
                className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-baseline justify-items-start gap-x-[18px] gap-y-2 bg-surface-container-lowest px-6 py-5"
              >
                <span className="text-base font-medium">{d.title}</span>
                <span className="font-label text-xs text-status-neutral">
                  {d.meta}
                </span>
                {/* Downloads stay gated until resident auth exists. */}
                <span
                  aria-disabled
                  title="Resident sign-in isn’t available yet"
                  className="cursor-not-allowed font-label text-xs uppercase tracking-[0.12em] text-outline"
                >
                  Sign in to download
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`border-y border-outline-variant bg-surface-container-highest ${SECTION_PAD} py-12 md:py-20`}>
        <div className={`${SECTION_COL} grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[72px]`}>
          <div>
            <h2 className="mb-5 text-[clamp(26px,2.6vw,34px)] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">
              Changing something outside your home
            </h2>
            <p className="mb-6 max-w-[46ch] text-[17px] leading-relaxed text-on-surface-variant text-pretty">
              Paint, fences, roofs, patios, pools, solar and anything else
              visible from the street needs written approval before work starts.
              Applications are answered within 30 days.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-[10px] bg-secondary px-5 py-3 text-base font-medium text-on-secondary hover:bg-secondary-hover"
            >
              Start an application
            </Link>
          </div>

          <div className="grid gap-4">
            {ARC_STEPS.map((s) => (
              <div key={s.n} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="flex-none font-label text-xs text-secondary-muted">
                  {s.n}
                </span>
                <span className="min-w-0 flex-[1_1_220px] text-[15px] leading-relaxed text-on-surface-variant">
                  <strong className="font-semibold text-on-surface">
                    {s.label}
                  </strong>{" "}
                  — {s.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${SECTION_PAD} py-12 md:py-20`}>
        <div className={SECTION_COL}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">
              Your board
            </h2>
            <span className="font-label text-xs text-outline">
              Elected annually · terms run through the annual meeting
            </span>
          </div>

          <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] justify-items-start gap-8">
            {BOARD.map((m) => (
              <div key={m.name}>
                <p className="text-base font-medium">{m.name}</p>
                <p className="font-label text-xs text-secondary-muted">
                  {m.role}
                </p>
                <p className="mt-1.5 text-sm text-on-surface-variant">
                  {m.note}
                </p>
              </div>
            ))}
          </div>

          <p className="max-w-[70ch] text-[15px] leading-relaxed text-on-surface-variant text-pretty">
            Board meetings are held the second Tuesday of each month at 6:30 PM
            in the Clubhouse Annex. Owners may speak during the open forum at
            the start of each meeting.{" "}
            <Link href="/contact" className="text-secondary hover:underline">
              Ask to be on the agenda
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
