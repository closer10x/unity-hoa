/** Resident portal navigation. Groups per the handoff's shell spec. */

export const NAV_GROUPS = [
  "Your home",
  "Requests",
  "Neighborhood",
  "Inbox & records",
] as const;

export type NavItem = {
  id: string;
  label: string;
  group: (typeof NAV_GROUPS)[number];
};

export const NAV: NavItem[] = [
  { id: "overview", label: "Overview", group: "Your home" },
  { id: "payments", label: "Payments", group: "Your home" },
  { id: "maintenance", label: "Maintenance", group: "Requests" },
  { id: "architectural", label: "Architectural", group: "Requests" },
  { id: "compliance", label: "Compliance", group: "Requests" },
  { id: "amenities", label: "Amenities", group: "Neighborhood" },
  { id: "access", label: "Access & guests", group: "Neighborhood" },
  { id: "community", label: "Community", group: "Neighborhood" },
  { id: "messages", label: "Messages", group: "Inbox & records" },
  { id: "documents", label: "Documents", group: "Inbox & records" },
  { id: "account", label: "Account Settings", group: "Inbox & records" },
];
