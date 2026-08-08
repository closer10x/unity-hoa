import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { normalizePortalNext } from "@/lib/resident-portal/normalize-next";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

export async function GET(request: NextRequest) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/admin";
  /* Recovery links land here for both portals, so a resident destination has
     to survive; anything else is normalised back under /admin. */
  const redirectTarget = nextRaw.startsWith("/portal")
    ? normalizePortalNext(nextRaw)
    : normalizeAdminNext(nextRaw);

  const loginPath = nextRaw.startsWith("/portal") ? "/portal/login" : "/admin/login";

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}${loginPath}?error=config`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth`);
  }

  let response = NextResponse.redirect(`${origin}${redirectTarget}`);

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
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    response = NextResponse.redirect(`${origin}${loginPath}?error=auth`);
  }

  return response;
}
