import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminForgotPasswordForm } from "@/components/portal/admin-forgot-password-form";
import { AdminLoginMessages } from "@/components/portal/admin-login-messages";
import { signInAdmin } from "@/app/admin/login/actions";
import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";

export const metadata: Metadata = {
  title: "Administrator Portal",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const errorParam = sp.error;
  const noticeParam = sp.notice;
  const nextParam = sp.next;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const notice = Array.isArray(noticeParam) ? noticeParam[0] : noticeParam;
  const next = normalizeAdminNext(
    (Array.isArray(nextParam) ? nextParam[0] : nextParam) || "/admin",
  );

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileError && profile?.role === "admin") {
        redirect(next);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 font-body sm:px-6">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="mb-8 flex justify-center">
          <img
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            className="block h-9 w-auto"
          />
        </Link>

        <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-7 shadow-[0_1px_2px_oklch(0.4_0.02_150/0.05),0_12px_32px_oklch(0.4_0.02_150/0.05)] sm:p-9">
          <p className="mb-2.5 font-label text-[11px] uppercase tracking-[0.12em] text-outline">
            Administrator portal
          </p>
          <h1 className="mb-2 text-[26px] font-semibold tracking-[-0.02em] text-on-surface">
            Sign in to administration
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-on-surface-variant">
            For staff and board members. Sign in with your Unity Grid account.
          </p>

          <AdminLoginMessages error={error ?? null} notice={notice ?? null} />

          {!isSupabaseAuthConfigured() ? (
            <div className="mt-4">
              <SupabaseNotConfigured />
            </div>
          ) : (
            <form className="grid gap-4" action={signInAdmin}>
              <input type="hidden" name="next" value={next} />

              <label className="block">
                <span className={LABEL}>Email</span>
                <input
                  className={FIELD}
                  placeholder="name@unitygridmanagement.com"
                  type="email"
                  name="email"
                  autoComplete="username"
                />
              </label>

              <label className="block">
                <span className={LABEL}>Password</span>
                <input
                  className={FIELD}
                  placeholder="Your password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-on-surface-variant">
                  <input
                    className="size-4 rounded border-outline-strong accent-secondary"
                    type="checkbox"
                    name="remember"
                  />
                  Remember this device
                </label>
                <AdminForgotPasswordForm />
              </div>

              <button
                type="submit"
                className="mt-1 w-full rounded-[10px] bg-secondary py-[15px] text-base font-medium text-on-secondary transition-colors hover:bg-secondary-hover"
              >
                Sign in
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Need help signing in?{" "}
          <Link href="/contact" className="text-secondary hover:underline">
            Contact the office
          </Link>
        </p>
      </div>
    </main>
  );
}
