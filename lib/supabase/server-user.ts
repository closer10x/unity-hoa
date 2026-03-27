import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

/**
 * Supabase client bound to the current request cookies (user session).
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function createSupabaseServerClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; ignore if middleware already refreshed session.
        }
      },
    },
  });
}
