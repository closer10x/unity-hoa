import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { normalizePortalNext } from "@/lib/resident-portal/normalize-next";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Lands email links minted with auth.admin.generateLink (household invites,
 * resends). Those links can't use the PKCE ?code= flow — GoTrue's verify
 * endpoint would hand tokens back in the URL fragment, which a server never
 * sees (the "Sign-in link expired or is invalid" dead end). Instead the
 * email carries the token_hash and this route exchanges it server-side.
 */

const OTP_TYPES: EmailOtpType[] = ["invite", "magiclink", "recovery", "email", "signup"];

export async function GET(request: NextRequest) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const typeRaw = searchParams.get("type") ?? "";
  const nextRaw = searchParams.get("next") ?? "/portal";

  const isPortal = nextRaw.startsWith("/portal");
  const redirectTarget = isPortal
    ? normalizePortalNext(nextRaw)
    : normalizeAdminNext(nextRaw);
  const loginPath = isPortal ? "/portal/login" : "/admin/login";

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}${loginPath}?error=config`);
  }
  const type = OTP_TYPES.find((t) => t === typeRaw);
  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth`);
  }

  const response = NextResponse.redirect(`${origin}${redirectTarget}`);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth`);
  }

  /* An invited account has no password yet — the link is the only way in —
     and a resend or a "forgot password" mints a recovery token for the same
     purpose. Either way, send them to choose a password before the
     destination, carrying the cookies the exchange just set so the page finds
     the session.

     Recovery counts for residents too. It used to be admin-only, on the
     grounds that resident resets came through /auth/callback and that flow
     worked; it did not. GoTrue's action link returns its tokens in the URL
     fragment, which a server route never sees, so every resident reset ended
     at "link expired or is invalid" — the same dead end this route exists to
     avoid. */
  const needsPassword =
    type === "invite" || type === "signup" || type === "recovery";
  if (needsPassword) {
    const setPasswordPath = isPortal
      ? "/portal/set-password"
      : "/admin/set-password";
    const params = new URLSearchParams({ next: redirectTarget });
    // Fixed string, never the caller's: this only picks the wording.
    if (searchParams.get("flow") === "reset") params.set("flow", "reset");
    const setPassword = NextResponse.redirect(
      `${origin}${setPasswordPath}?${params.toString()}`,
    );
    response.cookies.getAll().forEach((c) => setPassword.cookies.set(c));
    return setPassword;
  }

  return response;
}
