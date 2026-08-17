import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { setStaffPassword } from "./actions";
import { normalizeAdminNext } from "@/lib/admin/normalize-admin-next";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export const metadata: Metadata = {
  title: "Choose your password · Unity Grid",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_COPY: Record<string, string> = {
  short: "Use at least 8 characters.",
  mismatch: "Those two passwords don't match.",
  failed: "We couldn't save that password. Try again.",
};

const font = {
  sans: "'Instrument Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

/**
 * The last step of a staff invite: the emailed link signed them in, and here
 * they choose the password they'll use from now on. Without this a new hire
 * either gets handed a password somebody else generated, or has an account
 * they can only ever re-enter by email link.
 */
export default async function AdminSetPasswordPage({ searchParams }: PageProps) {
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(sp.error);
  /* Wording only: telling somebody who asked to reset a password to "finish
     signing up" reads as though they are claiming a different account. */
  const isReset = one(sp.flow) === "reset";
  const next = normalizeAdminNext(one(sp.next) || "/admin");

  if (!isSupabaseAuthConfigured()) {
    redirect("/admin/login?error=config");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Reached without the invite link (or after it expired) — there is no
  // session to set a password on.
  if (!user) {
    redirect("/admin/login?error=link_expired");
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
            Management portal
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 30px)",
              fontWeight: 600,
              letterSpacing: "-0.024em",
            }}
          >
            {isReset ? "Choose a new password" : "Choose your password"}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "oklch(0.52 0.012 150)" }}>
            You&rsquo;re signed in as{" "}
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{user.email}</span>.{" "}
            {isReset
              ? "Pick a new one and the old password stops working straight away."
              : "Pick a password and you’ll use it to sign in from now on."}
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
            }}
          >
            {ERROR_COPY[error]}
          </p>
        ) : null}

        <form action={setStaffPassword} style={{ display: "grid", gap: 16 }}>
          <input type="hidden" name="next" value={next} />
          {/* Off-screen but present: password managers won't offer to save a
              credential when they can't tell which account it belongs to. */}
          <input
            type="email"
            name="email"
            value={user.email ?? ""}
            autoComplete="username"
            readOnly
            aria-hidden="true"
            tabIndex={-1}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 14, color: "oklch(0.45 0.012 150)" }}>New password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="At least 8 characters"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 14, color: "oklch(0.45 0.012 150)" }}>Confirm password</span>
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Type it once more"
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
            Save password and continue
          </button>
        </form>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "oklch(0.56 0.015 150)" }}>
          You can change it later under your profile.
        </p>
      </main>
    </div>
  );
}
