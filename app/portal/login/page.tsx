import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResidentForgotPasswordForm } from "@/components/portal/resident-forgot-password-form";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { signInResident } from "@/app/portal/login/actions";
import { normalizePortalNext } from "@/lib/resident-portal/normalize-next";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export const metadata: Metadata = {
  title: "Resident Portal · Unity Grid",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_COPY: Record<string, string> = {
  config:
    "Sign-in is not configured on this environment yet. Add the Supabase keys to .env.local.",
  credentials: "That email and password didn't match. Try again.",
  profile_error:
    "We couldn't load your account. Check your connection and try again.",
  missing: "Enter your email and password.",
  missing_email: "Enter the email address for the reset link.",
};

const NOTICE_COPY: Record<string, string> = {
  reset_sent:
    "If an account exists for that email, a reset link is on its way.",
};

const font = {
  sans: "'Instrument Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

export default async function ResidentLoginPage({ searchParams }: PageProps) {
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(sp.error);
  const notice = one(sp.notice);
  const next = normalizePortalNext(one(sp.next) || "/portal");

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next);
  } else if (process.env.NODE_ENV !== "production") {
    // Unconfigured local dev falls straight through to the stub session.
    redirect(next);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    font: "inherit",
    fontSize: 16,
    color: "oklch(0.26 0.014 150)",
    background: "oklch(0.99 0.004 130)",
    border: "1px solid oklch(0.86 0.012 145)",
    borderRadius: 10,
    padding: "13px 14px",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "oklch(0.972 0.006 130)",
        fontFamily: font.sans,
        color: "oklch(0.26 0.014 150)",
        display: "grid",
        placeItems: "center",
        padding: "clamp(16px, 3vw, 32px)",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 440,
          background: "oklch(0.99 0.004 130)",
          border: "1px solid oklch(0.9 0.01 140)",
          borderRadius: 16,
          padding: "clamp(24px, 5vw, 40px)",
          display: "grid",
          gap: 22,
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            style={{ display: "block", height: 28, width: "auto" }}
          />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "oklch(0.56 0.015 150)",
            }}
          >
            Resident portal
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 30px)",
              fontWeight: 600,
              letterSpacing: "-0.024em",
            }}
          >
            Sign in to your home
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "oklch(0.52 0.012 150)" }}>
            Pay HOA fees, file requests, reserve amenities and reach the
            office — all in one place.
          </p>
        </div>

        {error && ERROR_COPY[error] ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.55,
              color: "oklch(0.48 0.11 30)",
              background: "oklch(0.965 0.02 30)",
              border: "1px solid oklch(0.9 0.04 30)",
              borderRadius: 10,
              padding: "12px 14px",
              whiteSpace: "pre-line",
            }}
          >
            {ERROR_COPY[error]}
          </p>
        ) : null}
        {notice && NOTICE_COPY[notice] ? (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.55,
              color: "oklch(0.42 0.05 155)",
              background: "oklch(0.955 0.018 150)",
              border: "1px solid oklch(0.89 0.022 150)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            {NOTICE_COPY[notice]}
          </p>
        ) : null}

        {!isSupabaseAuthConfigured() ? (
          <SupabaseNotConfigured />
        ) : (
          <form action={signInResident} style={{ display: "grid", gap: 16 }}>
            <input type="hidden" name="next" value={next} />
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 14, color: "oklch(0.45 0.012 150)" }}>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@example.com"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 14, color: "oklch(0.45 0.012 150)" }}>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Your password"
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              style={{
                font: "inherit",
                fontSize: 15,
                fontWeight: 500,
                background: "oklch(0.42 0.05 155)",
                color: "oklch(0.97 0.008 140)",
                border: "none",
                padding: "14px 26px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
            <ResidentForgotPasswordForm />
          </form>
        )}

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "oklch(0.56 0.015 150)" }}>
          New to the neighborhood? Your portal invite comes from the management
          office — <a
            href="/contact"
            style={{
              color: "oklch(0.44 0.045 155)",
              display: "inline-flex", alignItems: "center",
              minHeight: 44, padding: "10px 0", margin: "-10px 0",
            }}
          >
            contact us
          </a>{" "}
          if you haven’t received one.
        </p>
      </main>
    </div>
  );
}
