import type { Metadata } from "next";
import Image from "next/image";

import { OfficeStatusBanner } from "@/components/marketing/office-status-banner";

export const metadata: Metadata = {
  title: "Contact Us",
};

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ4zyerDUmuUG7PtP-JsVBj_r_Y-lUm5M1X8sD3OvjRGQz4PG-9953S4aw76kpTyhflFUg-Nil890a4FFo3MPoNSwLDNq7_maPsQxotL4F6gg3GUG_9pSsStTV0pRMpK4ymUohXkQBV9Id1W5-PrwFTgb7uADJneNn7eyx9eAjwumV5SXTVXnyaVOP4TsjUFPQZQls45etzR2kfb2qd_STnEs9NEQdENpeJ3rH0MDXoQNagQGFLu5Mp7mSSWKx4LWwuRj-ruSR_Cw3";

const MAP_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC155NwZUBQJG_CxxM4neBupl8WmR1VMCISfTZ5G2kvnhmvY5bDuvUh09b-NlaMgolDtiJ1qBGN8dga-GTojAZvnikoW8rPVbMVrZ_omXX6BvH4uuwvS4r-h1Y_xrvveEXIL1Bek1-vAeNNk3YPT-jAJ-BKkx9L0noSttg0GwkLAgEGjSq5GMkSruQsHHilXvDWqXE_Mv3MKoDn5yZrTGFhVevE5N7-oqwIF6hN740iJFJ--nXT8-ZHgX105CNG1MbRB6ITuS79VYEv";

export default function ContactPage() {
  return (
    <main className="flex-grow">
      <section className="relative py-24 bg-gradient-to-br from-primary to-primary-container overflow-hidden min-h-[420px] flex items-center">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
        />
        <div className="relative max-w-7xl mx-auto px-8 w-full">
          <span className="text-secondary-fixed font-bold tracking-[0.2em] text-[11px] uppercase mb-4 block">
            Get In Touch
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-on-primary tracking-tight max-w-3xl leading-[1.1]">
            The concierge for your community lifestyle.
          </h1>
          <p className="text-on-primary-container text-lg mt-8 max-w-xl">
            Whether you are a long-standing resident or considering joining our
            enclave, our management team is here to assist with every detail.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 -mt-20 relative z-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-10 shadow-sm">
            <h2 className="text-2xl font-bold mb-8 text-on-surface">
              Send an Inquiry
            </h2>
            <form className="space-y-6" action="#" method="post">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Full Name
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-1 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                    placeholder="Johnathan Doe"
                    type="text"
                    name="name"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Email Address
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-1 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                    placeholder="j.doe@example.com"
                    type="email"
                    name="email"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Inquiry Type
                </label>
                <select
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-1 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                  name="type"
                  defaultValue="general"
                >
                  <option value="general">General Inquiry</option>
                  <option value="maintenance">Maintenance Request</option>
                  <option value="prospect">Prospective Resident</option>
                  <option value="event">Event Planning</option>
                  <option value="billing">Billing &amp; Dues</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Message
                </label>
                <textarea
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-1 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                  placeholder="How can we assist you today?"
                  rows={5}
                  name="message"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-secondary-fixed-dim text-on-secondary py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all"
              >
                Submit Inquiry
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-low p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-6 text-on-surface">
                Management Office
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 p-2 rounded-md shrink-0">
                    <span className="material-symbols-outlined text-secondary">
                      location_on
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      Unity Grid Management Office
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      7880 Morrison Road
                      <br />
                      Katy, Texas 77493
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 p-2 rounded-md shrink-0">
                    <span className="material-symbols-outlined text-secondary">
                      call
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Phone</p>
                    <p className="text-sm text-on-surface-variant">
                      713-208-3539
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 p-2 rounded-md shrink-0">
                    <span className="material-symbols-outlined text-secondary">
                      mail
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Email</p>
                    <p className="text-sm text-on-surface-variant">
                      info@sofilakes.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <OfficeStatusBanner />

            <div
              id="emergency"
              className="scroll-mt-28 bg-primary p-8 rounded-xl text-on-primary"
            >
              <span className="material-symbols-outlined text-secondary-fixed mb-4">
                emergency_home
              </span>
              <h3 className="text-lg font-bold mb-2">After-Hours Emergency</h3>
              <p className="text-sm text-on-primary-container mb-4">
                For immediate maintenance emergencies after 6:00 PM or on
                weekends.
              </p>
              <a
                className="text-secondary-fixed font-bold text-xl hover:underline"
                href="tel:7132083539"
              >
                713-208-3539
              </a>
            </div>
          </div>

          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 bg-surface-container-highest rounded-xl overflow-hidden min-h-[500px]">
            <div className="md:col-span-1 p-10 flex flex-col justify-center bg-surface-container-low">
              <h2 className="text-3xl font-bold mb-6 text-on-surface">
                Find Your Way
              </h2>
              <div className="space-y-8">
                <div>
                  <h4 className="text-secondary font-bold text-sm uppercase tracking-tighter mb-2">
                    For Residents
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    Use the East Gate entrance off Heritage Parkway for quick
                    access to the community center and pool facilities.
                  </p>
                </div>
                <div>
                  <h4 className="text-secondary font-bold text-sm uppercase tracking-tighter mb-2">
                    For Prospective Buyers
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    All tours begin at the Welcome Pavilion. Please enter via
                    the North Gate and follow signs for Guest Parking.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 text-on-surface font-bold text-sm group"
                >
                  <span className="material-symbols-outlined text-secondary">
                    directions
                  </span>
                  Get Detailed Directions
                  <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
            <div className="md:col-span-2 relative min-h-[400px]">
              <div className="absolute inset-0 bg-slate-200">
                <Image
                  alt="Map view of luxury residential development"
                  className="object-cover grayscale opacity-80"
                  src={MAP_IMG}
                  fill
                  sizes="(min-width: 768px) 60vw, 100vw"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-primary text-on-primary px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border-2 border-secondary">
                    <span className="material-symbols-outlined text-secondary-fixed">
                      location_on
                    </span>
                    <span className="text-sm font-bold">Unity Grid Management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
