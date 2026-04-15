import Link from "next/link";

import { MAINTENANCE_REQUEST_PUBLIC_HREF } from "@/lib/maintenance-request/options";
import { WordmarkLogo } from "./WordmarkLogo";

export function SiteFooter() {
  return (
    <footer className="full-width mt-auto bg-slate-100 dark:bg-slate-950">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 w-full px-8 py-16 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1">
          <div className="mb-6">
            <WordmarkLogo href="/" variant="onLight" className="text-xl font-bold" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
            Unity Grid Management coordinates premier homeowners associations
            dedicated to a secure, beautiful living environment for all
            residents.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-cyan-900 dark:text-cyan-500">
            Quick Navigation
          </h4>
          <ul className="space-y-2">
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/about"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/services"
              >
                Services
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/governance"
              >
                Governance
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/events"
              >
                Events
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-cyan-900 dark:text-cyan-500">
            Resident Resources
          </h4>
          <ul className="space-y-2">
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/payment"
              >
                Payment Portal
              </Link>
            </li>
            <li>
              <a
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="#"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/governance"
              >
                Bylaws
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href={MAINTENANCE_REQUEST_PUBLIC_HREF}
              >
                Maintenance Request
              </Link>
            </li>
            <li>
              <Link
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1 transition-transform duration-200 block"
                href="/contact#emergency"
              >
                Emergency Contacts
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-cyan-900 dark:text-cyan-500">
            Connect
          </h4>
          <div className="flex gap-4 mb-4">
            <a
              className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-full hover:bg-secondary hover:text-white transition-all"
              href="#"
              aria-label="Social share"
            >
              <span className="material-symbols-outlined text-lg">share</span>
            </a>
            <a
              className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-full hover:bg-secondary hover:text-white transition-all"
              href="mailto:info@sofilakes.com"
              aria-label="Email"
            >
              <span className="material-symbols-outlined text-lg">
                alternate_email
              </span>
            </a>
            <a
              className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-full hover:bg-secondary hover:text-white transition-all"
              href="/contact"
              aria-label="Website"
            >
              <span className="material-symbols-outlined text-lg">public</span>
            </a>
          </div>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Unity Grid Management
            </p>
            <p className="leading-relaxed">
              7880 Morrison Road
              <br />
              Katy, Texas 77493
            </p>
            <p>
              <a
                href="tel:7132083539"
                className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                713-208-3539
              </a>
            </p>
            <p>
              <a
                href="mailto:info@sofilakes.com"
                className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                info@sofilakes.com
              </a>
            </p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-lg">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Office Hours
            </p>
            <p className="text-xs text-on-surface-variant font-medium">
              Mon-Fri: 9AM - 5PM
            </p>
            <p className="text-xs text-on-surface-variant font-medium">
              Sat-Sun: Closed
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 w-full px-8 py-8 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p
          className="text-xs text-slate-500 dark:text-slate-400"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} Unity Grid Management. All rights
          reserved.
        </p>
        <div className="flex gap-6">
          <Link
            className="text-[10px] uppercase font-bold text-slate-400 hover:text-secondary transition-colors"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="text-[10px] uppercase font-bold text-slate-400 hover:text-secondary transition-colors"
            href="#"
          >
            Accessibility
          </Link>
          <Link
            className="text-[10px] uppercase font-bold text-slate-400 hover:text-secondary transition-colors"
            href="/admin"
          >
            Admin login
          </Link>
        </div>
      </div>
    </footer>
  );
}
