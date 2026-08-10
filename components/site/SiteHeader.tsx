"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/services", label: "Services", mark: "01" },
  { href: "/governance", label: "Governance", mark: "02" },
  { href: "/events", label: "Events", mark: "03" },
  { href: "/about", label: "About", mark: "04" },
  { href: "/contact", label: "Contact", mark: "05" },
] as const;

function isNavActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  return (
    /* Frosted: the page shows through as it scrolls under. The opaque
       background stays for anything without backdrop-filter, so the nav is
       never unreadable text floating over photography. */
    <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface px-4 py-4 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-surface/65 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-6">
        <Link href="/" className="flex flex-none items-center">
          <img
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            className="block h-8 w-auto"
          />
        </Link>

        <nav className="hidden min-w-0 flex-auto flex-wrap items-center justify-center gap-x-6 gap-y-3.5 text-[15px] md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isNavActive(href, pathname) ? "page" : undefined}
              className={
                isNavActive(href, pathname)
                  ? "text-secondary underline decoration-1 underline-offset-[6px]"
                  : "text-on-surface-variant transition-colors hover:text-secondary"
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-none items-center gap-3.5 md:flex">
          <Link
            href="/portal/login"
            className="whitespace-nowrap text-[15px] text-on-surface-variant hover:text-on-surface"
          >
            Sign in
          </Link>
          <Link
            href="/portal"
            className="whitespace-nowrap rounded-full bg-secondary px-5 py-2.5 text-[15px] font-medium text-on-secondary hover:bg-secondary-hover"
          >
            Resident portal
          </Link>
        </div>

        <button
          type="button"
          id="site-mobile-menu-button"
          /* min-h-11 = 44px: the handoff's floor for primary controls. */
          className="min-h-11 rounded-xl border border-outline-strong px-4 font-label text-xs uppercase tracking-[0.1em] text-on-surface transition-colors hover:border-outline md:hidden"
          aria-expanded={navOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? "Close" : "Menu"}
        </button>
      </div>

      {navOpen ? (
        <div
          id="site-mobile-nav"
          className="mx-auto mt-4 grid max-h-[66vh] max-w-[1200px] gap-1 overflow-y-auto rounded-[14px] md:hidden"
        >
          <span className="mb-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-outline">
            Pages
          </span>
          {NAV.map(({ href, label, mark }, i) => {
            const active = isNavActive(href, pathname);
            return (
              <Link
                key={href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={() => setNavOpen(false)}
                className={`flex min-h-11 items-baseline justify-between gap-4 rounded-[9px] px-2.5 py-3 text-base ${
                  active
                    ? "bg-secondary-container font-semibold text-on-secondary-container"
                    : "text-on-surface hover:bg-row-hover"
                }`}
              >
                {label}
                <span className="font-label text-[11px] text-secondary-muted">
                  {active ? "viewing" : mark}
                </span>
              </Link>
            );
          })}

          <span className="mt-4 mb-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-outline">
            Your account
          </span>
          <Link
            href="/portal/login"
            onClick={() => setNavOpen(false)}
            className="min-h-11 rounded-[9px] px-2.5 py-3 text-base text-on-surface hover:bg-surface-container-high"
          >
            Sign in
          </Link>
          <Link
            href="/payment"
            onClick={() => setNavOpen(false)}
            className="min-h-11 rounded-[9px] bg-secondary px-2.5 py-3 text-center text-base font-medium text-on-secondary hover:bg-secondary-hover"
          >
            Pay your HOA fee
          </Link>
          <Link
            href="/contact"
            onClick={() => setNavOpen(false)}
            className="min-h-11 rounded-[9px] border border-outline-strong px-2.5 py-3 text-center text-base text-on-surface hover:border-outline"
          >
            File a maintenance request
          </Link>
        </div>
      ) : null}
    </header>
  );
}
