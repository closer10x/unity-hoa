import type { DuesFrequency } from "@/lib/types/community";

/** YYYY-MM-DD in the given IANA zone, or UTC when null/invalid. */
export function formatYmdInTimeZone(d: Date, timeZone: string | null): string {
  const tz = timeZone?.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
}

function parseYmd(ymd: string): { y: number; m: number } {
  const [y, m] = ymd.split("-").map(Number);
  return { y, m };
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * Inclusive calendar bounds for the billing period containing `referenceNow`,
 * using the association timezone when set (otherwise UTC).
 * `custom` has no defined window — returns null (callers show gross due only).
 */
export function currentBillingPeriodInclusiveYmd(
  duesFrequency: DuesFrequency | null,
  referenceNow: Date,
  timeZone: string | null,
): { start: string; end: string } | null {
  if (duesFrequency === "custom") return null;

  const freq: Exclude<DuesFrequency, "custom"> = duesFrequency ?? "monthly";
  const todayYmd = formatYmdInTimeZone(referenceNow, timeZone);
  const { y, m } = parseYmd(todayYmd);

  if (freq === "monthly") {
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const dim = daysInMonth(y, m);
    const end = `${y}-${String(m).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
    return { start, end };
  }

  if (freq === "quarterly") {
    const q = Math.floor((m - 1) / 3);
    const startM = q * 3 + 1;
    const endM = q * 3 + 3;
    const start = `${y}-${String(startM).padStart(2, "0")}-01`;
    const dim = daysInMonth(y, endM);
    const end = `${y}-${String(endM).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
    return { start, end };
  }

  if (freq === "annual") {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  return null;
}

export function isYmdInInclusiveRange(ymd: string, start: string, end: string): boolean {
  return ymd.length === 10 && ymd >= start && ymd <= end;
}
