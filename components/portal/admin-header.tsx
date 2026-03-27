import Image from "next/image";
import Link from "next/link";

import { signOutAdmin } from "@/app/admin/(dashboard)/sign-out-action";
import { AdminNotificationsBell } from "@/components/portal/admin-notifications-bell";
import type { AdminNotificationHeaderPayload } from "@/lib/notifications/load";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD4uNQFG_uDNaEUK1fP1sB4yGWV0uKkc06Mq6i5mpB6_I1mJJBndpoFugdXbVIwsEyAO9FPthcrVMdaMtrbR0qYjB05MFPenWqMlAM2BYiSSX7nQkznrv9HtwbJYc5dUfW8Hp7wZqBxi677dDEahpMIUSxCNtSG4xhfsRReXe6QMn-Z-iY0mz1Lhal8_R3YmPj5OJtNwvcXAdSGLgnl4ZkOVFPRzbKGOHPwEHuK6yAW4elJEC0B0y9F7WJw4wiczNIQZmTQ__DRTlum";

type Props = {
  email?: string;
  displayName?: string;
  notifications: AdminNotificationHeaderPayload;
};

export function AdminHeader({ email, displayName, notifications }: Props) {
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
        <AdminNotificationsBell initial={notifications} />
        <Link
          href="/admin/settings"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </Link>
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
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/20 shrink-0">
          <Image
            className="w-full h-full object-cover"
            alt=""
            src={AVATAR}
            width={32}
            height={32}
          />
        </div>
      </div>
    </header>
  );
}
