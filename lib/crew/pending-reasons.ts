/**
 * Reasons a tech can park a job, in the office's own words.
 *
 * Deliberately not in the crew actions file: a "use server" module may only
 * export async functions, so a constant exported from there reaches the
 * client as a server reference rather than an array.
 */
export const PENDING_REASONS = [
  "Waiting on a part",
  "Waiting on a vendor",
  "Need access to the property",
  "Waiting on the office",
  "Weather",
  "Needs a second tech",
] as const;
