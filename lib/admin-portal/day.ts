/**
 * Today where the office is, not where the server is.
 *
 * `toISOString().slice(0, 10)` is the obvious way to get a date-only string
 * and it is wrong for a calendar day: it converts to UTC first, so from 7pm
 * Central onwards it returns tomorrow. On a crew board that means the
 * highlighted column, and the answer to "who is on today", both jump a day
 * early every evening. Date-only columns like `work_orders.due_at` are
 * calendar days, so they must be compared against a local one.
 */
export function localDayIso(d: Date = new Date()): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
