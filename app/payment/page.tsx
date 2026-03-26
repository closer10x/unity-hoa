import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { WordmarkLogo } from "@/components/site/WordmarkLogo";

export const metadata: Metadata = {
  title: {
    absolute: "Secure Payment | Unity HOA Management",
  },
};

const DECOR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAzdZBhRStWvIEXYjerRJko4D3K8SxsSjWkarzylW8IQ-SaM-sZ44SnOEE4mXImpRT71YZxos836KL3Gxw23atOr0Zc_h7TjP0P_wqtx0CzmztTOUTxFTo53njLLaGI9xyiF8FYjJLVb2lN1YRjwHL1Ebv8-K7Fo1R1CjWI25w9KutuIAC3hLc0egQnD4BJQe2p8rAx0fcWCUS5TSoEGx-hkoBYXsUPsy86XFYGoEZW7p85jEzovBbsb6LuhKsZvnMfVAk3Zc6k-18m";

function StripeMark() {
  return (
    <svg className="h-4 fill-current" viewBox="0 0 60 25" aria-hidden>
      <path d="M59.64 14.28c0-4.01-2.1-6.7-5.63-6.7-3.41 0-5.51 2.69-5.51 6.67 0 4.67 2.49 7.03 6.02 7.03 1.45 0 2.59-.31 3.42-.8v-2.31c-.77.41-1.8.63-2.73.63-1.63 0-2.83-.75-2.83-2.52h6.21c.01-.13.05-.62.05-1.03zm-7.27-1.46c0-1.12.56-1.89 1.64-1.89 1.07 0 1.63.77 1.63 1.89h-3.27zm-14.7-6.95h-2.83V20.8h2.83V5.87zm0-3.32h-2.83v2.31h2.83V2.55zm11.23 6.64c0-2.12-.91-3.32-2.7-3.32-1.35 0-2.17.65-2.61 1.25V5.87h-2.77V24.5l2.83-1.03v-4.9c.42.54 1.25 1.24 2.56 1.24 1.79 0 2.69-1.2 2.69-3.32v-7.28zm-2.83 7.42c0 1.05-.4 1.62-1.37 1.62-.75 0-1.29-.44-1.52-1.01V12.9c.23-.58.76-1.02 1.52-1.02.97 0 1.37.56 1.37 1.61v4.1zm-19.98-7.42c0-2.12-.91-3.32-2.71-3.32-1.35 0-2.17.65-2.61 1.25V5.87h-2.77V20.8h2.83v-7.9c.42.54 1.25 1.24 2.56 1.24 1.79 0 2.69-1.2 2.69-3.32v-7.28zm-2.83 7.42c0 1.05-.4 1.62-1.37 1.62-.75 0-1.29-.44-1.52-1.01V12.9c.23-.58.76-1.02 1.52-1.02.97 0 1.37.56 1.37 1.61v4.1zm-13.6-7.42c0-1.02-.75-1.51-2.03-1.51-1.13 0-2.17.38-3.02.83v2.67c.81-.46 1.7-.75 2.58-.75.48 0 .66.11.66.42 0 .3-.32.44-1.16.63-2.16.48-3.41 1.15-3.41 2.92 0 1.83 1.48 2.74 3.09 2.74 1.1 0 1.95-.41 2.47-1.12v.87h2.83V11.23zm-2.83 6.13c0 .5-.4.85-1.12.85-.56 0-1.01-.25-1.01-.84 0-.58.46-.8 1.4-.99.55-.1 1.14-.23 1.14-.49v1.47zM0 11.45c0-1.02.75-1.51 2.03-1.51 1.13 0 2.17.38 3.02.83v2.67c.81-.46 1.7-.75 2.58-.75.48 0 .66.11.66.42 0 .3-.32.44-1.16.63-2.16.48-3.41 1.15-3.41 2.92 0 1.83 1.48 2.74 3.09 2.74 1.1 0 1.95-.41 2.47-1.12v.87h2.83v-9.57c0-3.32-1.74-5.11-4.87-5.11-1.63 0-3.13.43-4.22 1.03V5.8c.81-.41 1.96-.65 3.19-.65 1.51 0 2.21.65 2.21 1.89v1.46c-.52-.31-1.26-.54-2.13-.54-1.79 0-2.91 1.01-2.91 2.44 0 1.34 1.05 2.01 2.4 2.01.8 0 1.55-.26 2.05-.62v.87H0v-1.2z" />
    </svg>
  );
}

