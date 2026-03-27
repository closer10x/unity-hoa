/**
 * Map free-text `unit_lot` (profile or payment) to a 1…max unit index for roster matching.
 * Accepts trimmed numeric strings; leading zeros OK ("042" → 42).
 */
export function unitLotToIndex(
  raw: string | null | undefined,
  max: number,
): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const m = /^\s*(?:0*)([1-9]\d{0,2})\s*$/.exec(t);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}
