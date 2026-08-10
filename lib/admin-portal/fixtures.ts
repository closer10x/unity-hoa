/**
 * Static configuration for the admin portal: the navigation, its groups, and
 * month names. Every list of records now comes from the database, so nothing
 * in here stands in for data — and nothing should. No fabricated rows, ever.
 */

/** Fallback only: the signed-in account's name comes from the session. */
export const CURRENT_USER = "Unity Grid administrator";

export const NAV: ReadonlyArray<{
  id: string;
  label: string;
  group: string;
    badge?: string;
}> = [
  { id: "dashboard", label: "Dashboard", group: "Today" },
  { id: "owners", label: "Owners", group: "People" },
  { id: "calendar", label: "Calendar", group: "Today" },
  { id: "accounting", label: "Accounting", group: "Money" },
  { id: "legal", label: "Legal & liens", group: "Money" },
  { id: "work", label: "Work orders", group: "Property" },
  { id: "arc", label: "Architectural", group: "Property" },
  { id: "violations", label: "Violations", group: "Property" },
  { id: "bookings", label: "Bookings", group: "Property" },
  { id: "vendors", label: "Vendors", group: "Property" },
  { id: "comms", label: "Communications", group: "People" },
  { id: "board", label: "Board & meetings", group: "People" },
  { id: "docs", label: "Documents", group: "Office" },
  { id: "portfolio", label: "Communities", group: "Office" },
  { id: "team", label: "Team", group: "Office" },
  { id: "schedule", label: "Schedule", group: "Office" },
];

/** Sidebar group order — People right below Today, per the office's preference. */
export const NAV_GROUPS = ["Today", "People", "Money", "Property", "Office"] as const;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

