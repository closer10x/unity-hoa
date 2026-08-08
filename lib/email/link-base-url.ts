/**
 * Base URL for links we put in outbound email and SMS.
 *
 * These links are opened by residents, staff and vendors on their own
 * devices, so a localhost base is always a dead link. NEXT_PUBLIC_SITE_URL
 * is the right base for in-app redirects during local development, but it
 * must never leak into a message — hence the explicit override and the
 * Vercel fallbacks below.
 *
 * Resolution order:
 *   1. EMAIL_LINK_BASE_URL — set this to the production domain so links
 *      sent while developing locally still work for the recipient.
 *   2. NEXT_PUBLIC_SITE_URL, when it isn't localhost.
 *   3. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain.
 *   4. VERCEL_URL — the current deployment (preview builds).
 *   5. NEXT_PUBLIC_SITE_URL as-is, localhost and all: better a broken link
 *      in a local test than a crash, and the caller can warn.
 */

const trim = (u: string | undefined) => u?.trim().replace(/\/$/, "") ?? "";

const isLocal = (u: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(u);

const withScheme = (host: string) =>
  host.startsWith("http://") || host.startsWith("https://") ? host : `https://${host}`;

export function getEmailBaseUrl(): string {
  const explicit = trim(process.env.EMAIL_LINK_BASE_URL);
  if (explicit) return withScheme(explicit);

  const site = trim(process.env.NEXT_PUBLIC_SITE_URL);
  if (site && !isLocal(site)) return site;

  const prod = trim(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (prod) return withScheme(prod);

  const deployment = trim(process.env.VERCEL_URL);
  if (deployment) return withScheme(deployment);

  return site;
}

/** True when the best base we can resolve would be a dead link in an inbox. */
export function emailLinksAreLocal(): boolean {
  const base = getEmailBaseUrl();
  return !base || isLocal(base);
}
