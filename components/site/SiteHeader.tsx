import Link from "next/link";

/**
 * Public site header.
 *
 * The marketing site is out of scope per docs/design/handoff.md, so it is a
 * single landing page — there is no section nav to render. The header carries
 * the wordmark and the two ways into the product.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface px-4 py-4 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
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

        <div className="flex flex-none items-center gap-3.5">
          <Link
            href="/admin/login"
            className="whitespace-nowrap text-[15px] text-on-surface-variant transition-colors hover:text-secondary"
          >
            Sign in
          </Link>
          <Link
            href="/payment"
            className="whitespace-nowrap rounded-full bg-secondary px-5 py-2.5 text-[15px] font-medium text-on-secondary transition-colors hover:bg-secondary-hover"
          >
            Pay HOA fees
          </Link>
        </div>
      </div>
    </header>
  );
}
