import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * The one-time link a new account follows to choose its own password.
 *
 * Onboarding used to mail a generated temporary password, which left the
 * recipient holding a credential nobody wanted them to keep and no browser
 * step to replace it. Instead we mint a token, `/auth/confirm` exchanges it
 * server-side for a session, and that lands on the matching set-password
 * screen.
 *
 * The token must travel as `token_hash` through `/auth/confirm` rather than
 * as GoTrue's `action_link`: the action link hands tokens back in the URL
 * fragment, which a server never sees — the "link expired or is invalid"
 * dead end the resident invites already had to work around.
 */

type ServiceClient = ReturnType<typeof requireServiceSupabase>;

/** Which portal the exchanged token lands in. */
export type PortalArea = "admin" | "portal";

const NEXT: Record<PortalArea, string> = {
  admin: "/admin",
  portal: "/portal",
};

export function buildConfirmUrl(
  tokenHash: string,
  type: "invite" | "recovery",
  area: PortalArea,
): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
    next: NEXT[area],
  });
  return `${getEmailBaseUrl()}/auth/confirm?${params.toString()}`;
}

/**
 * A fresh "choose your password" link for an account that already exists —
 * a resend, an account minted before this flow, or one just created with a
 * password only the server has seen. Recovery is the right type: `invite` is
 * refused once the address is registered.
 *
 * Returns null when no link could be minted; the caller decides whether that
 * is fatal, since the account itself is already in place either way.
 */
export async function mintSetPasswordUrl(
  service: ServiceClient,
  email: string,
  area: PortalArea,
): Promise<string | null> {
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) return null;
  return buildConfirmUrl(hashedToken, "recovery", area);
}
