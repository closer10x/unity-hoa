import Image from "next/image";

import { signOutAdmin } from "@/app/admin/(dashboard)/sign-out-action";

type Props = {
  email?: string;
  displayName?: string;
  /** Signed storage URL; omit to show initial fallback */
  avatarUrl?: string;
};

function AvatarFallback({ label }: { label: string }) {
  const ch = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex w-full h-full items-center justify-center bg-secondary/15 text-secondary text-[11px] font-bold">
      {ch}
    </span>
  );
}

export function AdminHeader({ email, displayName, avatarUrl }: Props) {
  const label = displayName?.trim() || email || "Admin";

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-8 py-4 w-full bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 shadow-xl shadow-slate-200/50 dark:shadow-none">
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center bg-surface-container-high px-4 py-2 rounded-full w-96">
          <span className="material-symbols-outlined text-on-surface-variant mr-2">
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant"
            placeholder="Search community data..."
            type="search"
            aria-label="Search community data"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-secondary px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
        <div className="hidden sm:flex flex-col items-end max-w-[140px] mr-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full text-right">
            {label}
          </span>
          {email ? (
            <span className="text-[10px] text-slate-500 truncate w-full text-right">
              {email}
            </span>
          ) : null}
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/20 shrink-0 bg-surface-container-highest">
          {avatarUrl ? (
            <Image
              className="w-full h-full object-cover"
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
    </header>
  );
}
