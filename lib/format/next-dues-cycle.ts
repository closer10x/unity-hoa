import { formatYmdInTimeZone } from "@/lib/finance/billing-period";

/** Public marketing copy uses a fixed zone so SSR and the browser agree (avoids hydration mismatch). */
const SERVICES_DUES_DISPLAY_TZ = "America/Los_Angeles";

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

/**
 * Human label for the next monthly dues date (1st of this month when today is
 * the 1st in `timeZone`; otherwise 1st of the following month).
 */
export function formatNextDuesFirstOfMonthLong(
  timeZone: string = SERVICES_DUES_DISPLAY_TZ,
  now = new Date(),
): string {
  const ymd = formatYmdInTimeZone(now, timeZone);
  const { y, m, d } = parseYmd(ymd);
  let dueY = y;
  let dueM = m;
  if (d !== 1) {
    if (m === 12) {
      dueY += 1;
      dueM = 1;
    } else {
      dueM += 1;
    }
  }
  const monthLong = new Date(Date.UTC(dueY, dueM - 1, 15)).toLocaleString(
    "en-US",
    { month: "long", timeZone: "UTC" },
  );
  return `${monthLong} 1st, ${dueY}`;
}
