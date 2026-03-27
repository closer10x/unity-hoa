import type { Metadata } from "next";
import Link from "next/link";

import { WordmarkLogo } from "@/components/site/WordmarkLogo";

export const metadata: Metadata = {
  title: {
    absolute: "Payment received | Unity HOA Management",
  },
};

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-surface-container-low">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-lg p-10 space-y-6 text-center">
        <WordmarkLogo href="/" variant="onLight" className="text-base font-bold mx-auto" />
        <div className="space-y-2">
          <span
            className="material-symbols-outlined text-5xl text-tertiary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <h1 className="text-2xl font-headline font-extrabold text-primary">
            Thank you
          </h1>
          <p className="text-on-surface-variant text-sm">
            Your payment was submitted. Check your email for your payment
            confirmation and receipt from Stripe when processing completes.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full rounded-md bg-secondary text-white font-headline font-semibold py-3 hover:opacity-90 transition-opacity"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
