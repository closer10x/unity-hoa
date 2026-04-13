export const MAINTENANCE_COMMUNITIES = [
  { value: "sofi-lakes", label: "Sofi Lakes" },
  { value: "other", label: "Other community" },
] as const;

export const MAINTENANCE_COMMON_AREAS = [
  { value: "park", label: "Park / playground" },
  { value: "sidewalks", label: "Sidewalks / paths" },
  { value: "pool", label: "Pool / spa" },
  { value: "clubhouse", label: "Clubhouse / meeting rooms" },
  { value: "tennis", label: "Tennis / sports courts" },
  { value: "parking", label: "Parking lots / garages" },
  { value: "landscaping", label: "Landscaping / irrigation" },
  { value: "gates", label: "Gates / access" },
  { value: "lighting", label: "Lighting" },
  { value: "other", label: "Other" },
] as const;

/** Hash segment for `MaintenanceRequestCard` auto-open (home page). */
export const MAINTENANCE_REQUEST_HASH = "#maintenance-request" as const;

/** Use in `Link href={...}` to land on home and open the maintenance dialog. */
export const MAINTENANCE_REQUEST_PUBLIC_HREF =
  `/${MAINTENANCE_REQUEST_HASH}` as const;
