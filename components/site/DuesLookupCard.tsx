"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const LABEL = "mb-2 block text-sm text-on-surface-variant";

/**
 * "Look up your dues" card from the home page design.
 *
 * NOTE: there is no dues-lookup API in this app yet, so submitting sends the
 * resident to the payment page rather than resolving a balance. The account and
 * street numbers are deliberately NOT put in the URL.
 */
export function DuesLookupCard() {
  const router = useRouter();
  const [community, setCommunity] = useState("");
  const [account, setAccount] = useState("");
  const [street, setStreet] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!community || !account.trim() || !street.trim()) {
      setError("Pick your community and fill in both numbers.");
      return;
    }
    setError(null);
    router.push("/payment");
  }

  return (
    <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_1px_2px_oklch(0.4_0.02_150/0.05),0_12px_32px_oklch(0.4_0.02_150/0.05)] sm:p-[30px]">
      <p className="mb-2.5 font-label text-[11px] uppercase tracking-[0.12em] text-outline">
        Look up your dues
      </p>
      <p className="mb-6 text-base leading-relaxed text-on-surface-variant">
        Pick your community, then enter your account number and street number to
        see what&apos;s owed.
      </p>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <label className="block">
          <span className={LABEL}>Community</span>
          <select
            className={`${FIELD} appearance-none cursor-pointer`}
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
          >
            <option value="">Select your community…</option>
            <option value="sofi-lakes">Sofi Lakes</option>
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Account number</span>
          <input
            className={FIELD}
            type="text"
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
            type="text"
            inputMode="numeric"
            placeholder="e.g. 7880"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
        </label>

        {error ? (
          <p className="-mt-1 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-[10px] bg-secondary py-[15px] text-base font-medium text-on-secondary transition-colors hover:bg-secondary-hover"
        >
          Show my dues
        </button>
      </form>

      <p className="mt-[18px] text-sm leading-relaxed text-on-surface-variant">
        Your account number is printed on your statement. Registered residents
        can{" "}
        <Link href="/admin/login" className="text-secondary hover:underline">
          sign in
        </Link>{" "}
        instead and skip this step.
      </p>
    </div>
  );
}
