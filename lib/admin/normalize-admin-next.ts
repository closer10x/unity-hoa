/**
 * Post-login `next` must stay under `/admin`. Collapse accidental doubled
 * prefixes from bad bookmarks or query strings (e.g. /admin/admin → /admin).
 * Never return `/admin/login` — admins would redirect-loop (login page → next → login).
 */
export function normalizeAdminNext(raw: string): string {
  const t = raw.trim().split("?")[0].split("#")[0];
  const p = t.startsWith("/") ? t : `/${t}`;
  let out = p;
  while (out.startsWith("/admin/admin")) {
    out = "/admin" + out.slice("/admin/admin".length);
  }
  if (out.includes("..") || !out.startsWith("/admin")) {
    return "/admin";
  }
  if (out === "/admin/login" || out.startsWith("/admin/login/")) {
    return "/admin";
  }
  return out;
}
