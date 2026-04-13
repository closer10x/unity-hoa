/**
 * Matches published site copy (e.g. SiteFooter): Mon–Fri 9AM–5PM, Sat–Sun closed.
 * End time is exclusive at 5:00 PM local time.
 */
export function isManagementOfficeOpenAt(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const minutes = date.getHours() * 60 + date.getMinutes();
  const open = 9 * 60;
  const close = 17 * 60;
  return minutes >= open && minutes < close;
}
