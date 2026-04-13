/** Format an ISO timestamp for display; uses `timeZone` when set (e.g. IANA from community_settings). */
export function formatDateTimeInTimezone(
  iso: string,
  timeZone: string | null,
): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      ...(timeZone ? { timeZone } : {}),
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
