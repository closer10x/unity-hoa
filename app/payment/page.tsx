import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PaymentCheckoutForm } from "@/components/payment/PaymentCheckoutForm";
import { WordmarkLogo } from "@/components/site/WordmarkLogo";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
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

export default async function PaymentPage({ searchParams }: PageProps) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const canceled = sp?.canceled === "1";

  let unitLot: string | null = null;
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("unit_lot")
          .eq("id", user.id)
          .maybeSingle();
        const raw = profile?.unit_lot;
        unitLot =
          typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
      }
    } catch {
      unitLot = null;
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant/15 bg-surface-container-high/85 backdrop-blur-md shadow-[0_8px_24px_rgba(20,27,34,0.06)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
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
                  Your unit / lot
                </p>
                {unitLot ? (
                  <p className="text-base font-medium text-on-surface">{unitLot}</p>
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    Sign in with your resident account to see the unit or lot on
                    file. You can update it in your profile settings if needed.
                  </p>
                )}
                <p className="pt-2 text-sm text-on-surface-variant">
                  Enter your payment amount in the secure form—matching uses your
                  signed-in profile, not an account number on this page.
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
            <PaymentCheckoutForm canceled={canceled} />
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
