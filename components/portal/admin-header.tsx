import Image from "next/image";
import Link from "next/link";

import { signOutAdmin } from "@/app/admin/(dashboard)/sign-out-action";

/**
 * Admin header, per docs/design/handoff.md "Application shell":
 * sticky at top 0, surface background, bottom hairline,
 * `padding: 14px clamp(16px, 3vw, 32px)`. Wordmark on the left; scope
 * switcher and identity block on the right.
 *
 * No icons — the handoff uses no icon set anywhere. Height is fixed by
 * ADMIN_HEADER_H so the sticky sidebar can offset against it.
 */

export const ADMIN_HEADER_H = 64;

type Props = {
  email?: string;
  displayName?: string;
  /** Signed storage URL; omit to show initial fallback */
  avatarUrl?: string;
  /** Communities the signed-in staff member can scope to. */
  scopes?: ReadonlyArray<{ id: string; label: string }>;
};

function AvatarFallback({ label }: { label: string }) {
  const ch = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-full w-full items-center justify-center bg-secondary-container text-[11px] font-semibold text-on-secondary-container">
      {ch}
    </span>
  );
}

export function AdminHeader({ email, displayName, avatarUrl, scopes }: Props) {
  const label = displayName?.trim() || email || "Admin";

  return (
    <header
      className="sticky top-0 z-20 border-b border-outline-variant bg-surface"
      style={{
        minHeight: ADMIN_HEADER_H,
        padding: "14px clamp(16px, 3vw, 32px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1520px] min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link
          href="/admin"
          className="flex flex-none items-baseline gap-2.5 text-on-surface"
        >
          <span
            aria-hidden
            className="inline-block size-[11px] shrink-0 rounded-[2px] bg-secondary"
          />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            Unity Grid
          </span>
          <span className="font-label text-[11px] uppercase tracking-[0.1em] text-outline">
            Management
          </span>
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <label className="min-w-0">
            <span className="sr-only">Scope</span>
            <select
              defaultValue="all"
              className="cursor-pointer appearance-none rounded-[10px] border border-outline-strong bg-surface px-3.5 py-2 text-[15px] text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <option value="all">All communities</option>
              {(scopes ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-[15px] font-medium text-on-surface">
                {label}
              </p>
              {email ? (
                <p className="truncate font-label text-[11px] text-outline">
                  {email}
                </p>
              ) : null}
            </div>
            <div className="size-8 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-container-high">
              {avatarUrl ? (
                <Image
                  className="h-full w-full object-cover"
                  alt={`${label} profile photo`}
                  src={avatarUrl}
                  width={32}
                  height={32}
                  unoptimized
                />
              ) : (
                <AvatarFallback label={label} />
              )}
            </div>
          </div>

          <form action={signOutAdmin}>
            <button
              type="submit"
              className="rounded-[10px] border border-outline-strong px-3.5 py-2 text-sm text-on-surface hover:border-outline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
