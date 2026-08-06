import Link from "next/link";

const COLUMNS = [
  {
    heading: "Residents",
    links: [
      { href: "/payment", label: "Pay HOA fees" },
      { href: "/admin/login", label: "Resident sign in" },
    ],
  },
  {
    heading: "Association",
    links: [
      { href: "/admin/login", label: "Governing documents" },
      { href: "/admin/login", label: "Board & committees" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "mailto:info@unitygridmanagement.com", label: "Contact" },
      { href: "tel:7132083539", label: "713-208-3539" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-shell px-4 pt-10 pb-8 text-on-shell sm:px-6 md:px-8 md:pt-[72px]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-8 md:gap-14">
        <div className="min-w-0 max-w-[380px] flex-[1_1_300px]">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <span
              aria-hidden
              className="inline-block size-[11px] shrink-0 rounded-[2px] bg-shell-mark"
            />
            <span className="text-[17px] font-semibold text-on-shell-bright">
              Unity Grid Management
            </span>
          </div>
          <p className="mb-5 text-[15px] leading-relaxed text-on-shell-variant text-pretty">
            Day-to-day management for homeowners associations across greater
            Houston.
          </p>
          <div className="grid gap-[7px] text-[15px] leading-snug">
            <span>7880 Morrison Road, Katy, Texas 77493</span>
            <span>
              <a href="tel:7132083539" className="text-shell-accent hover:underline">
                713-208-3539
              </a>
            </span>
            <span>
              <a
                href="mailto:info@unitygridmanagement.com"
                className="text-shell-accent hover:underline"
              >
                info@unitygridmanagement.com
              </a>
            </span>
            <span className="text-on-shell-variant">Mon–Fri, 9AM–5PM</span>
          </div>
        </div>

        <div className="grid min-w-0 flex-[2_1_420px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-8">
          {COLUMNS.map((col) => (
            <div key={col.heading} className="grid content-start gap-1.5">
              <p className="mb-3.5 font-label text-[11px] uppercase tracking-[0.12em] text-on-shell-variant">
                {col.heading}
              </p>
              {col.links.map((link) => (
                <Link
                  key={`${col.heading}-${link.label}`}
                  href={link.href}
                  className="py-3 text-[15px] leading-tight text-on-shell transition-colors hover:text-on-shell-bright"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1200px] flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-t border-shell-outline pt-[22px] text-[13px] leading-normal text-on-shell-variant md:mt-12">
        <span>© 2026 Unity Grid Management. All rights reserved.</span>
        <span className="flex flex-wrap gap-5">
          <span>Terms of service</span>
          <span>Accessibility</span>
        </span>
      </div>
    </footer>
  );
}
