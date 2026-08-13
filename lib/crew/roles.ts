/**
 * Which roles work off a job board rather than the admin portal.
 *
 * Its own module, and deliberately free of server imports, because both sides
 * of the app need to agree on it: the server mints a crew link the moment one
 * of these accounts exists, and the office screens decide from the same list
 * whose link to show. It used to be declared twice — here and again inside
 * the Schedule board — which is how a role gets added in one place only.
 */

export const FIELD_ROLES = ["Maintenance tech", "Inspector"] as const;

export function isFieldRole(role: string | null | undefined): boolean {
  return (FIELD_ROLES as readonly string[]).includes((role ?? "").trim());
}
