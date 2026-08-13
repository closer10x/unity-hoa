import type { Metadata } from "next";

import { JoinForm } from "./JoinForm";

/**
 * The link the office hands out: unitygridmanagement.com/join
 *
 * One public page, so it can go on a letter, a door hanger or the website
 * without anybody minting anything first. It is safe to be public because it
 * grants nothing — every request waits in Owners until the office approves
 * it against the ownership record.
 */
export const metadata: Metadata = {
  title: "Set up your resident account | Unity Grid Management",
  description:
    "Homeowners in a Unity Grid community can request access to the resident portal.",
};

export default function JoinPage() {
  return (
    <main className="min-h-dvh bg-paper px-6 py-14 text-ink">
      <div className="mx-auto grid w-full max-w-2xl gap-8">
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            Unity Grid Management
          </div>
          <h1 className="mt-3 font-display text-[clamp(28px,6vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em]">
            Set up your resident account
          </h1>
          <p className="mt-4 max-w-prose text-[16px] leading-[1.65] text-body">
            Tell us who you are and which home is yours. Once the office has
            checked it against the ownership record, we&rsquo;ll email you a
            link to choose a password — then you can see your balance, pay your
            HOA fee, report a problem and read the governing documents.
          </p>
        </div>

        <JoinForm />

        <p className="text-[13px] leading-[1.6] text-muted">
          Already have an account?{" "}
          <a href="/portal/login" className="font-semibold text-moss underline-offset-4 hover:underline">
            Sign in to the resident portal
          </a>
          .
        </p>
      </div>
    </main>
  );
}
