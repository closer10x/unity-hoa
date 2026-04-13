import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getPublicDuesDisplay } from "@/app/admin/(dashboard)/hoa/actions";
import {
  PaymentCheckoutForm,
  type PaymentCheckoutDefaults,
} from "@/components/payment/PaymentCheckoutForm";
import { PaymentBillingSummary } from "@/components/payment/payment-billing-summary";
import { WordmarkLogo } from "@/components/site/WordmarkLogo";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export const metadata: Metadata = {
  title: {
    absolute: "Secure Payment | Unity HOA Management",
  },
};

const DECOR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAzdZBhRStWvIEXYjerRJko4D3K8SxsSjWkarzylW8IQ-SaM-sZ44SnOEE4mXImpRT71YZxos836KL3Gxw23atOr0Zc_h7TjP0P_wqtx0CzmztTOUTxFTo53njLLaGI9xyiF8FYjJLVb2lN1YRjwHL1Ebv8-K7Fo1R1CjWI25w9KutuIAC3hLc0egQnD4BJQe2p8rAx0fcWCUS5TSoEGx-hkoBYXsUPsy86XFYGoEZW7p85jEzovBbsb6LuhKsZvnMfVAk3Zc6k-18m";

type PageProps = {
  searchParams?: Promise<{ canceled?: string }>;
};

function splitDisplayName(displayName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (typeof displayName !== "string") {
    return { firstName: "", lastName: "" };
  }
  const t = displayName.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default async function PaymentPage({ searchParams }: PageProps) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const canceled = sp?.canceled === "1";

  let checkoutDefaults: PaymentCheckoutDefaults = {};
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("unit_lot, display_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        const names = splitDisplayName(profile?.display_name);
        const unitRaw = profile?.unit_lot;
        const unitNumber =
          typeof unitRaw === "string" && unitRaw.trim().length > 0
            ? unitRaw.trim()
            : undefined;
        const phoneRaw = profile?.phone;
        const phone =
          typeof phoneRaw === "string" && phoneRaw.trim().length > 0
            ? phoneRaw.trim()
            : undefined;
        checkoutDefaults = {
          firstName: names.firstName,
          lastName: names.lastName,
          ...(unitNumber ? { unitNumber } : {}),
          ...(phone ? { phone } : {}),
        };
      }
    } catch {
      checkoutDefaults = {};
    }
  }

  const publicDues = isSupabaseConfigured() ? await getPublicDuesDisplay() : null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant/15 bg-surface-container-high/85 backdrop-blur-md shadow-[0_8px_24px_rgba(20,27,34,0.06)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-high"
              aria-label="Back to home"
            >
              <span
                className="material-symbols-outlined text-[1.25rem] leading-none"
                aria-hidden
              >
                arrow_back
              </span>
              Back
            </Link>
            <WordmarkLogo
              href="/"
              variant="onLight"
              className="text-sm font-bold sm:text-base"
            />
          </div>
        </div>
      </header>

      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-surface-container-lowest via-surface to-surface-container-lowest pb-24 md:pb-12">
        <div
          className="pointer-events-none absolute -right-24 top-0 -z-10 hidden h-[min(70vh,520px)] w-[min(90vw,420px)] opacity-[0.045] grayscale lg:block"
          aria-hidden
        >
          <Image
            alt=""
            className="h-full w-full object-cover object-left-top"
            src={DECOR}
            width={800}
            height={1000}
            priority={false}
          />
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-6 py-12 md:py-24 lg:grid-cols-12">
          <div className="space-y-12 lg:col-span-5">
            <div className="space-y-4">
              <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-secondary">
                Secure payment
              </p>
              <h1 className="font-headline text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
                Pay your HOA dues
              </h1>
              <p className="max-w-md text-lg text-on-surface-variant">
                Association assessments may be billed monthly or annually—enter
                the amount that matches your notice. Your payment supports the
                standards and services of Unity HOA Management.
              </p>
            </div>

            <div className="space-y-6 rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 shadow-sm">
              <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                Association dues
              </p>
              <div className="space-y-1">
                <p className="font-headline text-lg font-semibold text-on-surface">
                  Who is paying
                </p>
                <p className="text-sm text-on-surface-variant">
                  Enter or confirm your name, unit or account number, and optional
                  phone on the form. Those details are saved with your payment
                  and sent to Stripe as metadata for receipts and reconciliation.
                </p>
                <p className="pt-2 text-sm text-on-surface-variant">
                  Sign in with your resident account to pre-fill from your
                  profile when available; you can still edit before continuing to
                  Stripe.
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-outline-variant/15 pt-6 text-sm font-semibold text-on-surface-variant">
                <span
                  className="material-symbols-outlined text-xl text-secondary"
                  aria-hidden
                >
                  lock
                </span>
                Encrypted checkout—you continue on Stripe&apos;s secure page.
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 lg:col-span-7">
            {publicDues ? <PaymentBillingSummary dues={publicDues} /> : null}
            <PaymentCheckoutForm
              canceled={canceled}
              defaults={checkoutDefaults}
            />
          </div>
        </div>
      </main>

      <footer className="bg-primary-container py-12 text-on-primary-container">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <WordmarkLogo
              href="/"
              variant="onDark"
              className="text-sm font-bold opacity-90"
            />
            <div className="flex flex-wrap justify-center gap-8 text-[0.6875rem] font-bold uppercase tracking-widest">
              <a className="transition-colors hover:text-white" href="#">
                Privacy Policy
              </a>
              <a className="transition-colors hover:text-white" href="#">
                Terms of Service
              </a>
              <a className="transition-colors hover:text-white" href="#">
                Help Center
              </a>
            </div>
            <p className="text-center text-[0.6875rem] font-medium opacity-50 md:text-right">
              © {new Date().getFullYear()} Unity HOA Management. All Rights
              Reserved.
            </p>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around rounded-t-3xl border-t border-outline-variant/10 bg-surface-container-high/95 px-6 pb-8 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-lg md:hidden dark:bg-surface-container-lowest/95">
        <Link
          className="flex flex-col items-center justify-center text-on-surface-variant opacity-70"
          href="/"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest">
            Home
          </span>
        </Link>
        <span className="flex flex-col items-center justify-center rounded-2xl bg-secondary px-5 py-2 text-on-secondary">
          <span className="material-symbols-outlined">payments</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest">
            Payments
          </span>
        </span>
        <Link
          className="flex flex-col items-center justify-center text-on-surface-variant opacity-70"
          href="/events"
        >
          <span className="material-symbols-outlined">domain</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest">
            Amenity
          </span>
        </Link>
        <Link
          className="flex flex-col items-center justify-center text-on-surface-variant opacity-70"
          href="/contact"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest">
            Profile
          </span>
        </Link>
      </nav>
    </>
  );
}
