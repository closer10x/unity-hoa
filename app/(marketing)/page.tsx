import Image from "next/image";
import Link from "next/link";
import { MaintenanceRequestCard } from "@/components/marketing/maintenance-request-card";

const HERO_IMG = "/images/hero-neighborhood.png";

const NEWS = [
  {
    img: "https://assets.cdn.filesafe.space/UDLy42WzcIR1mhm3rtQu/media/698cd4137f6dcf15b62049f2.png",
    alt: "Sofi Lakes planned community and modern homes",
    date: "March 24, 2024",
    tag: "Community Update",
    title: "Spring Landscaping Initiative: Enhancing Our Common Spaces",
    excerpt:
      "The board has approved the new seasonal planting schedule focusing on drought-resistant native species...",
  },
  {
    img: "https://assets.cdn.filesafe.space/UDLy42WzcIR1mhm3rtQu/media/698cda8930ec4a3052391da1.png",
    alt: "Resort-style pool at Sofi Lakes",
    date: "March 18, 2024",
    tag: "Events",
    title: "Annual Resident Gala & Homeowner Meeting",
    excerpt:
      "Join us at the Great Hall for our annual celebration followed by the presentation of the 2024 budget...",
  },
  {
    img: "https://assets.cdn.filesafe.space/UDLy42WzcIR1mhm3rtQu/media/698ceec952c95201aa14551a.png",
    alt: "Play area for families at Sofi Lakes",
    date: "March 12, 2024",
    tag: "Safety",
    title: "New Security Enhancements for North Gate Access",
    excerpt:
      "In response to community feedback, we are implementing a new touchless entry system for all residents...",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="relative w-full min-h-[870px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            alt="Aerial view of the neighborhood at dusk, homes along a lake and tree-lined horizon"
            className="object-cover"
            src={HERO_IMG}
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full py-24">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-secondary/20 text-secondary-fixed-dim text-[11px] uppercase tracking-wider font-bold mb-6 rounded">
              Premier Living Experience
            </span>
            <p className="text-slate-200 text-lg mb-10 font-body max-w-lg leading-relaxed">
              Unity Grid Management modernizes HOA management with streamlined
              operations, transparent financials, and technology-driven systems
              that reduce board workload and improve community performance.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/services"
                className="inline-flex bg-gradient-to-br from-secondary to-secondary-fixed-dim text-on-secondary px-8 py-4 rounded-md font-bold transition-all hover:scale-[1.02]"
              >
                Explore Services
              </Link>
              <Link
                href="/services#governing"
                className="inline-flex bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-md font-bold hover:bg-white/20 transition-all"
              >
                Association Bylaws
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-secondary mb-2">
                Resident Services
              </p>
              <h2 className="text-4xl font-bold text-on-surface">
                Community Dashboard
              </h2>
            </div>
            <p className="max-w-md text-on-surface-variant font-body italic text-right">
              Access essential services and streamline your living experience
              with our digital management tools.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <Link
              href="/payment"
              aria-label="Pay assessments — make payment"
              className="md:col-span-2 lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform flex flex-col justify-between group no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
            >
              <div className="mb-12">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    payments
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Pay Assessments</h3>
                <p className="text-sm text-on-surface-variant">
                  Secure, easy online payments for your monthly dues and
                  community fees.
                </p>
              </div>
              <span className="text-secondary font-bold text-sm flex items-center">
                Make Payment{" "}
                <span className="material-symbols-outlined ml-2 text-sm">
                  arrow_forward
                </span>
              </span>
            </Link>
            <MaintenanceRequestCard />
            <div className="md:col-span-4 lg:col-span-2 bg-primary text-white p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full translate-x-16 -translate-y-16" />
              <div className="mb-12 relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                  <span
                    className="material-symbols-outlined text-secondary-fixed-dim"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    description
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Bylaws & Rules</h3>
                <p className="text-sm text-slate-300">
                  Browse and download official community guidelines and governing
                  documents.
                </p>
              </div>
              <Link
                href="/services#governing"
                className="text-secondary-fixed-dim font-bold text-sm flex items-center relative z-10"
              >
                View Library{" "}
                <span className="material-symbols-outlined ml-2 text-sm">
                  open_in_new
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between mb-16 flex-wrap gap-4">
            <h2 className="text-4xl font-bold">Latest Community News</h2>
            <Link
              href="/events"
              className="text-secondary font-bold text-sm flex items-center hover:translate-x-1 transition-transform"
            >
              Browse Archives{" "}
              <span className="material-symbols-outlined ml-1">chevron_right</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {NEWS.map((item) => (
              <article key={item.title} className="flex flex-col">
                <div className="aspect-[16/10] overflow-hidden rounded-xl mb-6 bg-surface-container relative">
                  <Image
                    alt={item.alt}
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    src={item.img}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                </div>
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <span className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                    {item.date}
                  </span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full" />
                  <span className="text-[11px] uppercase tracking-widest font-bold text-secondary">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 hover:text-secondary transition-colors cursor-pointer leading-tight">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  {item.excerpt}
                </p>
                <Link
                  href="/events"
                  className="mt-auto text-on-surface font-semibold text-sm underline underline-offset-4 decoration-secondary/30 hover:decoration-secondary"
                >
                  Read Story
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-container-highest">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Your Voice Matters.</h2>
              <p className="text-on-surface-variant text-lg mb-10 leading-relaxed">
                Unity Grid Management is governed by a dedicated board of
                residents committed to maintaining our community&apos;s beauty
                and value. Reach out with suggestions, questions, or concerns.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                  <span className="material-symbols-outlined text-secondary">
                    forum
                  </span>
                  <div>
                    <p className="text-sm font-bold">Monthly Board Meeting</p>
                    <p className="text-xs text-on-surface-variant">
                      Every 2nd Tuesday at 6:30 PM, Clubhouse Annex
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                  <span className="material-symbols-outlined text-secondary">
                    volunteer_activism
                  </span>
                  <div>
                    <p className="text-sm font-bold">Committee Opportunities</p>
                    <p className="text-xs text-on-surface-variant">
                      Join the Architectural or Social committees today.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary-container p-12 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-4">Contact the Board</h3>
              <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                Use the community contact form so your message reaches the
                management office and board liaisons with the right context.
              </p>
              <Link
                href="/contact"
                className="inline-flex w-full justify-center bg-secondary text-white font-bold py-4 rounded-md transition-all hover:bg-secondary/90"
              >
                Open contact form
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
