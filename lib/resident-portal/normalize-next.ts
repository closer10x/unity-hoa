/**
 * Post-login `next` must stay under `/portal`. Collapse accidental doubled
 * prefixes and never return `/portal/login` — residents would redirect-loop.
 */
export function normalizePortalNext(raw: string): string {
  const t = raw.trim().split("?")[0].split("#")[0];
  const p = t.startsWith("/") ? t : `/${t}`;
  let out = p;
  while (out.startsWith("/portal/portal")) {
    out = "/portal" + out.slice("/portal/portal".length);
  }
  if (out.includes("..") || !out.startsWith("/portal")) {
    return "/portal";
  }
  if (out === "/portal/login" || out.startsWith("/portal/login/")) {
    return "/portal";
  }
  return out;
}
