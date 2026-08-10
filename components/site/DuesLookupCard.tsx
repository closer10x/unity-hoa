"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { COMMUNITIES, communityLabel } from "@/lib/accounts/account-number";
import { formatDuesScheduleLine } from "@/lib/community/billing-display";
import { formatUsdFromCents } from "@/lib/format/money";
import { lookupDues, type DuesLookupResult } from "@/lib/community/dues-lookup";
import type { PublicDuesDisplay } from "@/lib/types/community";

/**
 * "Look up your dues" card from the home design.
 *
 * The account number and street number are matched against the roster and the
 * household's own balance is shown in a dialog. Both numbers are required
 * together — the page is public, so one of them alone must not open an
 * account. Neither is ever put in the URL, and the answer carries no name or
 * address back.
 *
 * When the lot has no billing on record the dialog falls back to the
 * community's standard fee, which is what the office configured.
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
  const [view, setView] = useState<"lookup" | "result">("lookup");
  const [community, setCommunity] = useState("");
  const [account, setAccount] = useState("");
  const [street, setStreet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<DuesLookupResult, { found: true }> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* A dialog traps the page: Escape closes it and the background does not
     scroll underneath. */
  useEffect(() => {
    if (view !== "result") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setView("lookup"); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [view]);

  const feeCents = dues?.hoa_fee_amount_cents ?? null;
  const hasConfiguredDues = feeCents != null && feeCents > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!community) return setError("Pick your community.");
    if (!account.trim() || !street.trim())
      return setError("Add your account number and street number.");
    setError(null);
    setBusy(true);
    try {
      const res = await lookupDues({
        community,
        accountNumber: account,
        streetNumber: street,
      });
      if (!res.found) {
        setError(res.reason);
        return;
      }
      setResult(res);
      setView("result");
    } catch {
      setError("We couldn't check that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
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

            <button type="submit" className={PRIMARY} style={busy ? { opacity: 0.65 } : undefined}>
              {busy ? "Checking\u2026" : "Show my dues"}
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

      {view === "result" && result ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Your dues"
          className="fixed inset-0 z-50 flex items-end justify-center bg-shell/45 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setView("lookup"); }}
        >
          <div className="max-h-[85dvh] w-full max-w-[440px] overflow-y-auto rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_64px_oklch(0.3_0.02_150/0.28)] sm:p-[30px]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className={EYEBROW}>
                  {communityLabel(community) ?? "Your community"}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Account {account.trim()} &middot; {street.trim()}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setView("lookup")}
                className="min-h-11 rounded-full px-3 text-sm text-secondary hover:underline"
              >
                Close
              </button>
            </div>

            {result.charges.length === 0 && result.payments.length === 0 ? (
              <>
                <p className="mb-1.5 text-[15px] text-on-surface-variant">
                  Nothing has been billed to this account yet. The standard fee
                  for your community is
                </p>
                <p className="mt-3 mb-5 text-5xl leading-none font-semibold tracking-[-0.03em]">
                  {hasConfiguredDues ? formatUsdFromCents(feeCents!) : "not set"}
                </p>
                {formatDuesScheduleLine(dues!) ? (
                  <p className="mb-5 text-[15px] text-on-surface-variant">
                    {formatDuesScheduleLine(dues!)}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mb-1.5 text-[15px] text-on-surface-variant">
                  {result.balanceCents > 0
                    ? "Balance owed"
                    : result.balanceCents < 0
                      ? "Credit on the account"
                      : "Balance"}
                </p>
                <p className="mt-2 mb-1 text-5xl leading-none font-semibold tracking-[-0.03em]">
                  {result.balanceCents === 0 ? "$0.00" : result.balance}
                </p>
                <p className="mb-5 text-sm text-on-surface-variant">
                  {result.balanceCents > 0
                    ? "Due now."
                    : result.balanceCents < 0
                      ? "Nothing is owed — this is carried forward."
                      : "Paid up. Thank you."}
                  {result.lastPaymentOn ? ` Last payment ${result.lastPaymentOn}.` : ""}
                </p>

                <div className="mb-5 grid gap-3 border-t border-outline-variant pt-4">
                  {result.charges.length > 0 ? (
                    <div>
                      <p className={`${EYEBROW} mb-2`}>Charges</p>
                      <ul className="grid gap-1.5">
                        {result.charges.slice(0, 8).map((c) => (
                          <li key={c.id} className="flex justify-between gap-3 text-sm">
                            <span className="min-w-0 text-on-surface-variant">
                              {c.description || "HOA fee"}
                              <span className="block text-outline">{c.date}</span>
                            </span>
                            <span className="flex-none font-label">{c.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.payments.length > 0 ? (
                    <div>
                      <p className={`${EYEBROW} mb-2`}>Payments received</p>
                      <ul className="grid gap-1.5">
                        {result.payments.slice(0, 8).map((c) => (
                          <li key={c.id} className="flex justify-between gap-3 text-sm">
                            <span className="min-w-0 text-on-surface-variant">
                              {c.description || "Payment"}
                              <span className="block text-outline">{c.date}</span>
                            </span>
                            <span className="flex-none font-label">&minus;{c.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {result.balanceCents !== 0 || result.charges.length === 0 ? (
              <Link href="/payment" className={PRIMARY}>
                {result.balanceCents > 0 ? "Pay this balance" : "Continue to payment"}
              </Link>
            ) : null}
            <p className="mt-3 mb-[22px] text-center text-[13px] text-outline">
              {dues?.payment_methods_note ?? "Card or bank transfer at checkout."}
            </p>

            <div className="grid gap-3 border-t border-outline-variant pt-5">
              <button type="button" onClick={() => setView("lookup")} className={OUTLINE}>
                Look up another account
              </button>
              <Link href="/portal/login" className="text-center text-sm text-secondary hover:underline">
                Sign in for your full statement
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
