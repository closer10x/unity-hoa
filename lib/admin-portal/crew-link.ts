import type { Staff } from "./types";

/**
 * The small print under a job-board link: what it is, and whether it opens
 * anything right now.
 *
 * Shared by the two screens that show the link — Work orders and Team —
 * because the honest bit is easy to write on one and forget on the other: a
 * board only answers for an employee whose account is on (loadCrewBoard
 * checks `active`), so a link handed out while they are switched off is a
 * dead link. The office should read that before it sends one, not after.
 */
export function crewLinkNote(person: Staff): string {
  if (!person.active) {
    return "Their job board — switched off with the account. The link still opens, but it tells them to call the office until the account is switched back on.";
  }
  const opened = person.crewLinkLastUsed
    ? `last opened ${new Date(person.crewLinkLastUsed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "never opened — send it to them again";
  return `Their job board — opens on a phone with no sign-in · ${opened}`;
}
