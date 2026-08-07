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

  const board = await loadCrewBoard(link.employee_id);
  if (!board) notFound();

  return <CrewBoardClient board={board} token={token} />;
}
