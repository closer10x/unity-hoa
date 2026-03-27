import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

export async function GET(request: NextRequest) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}/admin/login?error=config`);
  }

  const redirectTarget = next.startsWith("/") ? next : `/${next}`;

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=auth`);
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
    response = NextResponse.redirect(`${origin}/admin/login?error=auth`);
  }

  return response;
}
