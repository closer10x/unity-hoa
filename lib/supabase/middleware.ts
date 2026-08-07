import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { normalizePortalNext } from "@/lib/resident-portal/normalize-next";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

/** Supabase refreshes the session onto `from`; redirects must copy those Set-Cookie headers or loops/flashing occur. */
function redirectPreservingSupabaseCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
  searchParams: Record<string, string>,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  for (const [key, value] of Object.entries(searchParams)) {
    redirectUrl.searchParams.set(key, value);
  }
  const redirectResponse = NextResponse.redirect(redirectUrl);
  from.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLogin =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const isAdminArea = pathname.startsWith("/admin");
  const isPortalLogin =
    pathname === "/portal/login" || pathname.startsWith("/portal/login/");
  const isPortalArea = pathname.startsWith("/portal");

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  // Local development with no Supabase project: there is no way to sign in, so
  // redirecting here would make the portal unreachable. Let it through and let
  // requireAdminUser hand back its dev session. Never applies in production,
  // and never once keys are present.
  const allowUnconfiguredDevAccess =
    process.env.NODE_ENV !== "production" && (!url || !anonKey);

  if (isAdminArea && !isAdminLogin && (!url || !anonKey)) {
    if (allowUnconfiguredDevAccess) {
      return NextResponse.next({ request });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("error", "config");
    return NextResponse.redirect(redirectUrl);
  }

  if (isPortalArea && !isPortalLogin && (!url || !anonKey)) {
    if (allowUnconfiguredDevAccess) {
      return NextResponse.next({ request });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/portal/login";
    redirectUrl.searchParams.set("error", "config");
    return NextResponse.redirect(redirectUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminArea && !isAdminLogin && !user) {
      return redirectPreservingSupabaseCookies(
        request,
        supabaseResponse,
        "/admin/login",
        { next: normalizeAdminNext(pathname) },
      );
    }

    if (isPortalArea && !isPortalLogin && !user) {
      return redirectPreservingSupabaseCookies(
        request,
        supabaseResponse,
        "/portal/login",
        { next: normalizePortalNext(pathname) },
      );
    }

    return supabaseResponse;
  } catch {
    // Fail open: avoid middleware throwing when Supabase is unreachable (DNS/offline).
    // Admin routes still enforce auth in RSC via requireAdminUser.
    return NextResponse.next({ request });
  }
}
