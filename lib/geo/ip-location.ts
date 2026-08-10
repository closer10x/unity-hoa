import "server-only";

/**
 * Best-effort IP → location for the sign-in log. Uses ip-api.com's keyless
 * endpoint (city / region / country), which is enough to tell an office "this
 * login came from Katy, Texas" without standing up an account or a key.
 *
 * Never throws and never blocks a login: the caller wraps it, and a lookup
 * that fails or times out simply yields null, leaving the row to show the IP.
 * Private and loopback addresses are skipped without a network call — they
 * have no public location and ip-api would just reject them.
 */

export type IpLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
};

/** RFC 1918 / loopback / link-local — anything with no public location. */
function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.") || ip.toLowerCase().startsWith("fe80:")) return true;
  const m = ip.match(/^172\.(\d{1,3})\./);
  if (m) {
    const second = parseInt(m[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function lookupIpLocation(
  ip: string | null | undefined,
): Promise<IpLocation | null> {
  if (!ip) return null;
  const clean = ip.trim();
  if (!clean || isPrivateIp(clean)) return null;

  try {
    // http only on the free tier; the request is server-side, so no mixed
    // content concern. A short timeout keeps a slow lookup from holding a login.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,regionName,city`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string; country?: string; regionName?: string; city?: string;
    };
    if (data.status !== "success") return null;
    return {
      city: data.city?.trim() || null,
      region: data.regionName?.trim() || null,
      country: data.country?.trim() || null,
    };
  } catch {
    return null;
  }
}

/** "Katy, Texas, United States" from the stored parts; null when none are known. */
export function formatLocation(loc: IpLocation | null): string | null {
  if (!loc) return null;
  const parts = [loc.city, loc.region, loc.country].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(", ") : null;
}
