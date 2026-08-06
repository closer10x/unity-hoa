import type { Metadata } from "next";

import { ContactForm } from "@/components/site/ContactForm";
import { PageIntro, SECTION_COL, SECTION_PAD } from "@/components/site/PageIntro";

export const metadata: Metadata = { title: "Contact" };

const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";

export default function ContactPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Contact"
        title="Reach a person, not a queue."
        lead="Office hours are Monday through Friday, 9AM to 5PM. Messages sent through the form reach your community manager and the board liaison together."
      />

      <section className={`${SECTION_PAD} pb-12 md:pb-20`}>
        <div className={`${SECTION_COL} grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-16`}>
          <ContactForm />

          <div className="grid gap-8">
            <div>
              <p className={EYEBROW}>Management office</p>
              <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">
                7880 Morrison Road
                <br />
                Katy, Texas 77493
                <br />
                <a
                  href="tel:7132083539"
                  className="text-secondary hover:underline"
                >
                  713-208-3539
                </a>
                <br />
                <a
                  href="mailto:info@unitygridmanagement.com"
                  className="text-secondary hover:underline"
                >
                  info@unitygridmanagement.com
                </a>
              </p>
            </div>

            <div>
              <p className={EYEBROW}>Office hours</p>
              <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">
                Monday–Friday, 9AM–5PM
                <br />
                Saturday &amp; Sunday, closed
              </p>
            </div>

            <div>
              <p className={EYEBROW}>Emergencies</p>
              <div className="mt-3 grid gap-2.5 text-[15px] leading-relaxed text-on-surface-variant">
                <span>
                  <strong className="font-semibold text-on-surface">
                    Life safety, fire, crime
                  </strong>{" "}
                  — call 911 first, then the office.
                </span>
                <span>
                  <strong className="font-semibold text-on-surface">
                    Water main or major leak
                  </strong>{" "}
                  —{" "}
                  <a
                    href="tel:7132083539"
                    className="text-secondary hover:underline"
                  >
                    713-208-3539
                  </a>
                  , available 24 hours.
                </span>
                <span>
                  <strong className="font-semibold text-on-surface">
                    Gate or access failure
                  </strong>{" "}
                  — the same line; a tech is dispatched the same day.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
