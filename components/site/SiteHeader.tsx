"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

function isNavActive(href: string, pathname: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      firstLinkRef.current?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="relative docked full-width top-0 sticky z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
        <nav className="flex justify-between items-center w-full px-4 sm:px-8 py-4 max-w-7xl mx-auto gap-2 sm:gap-4">
          <div className="min-w-0 shrink">
            <WordmarkLogo
              href="/"
              variant="onLight"
              className="text-base sm:text-xl font-bold"
            />
          </div>
          <div className="hidden md:flex items-center gap-8 shrink-0">
            {NAV.map(({ href, label }) => {
              const active = isNavActive(href, pathname);
              return (
                <Link key={href} className={navLinkClass(active)} href={href}>
                  {label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 shrink-0">
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
              className="bg-secondary-fixed-dim text-on-secondary-fixed px-3 py-2.5 sm:px-6 rounded-md font-semibold text-sm transition-all hover:opacity-90 shadow-sm whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">Portal</span>
              <span className="hidden sm:inline">Resident Portal</span>
            </Link>
            <button
              type="button"
              id="site-mobile-menu-button"
              className="md:hidden shrink-0 inline-flex items-center justify-center size-10 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              aria-expanded={menuOpen}
              aria-controls="site-mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden>
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div
            id="site-mobile-nav"
            className="md:hidden absolute left-0 right-0 top-full border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg"
            role="navigation"
            aria-label="Mobile"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col gap-4">
              <div className="flex items-center bg-surface-container-high px-4 py-2 rounded-md">
                <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2 shrink-0">
                  search
                </span>
                <input
                  className="bg-transparent border-none text-sm focus:ring-0 p-0 text-on-surface-variant w-full min-w-0 placeholder:text-on-surface-variant/70"
                  placeholder="Search..."
                  type="search"
                  aria-label="Search site"
                />
              </div>
              <ul className="flex flex-col gap-1">
                {NAV.map(({ href, label }, i) => {
                  const active = isNavActive(href, pathname);
                  return (
                    <li key={href}>
                      <Link
                        ref={i === 0 ? firstLinkRef : undefined}
                        href={href}
                        className={`block py-3 px-1 text-base border-b border-transparent ${navLinkClass(active)}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </header>

      {menuOpen ? (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/50"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </>
  );
}
