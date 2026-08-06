/**
 * Account numbers are community-prefixed: Sofi Lakes issues SL-######.
 *
 * FRONTEND ONLY. These are generated in the browser for preview and are NOT
 * checked for collisions or persisted. When the backend lands, issuing must
 * move server-side so the sequence is unique and auditable.
 */

export type CommunityId = "sofi-lakes";

export const COMMUNITIES: ReadonlyArray<{
  id: CommunityId;
  label: string;
  prefix: string;
}> = [{ id: "sofi-lakes", label: "Sofi Lakes", prefix: "SL" }];

export const ACCOUNT_NUMBER_DIGITS = 6;

export function communityPrefix(id: string): string | null {
  return COMMUNITIES.find((c) => c.id === id)?.prefix ?? null;
}

export function communityLabel(id: string): string | null {
  return COMMUNITIES.find((c) => c.id === id)?.label ?? null;
}

/** Formats an already-issued number, e.g. ("SL", 104382) -> "SL-104382". */
export function formatAccountNumber(prefix: string, serial: number): string {
  return `${prefix}-${String(serial).padStart(ACCOUNT_NUMBER_DIGITS, "0")}`;
}

/**
 * Provisional account number for the confirmation screen. Replace with a
 * server-issued value once accounts persist.
 */
export function generateAccountNumber(communityId: string): string | null {
  const prefix = communityPrefix(communityId);
  if (prefix == null) return null;
  const max = 10 ** ACCOUNT_NUMBER_DIGITS;
  return formatAccountNumber(prefix, Math.floor(Math.random() * max));
}
