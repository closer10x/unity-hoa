import type { Metadata } from "next";
import Image from "next/image";
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

const LOGO =
  "https://lh3.googleusercontent.com/aida/ADBb0ugWH9GKHnQwE8aZacU8tv0fBJGuQlMQcS5TYMYe0yibXbYPkaw1BKSVZefidem7ufbfJpVezhY81-D3nL9dWn9ArgTr7V1TZesZ8norUCc6obluBpuJfxRL71rhwejwfYTDT50nZSZqNKGmaStMNobKrg28oW5AgLny-0tG-ZP9e7djukxcrpENwaGeV76K9rp-x5yzKHCsY7qoMGYxBjkrkiywyImQzBASWXKqZ-kWud61uxa5rlZMO7DlZ1COoc6O2tPwnsTtP3k";

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuChcw2R4o8Tn4Q6lp7YgELicRNWfp9SnU394C9UGf7p-DlNpwN9PeEnH60BTupvtboSkZGnI-gIwxDPaHgtUUFvA0JbHjA9gXjEKkjGcOR7h0xTlMGMKlQKhehnDM7zYPHUkFHMtzM8P4zImFQxHQm59I25rLVmndbd_WCb7D9WRExqSGPf6l2NO95CcVOkSPNquF6aLkIzmoU5RljtWnSEI6udIlwRGowUdD0jttBW0D6CURm9q9jEuBAxHUOmucSnCmNS1uzU1vMZ";

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
    <div className="bg-surface font-body text-on-surface-variant min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] rounded-full bg-surface-container-low blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] rounded-full bg-surface-container blur-[120px] -z-10" />
      <main className="w-full max-w-[1100px] grid md:grid-cols-2 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 bg-surface-container-lowest">
        <div className="hidden md:flex flex-col justify-between p-12 hero-texture text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <Image alt="Unity Grid Logo" className="h-10 w-auto" src={LOGO} width={160} height={40} />
              <span className="font-headline text-xl font-extrabold tracking-tight">
                Unity Grid
              </span>
            </div>
            <h1 className="font-headline text-4xl font-bold leading-tight mb-6 drop-shadow-sm">
              Elevating <br />{" "}
              <span className="text-secondary-fixed">
                Property Management Excellence.
              </span>
            </h1>
            <p className="text-white/90 text-lg max-w-sm leading-relaxed drop-shadow-sm">
              Efficiently oversee property operations, manage HOA finances, and
              streamline community communications through our centralized
              administrator portal.
            </p>
          </div>
          <div className="relative z-10 glass-panel rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Enterprise Security</p>
                <p className="text-xs text-on-surface-variant">
                  Encryption active for all sessions
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 opacity-45 pointer-events-none">
            <div
              className="w-full h-full bg-cover bg-center brightness-125 contrast-105"
              style={{ backgroundImage: `url('${HERO_BG}')` }}
              aria-hidden
            />
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 md:p-16 bg-surface-container-lowest">
          <div className="mb-10 text-center md:text-left">
            <div className="md:hidden flex justify-center mb-8">
              <Image alt="Unity Grid Logo" className="h-12 w-auto" src={LOGO} width={180} height={48} />
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
              Administrator Portal Access
            </h2>
            <p className="text-on-surface-variant text-sm">
              Authorized personnel only. Please sign in with your corporate
              credentials.
            </p>
          </div>
          <AdminLoginMessages error={error ?? null} notice={notice ?? null} />
          {!isSupabaseAuthConfigured() ? (
            <div className="mt-4">
              <SupabaseNotConfigured />
            </div>
          ) : (
          <form className="space-y-6" action={signInAdmin}>
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant block ml-1">
                Username or Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-lg">
                    alternate_email
                  </span>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-highest rounded-lg focus:bg-surface-container-lowest border-none ring-1 ring-transparent focus:ring-1 focus:ring-secondary transition-all outline-none text-on-surface placeholder:text-on-primary-container"
                  placeholder="resident@unitygrid.com"
                  type="text"
                  name="email"
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant block ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-lg">
                    lock_open
                  </span>
                </div>
                <input
                  className="w-full pl-12 pr-12 py-3.5 bg-surface-container-highest rounded-lg focus:bg-surface-container-lowest border-none ring-1 ring-transparent focus:ring-1 focus:ring-secondary transition-all outline-none text-on-surface placeholder:text-on-primary-container"
                  placeholder="••••••••••••"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-outline hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </div>
              </div>
              <div className="ml-1">
                <AdminForgotPasswordForm />
              </div>
            </div>
            <div className="flex items-center px-1">
              <input
                className="w-4 h-4 text-secondary border-outline-variant rounded focus:ring-secondary focus:ring-offset-0 bg-surface-container-highest"
                id="remember"
                type="checkbox"
                name="remember"
              />
              <label
                className="ml-3 text-sm font-medium text-on-surface-variant cursor-pointer select-none"
                htmlFor="remember"
              >
                Remember this device
              </label>
            </div>
            <button
              className="w-full py-4 btn-gradient text-white font-headline font-bold rounded-lg shadow-xl shadow-secondary/20 hover:shadow-secondary/30 transition-all active:scale-[0.98] mt-4"
              type="submit"
            >
              Log In
            </button>
          </form>
          )}
          <div className="mt-12 text-center">
            <p className="text-sm text-on-surface-variant">
              Need assistance?{" "}
              <a className="text-secondary font-bold hover:underline ml-1" href="/contact">
                Contact Systems Administrator
              </a>
            </p>
          </div>
          <div className="mt-auto pt-12 flex justify-center md:justify-start gap-6 text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
            <span className="hover:text-secondary cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-secondary cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-secondary cursor-pointer transition-colors">v2.4.0</span>
          </div>
        </div>
      </main>
      <div className="fixed bottom-8 right-8 hidden md:block">
        <button
          type="button"
          className="w-14 h-14 bg-surface-container-lowest rounded-full shadow-2xl flex items-center justify-center text-secondary border border-secondary/10 hover:bg-surface-container-high transition-colors"
          aria-label="Contact support"
        >
          <span className="material-symbols-outlined text-2xl">contact_support</span>
        </button>
      </div>
    </div>
  );
}
