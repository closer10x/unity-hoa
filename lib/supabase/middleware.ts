import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
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

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (isAdminArea && !isAdminLogin && (!url || !anonKey)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
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

    return supabaseResponse;
  } catch {
    // Fail open: avoid middleware throwing when Supabase is unreachable (DNS/offline).
    // Admin routes still enforce auth in RSC via requireAdminUser.
    return NextResponse.next({ request });
  }
}
