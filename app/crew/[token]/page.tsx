import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadCrewBoard, resolveCrewLink } from "@/lib/crew/links";

import { CrewBoardClient } from "./CrewBoardClient";

/**
 * A field employee's personal job board, opened from a texted link.
 *
 * No sign-in: the token in the URL is the credential. An invalid, revoked or
 * expired token 404s rather than explaining itself, so the page gives nothing
 * away to someone probing tokens.
 *
 * The one thing it does explain is a switched-off account, and only to
 * somebody whose token already resolved — see CrewBoardResult. Everything
 * else about that employee stays hidden.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your jobs | Unity Grid",
  // Keep personal job lists out of search results.
  robots: { index: false, follow: false },
};

export default async function CrewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolveCrewLink(token);
  if (!link) notFound();

  const result = await loadCrewBoard(link.employee_id);
  if (result.state === "gone") notFound();

  if (result.state === "switched-off") return <SwitchedOff name={result.name} />;

  return <CrewBoardClient board={result.board} token={token} />;
}

/**
 * What a tech sees when their link is real but their account is off.
 *
 * Says the one thing they can act on — call the office — and nothing about
 * the work itself. A 404 here sent them chasing a link that was never the
 * problem.
 */
function SwitchedOff({ name }: { name: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 py-16 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <div className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
          Unity Grid Management
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em]">
          {name ? `${name.split(" ")[0]}, your board is switched off` : "This board is switched off"}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-body">
          The link is fine — the account it belongs to has been switched off, so
          there are no jobs to show. Call the office and they can switch it back
          on; this same link will work again.
        </p>
        <p className="mt-4 text-[13px] leading-[1.6] text-muted">
          Nothing you have already logged is lost.
        </p>
      </div>
    </main>
  );
}
