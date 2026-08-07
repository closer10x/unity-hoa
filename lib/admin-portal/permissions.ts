import type { StaffRole } from "./types";

/**
 * Which portal sections each staff role can reach. This is the enforced
 * counterpart of ROLE_MATRIX (the human-readable copy in the Team section) —
 * keep the two in step when either changes.
 *
 * The server resolves the signed-in account's staff_role and passes the
 * allowed section list into the Shell, so the client never decides for
 * itself. API routes check roles server-side as well.
 */

export const ALL_SECTIONS = [
  "dashboard", "owners", "calendar", "accounting", "legal", "work", "schedule",
  "arc", "violations", "bookings", "vendors", "comms", "board", "docs",
  "portfolio", "team",
] as const;
export type SectionId = (typeof ALL_SECTIONS)[number];

const MANAGER: readonly SectionId[] = [
  "dashboard", "owners", "calendar", "accounting", "legal", "work", "schedule",
  "arc", "violations", "bookings", "vendors", "comms", "board", "docs",
];

export const SECTION_ACCESS: Record<StaffRole, readonly SectionId[]> = {
  // The business owner's account: everything, always — a new section added
  // to ALL_SECTIONS is reachable without touching this map.
  Owner: ALL_SECTIONS,
  Administrator: ALL_SECTIONS,
  "Community manager": MANAGER,
  // Manager minus legal referrals, liens and fee waivers.
  "Assistant manager": MANAGER.filter((s) => s !== "legal"),
  "Maintenance tech": ["dashboard", "calendar", "schedule", "work", "vendors"],
  Inspector: ["dashboard", "calendar", "schedule", "violations", "owners"],
  Accounting: ["dashboard", "calendar", "accounting", "docs"],
  "Front desk": ["dashboard", "calendar", "owners", "bookings", "comms"],
};

export function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === "string" && v in SECTION_ACCESS;
}

/**
 * Sections for an account's staff_role.
 * - null/undefined (accounts predating staff roles) → full access, so
 *   existing admins are never locked out by the migration.
 * - an unrecognized value → dashboard only, the safe floor.
 */
export function sectionsForRole(
  staffRole: string | null | undefined,
): readonly SectionId[] {
  if (staffRole == null || staffRole === "") return ALL_SECTIONS;
  if (isStaffRole(staffRole)) return SECTION_ACCESS[staffRole];
  return ["dashboard"];
}

/**
 * Effective sections for an account: the per-person override when one was
 * granted, otherwise the role default. Unknown ids in a stored override are
 * dropped rather than trusted; an empty override falls back to the role, so
 * a bad write can never lock an account out entirely.
 */
export function resolveSections(
  staffRole: string | null | undefined,
  override: readonly string[] | null | undefined,
): readonly SectionId[] {
  const valid = override?.filter((s): s is SectionId =>
    (ALL_SECTIONS as readonly string[]).includes(s),
  );
  if (valid && valid.length > 0) return valid;
  return sectionsForRole(staffRole);
}

/** Owners and Administrators manage staff accounts (mirrors the team gate). */
export function canManageStaff(staffRole: string | null | undefined): boolean {
  return (
    staffRole == null || staffRole === "" ||
    staffRole === "Administrator" || staffRole === "Owner"
  );
}

const STAFF_ROLES = [
  "Owner", "Administrator", "Community manager", "Assistant manager",
  "Maintenance tech", "Inspector", "Accounting", "Front desk",
] as const;

/**
 * Narrows the session's free-text staff_role to a known role. Anything
 * unrecognised returns null, which the portal treats as "no elevated rights"
 * rather than guessing — a typo in the column must not grant delete.
 */
export function asStaffRole(value: string | null | undefined): StaffRole | null {
  return STAFF_ROLES.find((r) => r === value) ?? null;
}