export default function PaymentPage() {
  return (
    <>
      <header className="bg-[#f7f9ff]/80 backdrop-blur-md dark:bg-[#141b22]/80 docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(20,27,34,0.06)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <WordmarkLogo
              href="/"
              variant="onLight"
              className="text-sm sm:text-base font-bold"
            />
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-[#141b22] dark:text-[#f7f9ff] truncate">
              Unity HOA Management
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              className="text-[#44474b] dark:text-[#c5c6cb] hover:text-[#006973] transition-colors duration-300 font-semibold tracking-tight font-headline"
              href="/"
            >
              Dashboard
            </Link>
            <span className="text-[#44474b]/50 dark:text-[#c5c6cb]/50 font-headline font-semibold tracking-tight cursor-default">
              Properties
            </span>
            <Link
              className="text-[#44474b] dark:text-[#c5c6cb] hover:text-[#006973] transition-colors duration-300 font-headline font-semibold tracking-tight"
              href="/services#governing"
            >
              Documents
            </Link>
            <Link
              className="text-[#44474b] dark:text-[#c5c6cb] hover:text-[#006973] transition-colors duration-300 font-headline font-semibold tracking-tight"
              href="/events"
            >
              Community
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Notifications"
              className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all"
            >
              notifications
            </button>
            <button
              type="button"
              aria-label="Account"
              className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all"
            >
              account_circle
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-screen relative overflow-hidden pb-24 md:pb-12">
        <div className="absolute top-0 right-0 w-1/2 h-full -z-10 opacity-10 pointer-events-none hidden lg:block">
          <Image
            alt=""
            aria-hidden
            className="object-cover grayscale h-full w-full"
            src={DECOR}
            width={1200}
            height={1600}
          />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-4">
              <span className="text-secondary font-label text-[0.6875rem] uppercase tracking-widest font-bold">
                Secure Transactions
              </span>
              <h2 className="text-4xl sm:text-5xl font-headline font-extrabold text-primary leading-tight">
                Finalize Your
                <br />
                Association Dues
              </h2>
              <p className="text-on-surface-variant text-lg max-w-md">
                Complete your payment for the month of October. Your
                contribution maintains the standards of Unity HOA Management.
              </p>
            </div>

            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
              <div className="flex justify-between items-end pb-6 border-b border-outline-variant/20 gap-4 flex-wrap">
                <div className="space-y-1">
                  <span className="text-on-surface-variant font-label text-[0.6875rem] uppercase tracking-widest">
                    Monthly Dues
                  </span>
                  <p className="font-headline font-bold text-xl">Unit 402B - West Wing</p>
                </div>
                <span className="text-3xl font-headline font-bold text-primary">
                  $250.00
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-on-surface-variant">Transaction ID</span>
                  <span className="font-mono text-primary">#TEE-99201-X</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-on-surface-variant">Due Date</span>
                  <span className="text-primary">Oct 15, 2023</span>
                </div>
                <div className="bg-tertiary-fixed px-3 py-1 rounded-full inline-flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[14px] text-on-tertiary-fixed"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-tertiary-fixed">
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 text-on-surface-variant/60">
              <span className="material-symbols-outlined shrink-0">verified_user</span>
              <p className="text-xs italic">
                End-to-end encrypted processing via Stripe. Unity HOA Management
                does not store your full card details.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 w-full">
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_24px_rgba(20,27,34,0.06)] p-8 md:p-12">
              <div className="flex gap-4 mb-10 flex-col sm:flex-row">
                <button
                  type="button"
                  className="flex-1 py-4 px-6 rounded-lg bg-primary text-white font-headline font-semibold flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined">credit_card</span>
                  Credit Card
                </button>
                <button
                  type="button"
                  className="flex-1 py-4 px-6 rounded-lg bg-surface-container-high text-on-surface-variant font-headline font-semibold flex items-center justify-center gap-3 hover:bg-surface-container transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined">account_balance</span>
                  ACH Transfer
                </button>
              </div>

              <form className="space-y-8" action="#" method="post">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                        Cardholder Name
                      </label>
                      <input
                        className="w-full bg-surface-container-high border-none rounded-md px-4 py-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all outline-none"
                        placeholder="ALEXANDRA STERLING"
                        type="text"
                        name="cardName"
                        autoComplete="cc-name"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                        Card Number
                      </label>
                      <input
                        className="w-full bg-surface-container-high border-none rounded-md px-4 py-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all outline-none"
                        placeholder="•••• •••• •••• ••••"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        name="cardNumber"
                      />
                      <div className="absolute right-4 top-10 flex gap-2 pointer-events-none">
                        <div className="w-8 h-5 bg-on-surface-variant/10 rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold">VISA</span>
                        </div>
                        <div className="w-8 h-5 bg-on-surface-variant/10 rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold">MC</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                        Expiry Date
                      </label>
                      <input
                        className="w-full bg-surface-container-high border-none rounded-md px-4 py-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all outline-none"
                        placeholder="MM / YY"
                        autoComplete="cc-exp"
                        name="expiry"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                        CVC
                      </label>
                      <input
                        className="w-full bg-surface-container-high border-none rounded-md px-4 py-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all outline-none"
                        placeholder="123"
                        autoComplete="cc-csc"
                        name="cvc"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                        ZIP Code
                      </label>
                      <input
                        className="w-full bg-surface-container-high border-none rounded-md px-4 py-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all outline-none"
                        placeholder="90210"
                        autoComplete="postal-code"
                        name="zip"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-6">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary to-secondary-fixed-dim text-white font-headline font-bold py-5 rounded-md shadow-lg shadow-secondary/20 hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    Pay $250.00
                  </button>
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-2 grayscale opacity-40">
                      <span className="text-[10px] font-bold tracking-widest uppercase">
                        Powered by
                      </span>
                      <StripeMark />
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
                        lock
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
                        shield
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
                        payment_card
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-primary-container text-on-primary-container py-12">
        <div className="max-w-screen-2xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <WordmarkLogo
              href="/"
              variant="onDark"
              className="text-sm font-bold opacity-90"
            />
            <div className="flex gap-8 text-[0.6875rem] font-bold uppercase tracking-widest flex-wrap justify-center">
              <a className="hover:text-white transition-colors" href="#">
                Privacy Policy
              </a>
              <a className="hover:text-white transition-colors" href="#">
                Terms of Service
              </a>
              <a className="hover:text-white transition-colors" href="#">
                Help Center
              </a>
            </div>
            <p className="text-[0.6875rem] font-medium opacity-50 text-center md:text-right">
              © {new Date().getFullYear()} Unity HOA Management. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-6 pb-8 pt-4 bg-[#ffffff]/90 backdrop-blur-lg dark:bg-[#1c2228]/95 z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <Link
          className="flex flex-col items-center justify-center text-[#44474b] dark:text-[#c5c6cb] opacity-60"
          href="/"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-medium uppercase tracking-widest mt-1">
            Home
          </span>
        </Link>
        <span className="flex flex-col items-center justify-center bg-[#006973] text-white rounded-2xl px-5 py-2">
          <span className="material-symbols-outlined">payments</span>
          <span className="text-[10px] font-medium uppercase tracking-widest mt-1">
            Payments
          </span>
        </span>
        <Link
          className="flex flex-col items-center justify-center text-[#44474b] dark:text-[#c5c6cb] opacity-60"
          href="/events"
        >
          <span className="material-symbols-outlined">domain</span>
          <span className="text-[10px] font-medium uppercase tracking-widest mt-1">
            Amenity
          </span>
        </Link>
        <Link
          className="flex flex-col items-center justify-center text-[#44474b] dark:text-[#c5c6cb] opacity-60"
          href="/contact"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-medium uppercase tracking-widest mt-1">
            Profile
          </span>
        </Link>
      </nav>
    </>
  );
}
