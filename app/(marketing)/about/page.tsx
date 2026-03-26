import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
};

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDhFhF-u8D8R-LJkRb8eRzlYDZWq4ed82TNcNdc4LeczPMcq2cTL-cCWBmx5xdd7fPruG_PZtHAp8LyaAn1OMmRR60wl5Bh-IyXzRHKInWODU5Ukw6BDCCWY_masPPimV1ikfHVxjGuz6W4VDnw9fBnuVL1iNzmpyDyxB9opiX0BGlR3PGUmKZAAY8yYIBkKaWOkxxQs4d1kqctO-ZuVsuPYTkOt8JgmEVb0-6kbrhDaFqjq-dv8uaayAv0bpCd103-iGrpkZet2ZzD";

const MISSION_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAu81QlWCZSzVw6H1IBIcnKHWB_IcqgKaRC2PvS5x7bDh2O4WeBzclac7LhiMypb44TV2k1X2yAgGRN789ZDHA1Ob0cRwIhVX0IDSLrQcjVFHEGfTZa3IoWnqpqrzBOD5GtGzk6AwhGwG0STF97E5lspBZAbSuYSI0dq3OuJr0BtWCz0xnv0HsdnY9vGwwNNky2GGrHwsh5bjP_OUdJobebE88CkUMtcjsffChxkPbjilYtS52RXaW_-lv0eG-2FXxlPRY_FBL-sdCv";

const HISTORY_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC8d4BIsDM2Gsb7ZfMBDyRQPOvnkTx-0vikwFCXmHIDjzqwJGZMvO5Q-XgcP-M5pyno7JGLQ2RFAo2Muulhs0GMsY27Io3lGnWrIEKYV3zD_XO9xVDKo-2JZs-QRRAsXeTypjwaKAGlYy4Tae0Kh1daIq890t2yLVhSGjMQWIVH9NXQchPQECTqT7mh9Ni6jfeOEZ6fdg52fAi6GZrWcriGrX1ldGx-JOWGRpQDyEkth3T_tdlIzFTOcsAYf7HmXiGNNBCTpdUyRmyT";

const BOARD = [
  {
    name: "Julian Vance",
    role: "President",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKdk7P23C-qT3buFh1npRT5Q7sneKSe2z87b0If5TZkjaLkuVXqEjfrqMSBKgf_I7nYm60sGiwlxHdHSGIJn4DZUkiZTSh8M1uc3zmz3auv3Rsg3YKcPVFOSntPfpC_n9TJ0zmn-NGJ0y2U1qWht7NoioAdyLfK6_f93siIfGWLCAhvX5Cf2OF50F6PF-qRSivVSovRvFrmlWfbtR1ilbrBAQzD79xnWU5kBl1U4P6mtpRtR9RlQecgOBAW0urvfgEjAn2dMhIcLvu",
    alt: "Professional portrait of male board president",
    bio: "A resident for 12 years and an urban planning consultant, Julian oversees long-term infrastructure projects and strategic partnerships.",
  },
  {
    name: "Helena Thorne",
    role: "Treasurer",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4lD_FA5qknv0-37ISGQmhPpn4Vq_H-qNeB9RDPvVzsMLyYVH2L81fYngdGlxpGuJH7Ys55PDDms_MbIGcGPfCwBNYUTVS_TS4t2m9upC4ocA6uEz0gM94soyadrsncs890cy_0GuzCiEV6Q2nfYGlO1qnafgPH89Us_oGI7YcnBdRPoChR_nbG9nZw2ecaW8-2yrITcFOFRfFDyvCCr5xfj50ZOp6IGEEbE0ZhCd9jsxkQ54h041hai66Ivv2mlq3spRH7qd0-RN2",
    alt: "Professional portrait of female treasurer",
    bio: "With a background in forensic accounting, Helena ensures our dues are utilized with maximum efficiency and complete fiscal transparency.",
  },
  {
    name: "Marcus Wu",
    role: "Secretary",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVW0CqGoyQhjoPGMj_MZDUCHQBqSvhMX_vsZPtrQRtoNIffHIn7ZvkFb4YK5maPnVioE6_p9WtENK1-JoBjwPTkhZfM-WR4NO6whMZbsOWvaH-9SKYP7fUr2bOqiR_BrbbXYjBDIprAEOJaC5mdWPbseVSBpWHaNoLTvIH_aWXK7kPRLk_j5I7QMu_ljlO6xSW4wyMR-DOLzGd10tTPxmbEQA6NdG_H8G1Cr9Xjn-ppocuBBjFvu4g_CJrWEtzOe-9ehf7NYZoQtsk",
    alt: "Professional portrait of secretary",
    bio: "Marcus bridges the gap between the board and residents, managing communications and the digital portal with precision.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="flex-grow">
      <section className="relative min-h-[614px] flex items-center overflow-hidden bg-primary-container">
        <div className="absolute inset-0 opacity-40">
          <Image
            alt="Luxury residential estate architecture and landscaping"
            className="object-cover"
            src={HERO_BG}
            fill
            sizes="100vw"
            priority
          />
        </div>
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
                alt="Modern neighborhood walkway with manicured trees"
                className="object-cover"
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
            <p className="text-on-surface-variant">
              From a historic orchard to the region&apos;s premier private
              residential enclave.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 md:min-h-[600px]">
            <div className="md:col-span-7 bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-end relative overflow-hidden group min-h-[320px]">
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Image
                  alt="Vintage photo of estate grounds"
                  className="object-cover"
                  src={HISTORY_BG}
                  fill
                  sizes="(min-width: 768px) 58vw, 100vw"
                />
              </div>
              <div className="relative z-10">
                <span className="text-secondary font-bold text-sm tracking-widest">
                  EST. 1984
                </span>
                <h3 className="text-3xl font-bold mt-2 mb-4">Founding Vision</h3>
                <p className="text-on-surface-variant max-w-md">
                  Originally established as the Grayson Orchard, the estate was
                  reimagined in the late 80s as a haven for architectural
                  experimentation, preserving 40% of the original flora.
                </p>
              </div>
            </div>
            <div className="md:col-span-5 grid grid-rows-2 gap-6">
              <div className="bg-primary p-8 rounded-xl text-white flex flex-col justify-center">
                <h3 className="text-4xl font-extrabold text-secondary-fixed mb-2">
                  250+
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
                    Updated in 2022 to include comprehensive renewable energy
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
                <h4 className="text-xl font-bold text-on-surface">{d.name}</h4>
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
    </main>
  );
}
