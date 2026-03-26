import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resident Services Hub",
};

const PAY_CARD_TEXTURE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD-2jhNr2NgGolsRPCkVR2LhJk9vMJ1zmUvwIaP0SZJhhg2Gt2_R5Kb3ytiZQUKE_pDVYbgS2mQxKsmETxGqekORizOoAuBf-sncJ4jrluJFCHF4hE_CSKsHJ_L7GhfVVF-DUSBVqzHGkv9HW34xBOylpMAL4iIMhcwD5Q5NUP8lP526LCwq6gQ8GxqlBv2pKRYCvbPma6_9nXXZzL9kPC-UbV8DeV-tNfE1XnkzzaRcmU-xdSxjUVvTt822l5M-FtdxGREjIpwlvNL";

const MAP_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD_-nw5VETzhjzHIpZTM2XwU0CkORbBATkxEf7oOVFgXefY8RqMjDKMOQwV9kEFUzT9yZUbCMiCxLrC2kXSh2uAoSvZdLSuKoDDnBDmZfgx0T4852xIKE9JOBylGPTCg2GxuLbBGNlnLTNuk_C3-RrrYFwjUTq9yp5a1RTXyxu0oecOUJFHNco8ZaGVQJxs4ZMX2UWJBn7xKDCMLtljvbFUZkhBDOmEPYgdQgjw5ZFxtcP43Q9rtST-lWB2MEfgMoFwADgXEAG-8vgl";

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
              <h3 className="font-headline text-2xl font-bold text-primary mb-2">
                October 1st, 2024
              </h3>
              <div className="bg-tertiary-fixed px-3 py-1 rounded-full inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-fixed" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-tertiary-fixed">
                  Status: Paid
                </span>
              </div>
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
            href="/contact"
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

      <section
        id="map"
        className="scroll-mt-28 bg-surface-container-low rounded-2xl p-12 mb-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline text-3xl font-bold text-primary mb-6">
              Community Map
            </h2>
            <p className="text-on-surface-variant mb-8 leading-relaxed">
              Navigate our grounds with ease. Locate visitor parking, recreation
              facilities, and utility access points throughout the 40-acre
              estate.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-lg">
                <span className="material-symbols-outlined text-secondary">
                  local_parking
                </span>
                <span className="text-sm font-medium text-primary">
                  Guest Parking Zones
                </span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-lg">
                <span className="material-symbols-outlined text-secondary">
                  pool
                </span>
                <span className="text-sm font-medium text-primary">
                  Wellness &amp; Pool Center
                </span>
              </div>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-video lg:aspect-square bg-surface-container-highest rounded-xl overflow-hidden shadow-2xl shadow-primary/5 min-h-[280px]">
            <Image
              alt="Minimalist architectural site plan of an estate"
              className="object-cover grayscale contrast-125 opacity-80"
              src={MAP_IMG}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                className="bg-white text-primary px-6 py-3 rounded-full font-bold text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span className="material-symbols-outlined">zoom_in</span>
                Interact with Map
              </button>
            </div>
          </div>
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
