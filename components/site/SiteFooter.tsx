import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-[90px] border-t border-line bg-white pt-[60px]">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-14 md:px-11">
        <div>
          <Image
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            width={300}
            height={60}
            className="mb-4 h-[30px] w-auto"
          />
          <div className="text-[15px] leading-[1.9] text-body">
            7880 Morrison Road, Katy, Texas 77493
            <br />
            <a href="tel:7132083539" className="text-moss hover:text-ink">
              713-208-3539
            </a>
            <br />
            <a
              href="mailto:info@unitygridmanagement.com"
              className="text-moss hover:text-ink"
            >
              info@unitygridmanagement.com
            </a>
            <br />
            <span className="text-faint">Mon–Fri, 9AM–5PM</span>
          </div>
        </div>

        <FooterCol
          title="Residents"
          links={[
            { href: "/portal", label: "Pay HOA fees" },
            { href: "/portal/login", label: "Resident sign in" },
          ]}
        />
        <FooterCol
          title="Association"
          links={[
            { href: "/governance", label: "Governing documents" },
            { href: "/about", label: "Board & committees" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: "/contact", label: "Contact" },
            { href: "/events", label: "Events" },
          ]}
        />
      </div>

      <div className="mx-auto mt-12 max-w-[1320px] border-t border-line px-6 pt-[22px] pb-[30px] text-sm text-faint md:px-11">
        © 2026 Unity Grid Management. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="mb-4 text-[13px] font-bold tracking-[0.06em] text-faint uppercase">
        {title}
      </div>
      <div className="grid gap-[10px] text-[15px]">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="text-body hover:text-ink">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
