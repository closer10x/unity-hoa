"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";

export type PaymentCheckoutDefaults = {
  firstName?: string;
  lastName?: string;
  unitNumber?: string;
  phone?: string;
};

type Props = {
  canceled?: boolean;
  defaults?: PaymentCheckoutDefaults;
};

export function PaymentCheckoutForm({ canceled, defaults }: Props) {
  const [firstName, setFirstName] = useState(defaults?.firstName ?? "");
  const [lastName, setLastName] = useState(defaults?.lastName ?? "");
  const [unitNumber, setUnitNumber] = useState(defaults?.unitNumber ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          firstName,
          lastName,
          unitNumber,
          phone,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setError(
            "Please sign in to pay. Use the same account you use for the resident portal.",
          );
        } else {
          setError(data.error ?? "Payment could not be started.");
        }
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError("No checkout URL returned.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(20,27,34,0.08)] md:p-10">
      {canceled ? (
        <div
          className="mb-6 rounded-lg border border-outline-variant/30 bg-tertiary-container/30 px-4 py-3 text-sm text-on-surface"
          role="status"
        >
          Checkout was canceled. Adjust your amount if needed and try again.
        </div>
      ) : null}

      <div className="mb-8 border-b border-outline-variant/15 pb-6">
        <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
          Payment details
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Enter your name, numeric unit number (1–{FINANCE_ACCOUNT_NUMBER_MAX}
          ), and amount. The unit must match the admin roster and, when your
          profile lists a unit, must match that number. We pass those details to
          Stripe; you&apos;ll finish on Stripe&apos;s secure page. Your{" "}
          <span className="font-semibold text-on-surface">
            payment confirmation email
          </span>{" "}
          from Stripe includes the full receipt and references.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-4 py-3">
        <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
          Accepted methods
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Image
            src="/images/payments/visa.svg"
            alt="Visa"
            width={240}
            height={150}
            unoptimized
            className="h-8 w-auto"
          />
          <Image
            src="/images/payments/mastercard.svg"
            alt="Mastercard"
            width={500}
            height={310}
            unoptimized
            className="h-8 w-auto"
          />
          <span className="text-sm text-on-surface-variant">
            Plus{" "}
            <span className="font-semibold text-on-surface">ACH</span> (US bank
            account) when offered on Stripe Checkout.
          </span>
        </div>
      </div>

      <details className="group mb-8 rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary">
          <span className="font-headline">How online payment works</span>
          <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
            expand_more
          </span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-outline-variant/15 pt-4">
          <ol className="space-y-3 text-sm text-on-surface-variant">
            <li className="flex gap-3">
              <span className="shrink-0 font-headline font-semibold text-primary">
                1.
              </span>
              <span>
                Confirm your name and unit or account number (pre-filled from
                your profile when available), then enter the amount.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-headline font-semibold text-primary">
                2.
              </span>
              <span>
                Continue to Stripe and pay with card or, when available, link a
                US bank account for ACH. Your HOA details are stored with this
                payment and attached in Stripe for reconciliation.
              </span>
            </li>
          </ol>
          <p className="text-xs text-on-surface-variant/80">
            For your records, use the receipt in your payment confirmation email
            and your bank or card statement—those are the places to find
            reference details.
          </p>
        </div>
      </details>

      <form className="flex flex-1 flex-col space-y-6" onSubmit={startCheckout}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label
              htmlFor="payment-first-name"
              className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              First name
            </label>
            <input
              id="payment-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-high/60 px-4 py-3.5 text-on-surface outline-none ring-0 transition-shadow focus:border-secondary/50 focus:ring-2 focus:ring-secondary/25"
              value={firstName}
              onChange={(ev) => setFirstName(ev.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label
              htmlFor="payment-last-name"
              className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Last name
            </label>
            <input
              id="payment-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-high/60 px-4 py-3.5 text-on-surface outline-none ring-0 transition-shadow focus:border-secondary/50 focus:ring-2 focus:ring-secondary/25"
              value={lastName}
              onChange={(ev) => setLastName(ev.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="payment-unit"
            className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Unit number
          </label>
          <input
            id="payment-unit"
            name="unitNumber"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-high/60 px-4 py-3.5 text-on-surface outline-none ring-0 transition-shadow focus:border-secondary/50 focus:ring-2 focus:ring-secondary/25"
            placeholder={`e.g. 60 (1–${FINANCE_ACCOUNT_NUMBER_MAX})`}
            value={unitNumber}
            onChange={(ev) => setUnitNumber(ev.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label
            htmlFor="payment-phone"
            className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Phone <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            id="payment-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-high/60 px-4 py-3.5 text-on-surface outline-none ring-0 transition-shadow focus:border-secondary/50 focus:ring-2 focus:ring-secondary/25"
            placeholder="For payment questions only"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label
            htmlFor="payment-amount"
            className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Payment amount
          </label>
          <div className="overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-container-high/60 transition-shadow focus-within:border-secondary/50 focus-within:ring-2 focus-within:ring-secondary/25">
            <div className="flex items-stretch">
              <span
                className="flex items-center border-r border-outline-variant/20 bg-surface-container-high px-4 font-mono text-lg text-on-surface-variant"
                aria-hidden
              >
                $
              </span>
              <input
                id="payment-amount"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 font-mono text-lg text-on-surface outline-none ring-0 placeholder:text-on-surface-variant/50"
                placeholder="0.00"
                inputMode="decimal"
                name="amount"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                autoComplete="transaction-amount"
                aria-describedby="payment-amount-hint"
              />
            </div>
          </div>
          <p
            id="payment-amount-hint"
            className="text-xs text-on-surface-variant/80"
          >
            USD only. Between $1.00 and $10,000.00.
          </p>
        </div>

        {error ? (
          <div
            className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
            role="alert"
          >
            <p>{error}</p>
            {error.includes("sign in") ? (
              <p>
                <Link
                  href="/admin/login"
                  className="font-semibold text-secondary underline underline-offset-2"
                >
                  Go to sign in
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto space-y-5 border-t border-outline-variant/15 pt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-secondary to-secondary-fixed-dim py-4 font-headline font-bold text-white shadow-lg shadow-secondary/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 sm:py-5"
          >
            {loading ? "Redirecting…" : "Continue to Stripe Checkout"}
          </button>
          <p className="flex items-start justify-center gap-2 text-center text-xs text-on-surface-variant/75">
            <span className="material-symbols-outlined text-base leading-none text-secondary/80">
              lock
            </span>
            <span className="text-left">
              Encrypted by Stripe. Unity HOA Management does not store your full
              card or bank account details.
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
