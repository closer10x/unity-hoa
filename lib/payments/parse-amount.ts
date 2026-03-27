const MIN_CENTS = 100;
const MAX_CENTS = 1_000_000;

export type ParseAmountResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

export function parseAmountToCents(input: unknown): ParseAmountResult {
  if (input === null || input === undefined) {
    return { ok: false, error: "Amount is required" };
  }
  const raw =
    typeof input === "number" ? input.toString() : String(input).trim();
  if (!raw) {
    return { ok: false, error: "Amount is required" };
  }
  const normalized = raw.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Invalid amount" };
  }
  const cents = Math.round(n * 100);
  if (cents < MIN_CENTS || cents > MAX_CENTS) {
    return {
      ok: false,
      error: "Amount must be between $1.00 and $10,000.00",
    };
  }
  return { ok: true, cents };
}
