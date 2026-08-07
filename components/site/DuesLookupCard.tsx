"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { COMMUNITIES, communityLabel } from "@/lib/accounts/account-number";
import { formatDuesScheduleLine } from "@/lib/community/billing-display";
import { formatUsdFromCents } from "@/lib/format/money";
import type { PublicDuesDisplay } from "@/lib/types/community";

/**
 * "Look up your dues" card from the home design.
 *
 * The result state shows the community's standard dues as configured by the
 * office in hoa_dashboard_metrics (passed in server-side as `dues`).
 * Per-account balances aren't tracked yet, so when no dues are configured the
 * lookup sends the resident straight to the payment page instead of showing
 * an amount. Account and street numbers are deliberately never put in the URL.
 */

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";
const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";
const PRIMARY =
  "block w-full rounded-[10px] bg-secondary py-[15px] text-center text-base font-medium text-on-secondary hover:bg-secondary-hover";
const OUTLINE =
  "block w-full rounded-[10px] border border-primary-fixed-dim py-[13px] text-center text-base font-medium text-on-surface hover:border-secondary-fixed-dim";

export function DuesLookupCard({
  dues = null,
}: {
  dues?: PublicDuesDisplay | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<"lookup" | "result">("lookup");
  const [community, setCommunity] = useState("");
  const [account, setAccount] = useState("");
  const [street, setStreet] = useState("");
  const [error, setError] = useState<string | null>(null);

  const feeCents = dues?.hoa_fee_amount_cents ?? null;
  const hasConfiguredDues = feeCents != null && feeCents > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return setError("Pick your community.");
    if (!account.trim() || !street.trim())
      return setError("Add your account number and street number.");
    setError(null);
    if (hasConfiguredDues) setView("result");
    else router.push("/payment");
  }

  return (
    <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_1px_2px_oklch(0.4_0.02_150/0.05),0_12px_32px_oklch(0.4_0.02_150/0.05)] sm:p-[30px]">
      {view === "lookup" ? (
        <div>
          <p className={`${EYEBROW} mb-2.5`}>Look up your dues</p>
          <p className="mb-6 text-base leading-relaxed text-on-surface-variant">
            Pick your community, then enter your account number and street
            number to see what&apos;s owed.
          </p>

          <form className="grid gap-4" onSubmit={submit}>
            <label className="block">
              <span className={LABEL}>Community</span>
              <select
                className={`${FIELD} cursor-pointer appearance-none`}
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
              >
                <option value="">Select your community…</option>
                {COMMUNITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>Account number</span>
              <input
                className={FIELD}
                inputMode="numeric"
                placeholder="e.g. 40218"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Street number</span>
              <input
                className={FIELD}
                inputMode="numeric"
                placeholder="e.g. 7880"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </label>

            {error ? (
              <p className="-mt-1 text-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className={PRIMARY}>
              Show my dues
            </button>
          </form>

          <p className="mt-[18px] text-sm leading-relaxed text-on-surface-variant">
            Your account number is printed on your statement. Registered
            residents can{" "}
            <Link href="/admin/login" className="text-secondary hover:underline">
              sign in
            </Link>{" "}
            instead and skip this step.
          </p>
        </div>
      ) : null}

      {view === "result" && hasConfiguredDues ? (
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className={EYEBROW}>
              {communityLabel(community) ?? "Your community"}
            </span>
            <button
              type="button"
              onClick={() => setView("lookup")}
              className="text-sm text-secondary hover:underline"
            >
              Look up another
            </button>
          </div>

          <p className="mb-1.5 text-[15px] text-on-surface-variant">
            Standard HOA fee for your community
          </p>
          {formatDuesScheduleLine(dues!) ? (
            <p className="mb-1 text-[15px] text-on-surface-variant">
              {formatDuesScheduleLine(dues!)}
            </p>
          ) : null}
          <p className="mt-3 mb-5 text-5xl leading-none font-semibold tracking-[-0.03em]">
            {formatUsdFromCents(feeCents!)}
          </p>

          <Link href="/payment" className={PRIMARY}>
            Continue to payment
          </Link>
          {dues?.payment_methods_note ? (
            <p className="mt-3 mb-[22px] text-center text-[13px] text-outline">
              {dues.payment_methods_note}
            </p>
          ) : (
            <p className="mt-3 mb-[22px] text-center text-[13px] text-outline">
              Card or bank transfer at checkout.
            </p>
          )}

          <div className="grid gap-3 border-t border-outline-variant pt-5">
            <Link href="/admin/login" className={OUTLINE}>
              Sign in for your account balance
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
