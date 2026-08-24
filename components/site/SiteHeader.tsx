"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/governance", label: "Governance" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-paper/65">
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center gap-6 px-6 md:gap-11 md:px-11">
        <Link href="/" className="shrink-0">
          <Image
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            width={300}
            height={60}
            priority
            className="h-[30px] w-auto"
          />
        </Link>

        <nav className="hidden gap-7 text-[15px] font-medium md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "border-b-2 border-moss pb-[3px] font-semibold text-ink"
                    : "text-body transition-colors hover:text-ink"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <Link
            href="/portal/login"
            className="hidden text-[15px] font-medium text-body hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/portal"
            className="rounded-md bg-ink px-5 py-[11px] text-[15px] font-semibold text-white transition-colors hover:bg-moss"
          >
            Resident portal
          </Link>
        </div>
      </div>
    </header>
  );
}
