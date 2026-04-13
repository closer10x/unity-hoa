import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatNextDuesFirstOfMonthLong } from "@/lib/format/next-dues-cycle";
import { MAINTENANCE_REQUEST_PUBLIC_HREF } from "@/lib/maintenance-request/options";

export const metadata: Metadata = {
  title: "Resident Services Hub",
};

const PAY_CARD_TEXTURE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD-2jhNr2NgGolsRPCkVR2LhJk9vMJ1zmUvwIaP0SZJhhg2Gt2_R5Kb3ytiZQUKE_pDVYbgS2mQxKsmETxGqekORizOoAuBf-sncJ4jrluJFCHF4hE_CSKsHJ_L7GhfVVF-DUSBVqzHGkv9HW34xBOylpMAL4iIMhcwD5Q5NUP8lP526LCwq6gQ8GxqlBv2pKRYCvbPma6_9nXXZzL9kPC-UbV8DeV-tNfE1XnkzzaRcmU-xdSxjUVvTt822l5M-FtdxGREjIpwlvNL";

/** Set to true to show the Community Directory card again. */
const SHOW_COMMUNITY_DIRECTORY_CARD = false;

export default function ServicesPage() {
  return (
    <main className="max-w-7xl mx-auto px-8 py-20">
      <section className="mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <span className="font-label text-sm uppercase tracking-[0.15em] text-secondary font-bold mb-4 block">
              Resident Hub
            </span>
            <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-primary leading-tight mb-6">
              Seamless living, <br />
              curated for you.
            </h1>
            <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
              Access essential community services, manage your account, and
              stay connected with the pulse of Unity Grid Management. Your
              concierge digital dashboard.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <div className="bg-surface-container-low p-8 rounded-xl w-full lg:max-w-sm">
              <div className="flex items-center gap-4 mb-4">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_balance_wallet
                </span>
                <span className="font-label text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Next Dues Cycle
                </span>
              </div>
              <h3
                className="font-headline text-2xl font-bold text-primary"
                suppressHydrationWarning
              >
                {formatNextDuesFirstOfMonthLong()}
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary-container p-10 rounded-xl relative overflow-hidden group text-white">
          <div className="relative z-10 h-full flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-8 backdrop-blur-md">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
              </div>
              <h2 className="font-headline text-3xl font-bold mb-4">
                Pay My Dues
              </h2>
              <p className="text-white/70 max-w-md mb-8">
                Securely manage your HOA assessments through our integrated
                payment portal. Supports one-time and recurring payments.
              </p>
            </div>
            <div>
              <Link
                href="/payment"
                className="inline-flex bg-secondary text-white px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-all items-center gap-3"
              >
                Launch Payment Portal
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-secondary/20 blur-3xl group-hover:bg-secondary/30 transition-all duration-500 pointer-events-none" />
          <Image
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay pointer-events-none"
            src={PAY_CARD_TEXTURE}
            fill
            priority
            sizes="(min-width: 1024px) 66vw, 100vw"
          />
        </div>

        <div
          id="maintenance"
          className="scroll-mt-28 bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300"
        >
          <div>
            <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-8">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                handyman
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-primary mb-3">
              Maintenance Request
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              Report issues with common areas or request specialized community
              maintenance services.
            </p>
          </div>
          <Link
            href={MAINTENANCE_REQUEST_PUBLIC_HREF}
            className="text-secondary font-bold text-sm inline-flex items-center gap-2 group"
          >
            Submit a Request
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              east
            </span>
          </Link>
        </div>

        <div
          id="governing"
          className="scroll-mt-28 bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300"
        >
          <div>
            <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-8">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                gavel
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-primary mb-3">
              Governing Documents
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              Access the Bylaws, Covenants (CC&amp;Rs), and Community Rules that
              shape our estate.
            </p>
          </div>
          <a
            className="text-secondary font-bold text-sm inline-flex items-center gap-2 group"
            href="#"
          >
            View Bylaws
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              east
            </span>
          </a>
        </div>

        {SHOW_COMMUNITY_DIRECTORY_CARD ? (
          <div className="bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300">
            <div>
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-8">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  groups
                </span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-primary mb-3">
                Community Directory
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                Connect with your neighbors and HOA board members through our
                private directory.
              </p>
            </div>
            <Link
              href="/contact"
              className="text-secondary font-bold text-sm inline-flex items-center gap-2 group"
            >
              Explore Directory
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                east
              </span>
            </Link>
          </div>
        ) : null}

        <div className="bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300">
          <div>
            <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-8">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                description
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-primary mb-3">
              Find a Form
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              Download architectural review forms, parking permits, and event
              registration sheets.
            </p>
          </div>
          <a
            className="text-secondary font-bold text-sm inline-flex items-center gap-2 group"
            href="#"
          >
            Document Library
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              east
            </span>
          </a>
        </div>
      </section>

      <section className="text-center py-20 border-t border-outline-variant/20">
        <h2 className="font-headline text-3xl font-bold text-primary mb-4">
          Need further assistance?
        </h2>
        <p className="text-on-surface-variant mb-10 max-w-2xl mx-auto">
          Our management office is available Monday through Friday, 9:00 AM to
          5:00 PM for personalized support.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="bg-primary text-white px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-all"
          >
            Contact Management
          </Link>
          <Link
            href="/contact#emergency"
            className="text-secondary px-8 py-3 rounded-md font-bold text-sm border border-secondary/20 hover:bg-secondary/5 transition-all"
          >
            Emergency Contacts
          </Link>
        </div>
      </section>
    </main>
  );
}
