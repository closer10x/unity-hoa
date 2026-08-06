"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { COMMUNITIES } from "@/lib/accounts/account-number";

/**
 * "Look up your dues" card from the home design. Three states, matching the
 * prototype's stateLookup / stateResult / stateAccount:
 *
 *   lookup  — community + account + street number, before anything is known
 *   result  — the balance for a looked-up property, with a pay action
 *   account — a signed-in resident's own balance, maintenance summary, and
 *             (when they own more than one) a per-property ledger
 *
 * FRONTEND ONLY: there is no dues-lookup API, so "Show my dues" resolves to a
 * fixture. Account and street numbers are deliberately never put in the URL.
 */

type State = "lookup" | "result" | "account";

type Property = { name: string; balance: string; overdue: boolean };

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";
const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";
const PRIMARY =
  "block w-full rounded-[10px] bg-secondary py-[15px] text-center text-base font-medium text-on-secondary hover:bg-secondary-hover";
const OUTLINE =
  "block w-full rounded-[10px] border border-primary-fixed-dim py-[13px] text-center text-base font-medium text-on-surface hover:border-secondary-fixed-dim";

/** Fixture standing in for the lookup response. */
const RESULT = {
  community: "Sofi Lakes",
  address: "7880 Morrison Road, Katy, Texas 77493",
  cadence: "Quarterly",
  dueDate: "Sep 1",
  amount: "$425.00",
};

/** Fixture standing in for a signed-in resident. */
const ACCOUNT = {
  lotLabel: "Lot 14",
  dueDate: "Sep 1",
  balance: "$425.00",
  requestSummary: "One open request — gate remote replacement, assigned Tuesday.",
  properties: [
    { name: "7880 Morrison Road", balance: "$425.00", overdue: false },
    { name: "204 Lakebend Drive", balance: "$1,380.00", overdue: true },
  ] as Property[],
  totalDue: "$1,805.00",
};

export function DuesLookupCard({
  initialState = "lookup",
  residentOwnsMultiple = false,
}: {
  initialState?: State;
  residentOwnsMultiple?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>(initialState);
  const [community, setCommunity] = useState("");
  const [account, setAccount] = useState("");
  const [street, setStreet] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return setError("Pick your community.");
    if (!account.trim() || !street.trim())
      return setError("Add your account number and street number.");
    setError(null);
    // No dues-lookup API yet, so rather than showing the fixture balance,
    // send the resident on to the payment page. The "result" and "account"
    // states stay reachable via initialState for when real data exists.
    router.push("/payment");
  }

  return (
    <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_1px_2px_oklch(0.4_0.02_150/0.05),0_12px_32px_oklch(0.4_0.02_150/0.05)] sm:p-[30px]">
      {state === "lookup" ? (
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

      {state === "result" ? (
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className={EYEBROW}>{RESULT.community}</span>
            <button
              type="button"
              onClick={() => setState("lookup")}
              className="text-sm text-secondary hover:underline"
            >
              Look up another
            </button>
          </div>

          <p className="mb-1.5 text-[15px] text-on-surface-variant">
            {RESULT.address}
          </p>
          <p className="mb-1 text-[15px] text-on-surface-variant">
            {RESULT.cadence} dues, due {RESULT.dueDate}
          </p>
          <p className="mt-3 mb-5 text-5xl leading-none font-semibold tracking-[-0.03em]">
            {RESULT.amount}
          </p>

          <Link href="/payment" className={PRIMARY}>
            Pay {RESULT.amount} now
          </Link>
          <p className="mt-3 mb-[22px] text-center text-[13px] text-outline">
            Card, bank transfer or scheduled autopay.
          </p>

          <div className="grid gap-3 border-t border-outline-variant pt-5">
            <Link href="/admin/login" className={OUTLINE}>
              Sign in for full history
            </Link>
          </div>
        </div>
      ) : null}

      {state === "account" ? (
        <div>
          <div className="mb-[26px] flex items-center justify-between">
            <span className={EYEBROW}>Your account</span>
            <span className="text-[13px] text-outline">{ACCOUNT.lotLabel}</span>
          </div>

          <div className="border-b border-outline-variant pb-[26px]">
            <p className="mb-1.5 text-sm text-on-surface-variant">
              HOA dues due {ACCOUNT.dueDate}
            </p>
            <p className="mb-[18px] text-[44px] leading-none font-semibold tracking-[-0.03em]">
              {ACCOUNT.balance}
            </p>
            <Link href="/payment" className={PRIMARY}>
              Pay HOA dues
            </Link>
            <p className="mt-3 text-center text-[13px] text-outline">
              Autopay is off ·{" "}
              <Link href="/payment" className="text-secondary hover:underline">
                turn on
              </Link>
            </p>
          </div>

          <div className="pt-6">
            <p className="mb-1.5 text-sm text-on-surface-variant">Maintenance</p>
            <p className="mb-4 text-base leading-normal">
              {ACCOUNT.requestSummary}
            </p>
            <Link href="/admin/login" className={OUTLINE}>
              File a request
            </Link>
          </div>

          {residentOwnsMultiple ? (
            <div className="mt-[26px] border-t border-outline-variant pt-6">
              <p className={`${EYEBROW} mb-3.5`}>All your properties</p>
              <div className="mb-[18px] grid gap-2.5">
                {ACCOUNT.properties.map((p) => (
                  <div
                    key={p.name}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-[15px]"
                  >
                    <span className="truncate text-on-surface">{p.name}</span>
                    <span
                      className={`font-label ${
                        p.overdue
                          ? "text-status-critical"
                          : "text-status-neutral"
                      }`}
                    >
                      {p.balance}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-outline-variant pt-3.5">
                <span className="text-[15px] font-semibold">Total due</span>
                <span className="font-label text-[17px] font-medium">
                  {ACCOUNT.totalDue}
                </span>
              </div>
              <Link href="/payment" className={`${OUTLINE} mt-4`}>
                Pay all properties
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
