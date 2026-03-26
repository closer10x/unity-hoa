"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WordmarkLogo } from "./WordmarkLogo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
] as const;

function navLinkClass(active: boolean) {
  return active
    ? "text-cyan-800 dark:text-cyan-400 border-b-2 border-cyan-800 dark:border-cyan-400 pb-1 font-semibold"
    : "text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors";
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="docked full-width top-0 sticky z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
      <nav className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <WordmarkLogo
          href="/"
          variant="onLight"
          className="text-lg sm:text-xl font-bold"
        />
        <div className="hidden md:flex items-center gap-8">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} className={navLinkClass(active)} href={href}>
                {label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center bg-surface-container-high px-4 py-2 rounded-md">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">
              search
            </span>
            <input
              className="bg-transparent border-none text-sm focus:ring-0 p-0 text-on-surface-variant w-32 placeholder:text-on-surface-variant/70"
              placeholder="Search..."
              type="search"
              aria-label="Search site"
            />
          </div>
          <Link
            href="/payment"
            className="bg-secondary-fixed-dim text-on-secondary-fixed px-6 py-2.5 rounded-md font-semibold text-sm transition-all hover:opacity-90 shadow-sm"
          >
            Resident Portal
          </Link>
        </div>
      </nav>
    </header>
  );
}
