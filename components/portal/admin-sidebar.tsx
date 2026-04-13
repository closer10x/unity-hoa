"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminNotificationsBell } from "@/components/portal/admin-notifications-bell";
import type { AdminNotificationHeaderPayload } from "@/lib/notifications/load";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/finances", label: "Finances", icon: "payments" },
  { href: "/admin/events", label: "Events", icon: "event_available" },
  { href: "/admin/maintenance", label: "Maintenance", icon: "engineering" },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: "campaign",
  },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/settings/employees", label: "Team", icon: "groups" },
] as const;

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAKyeRcbbbK86lsnDXruJxGcVfTZgNV-NvXH3Grz3LJoliD1T8pdrShWEeHo2xtvHOkNGpGq0L-BaeK0C96Xdy8YVu_PcMtB4S7ndocsW8MyTDtT-O5te1F4WXPOig0ePEnel_nv7dvzQ_G1rOSsTRlivN5xdH5YnhtZu81w9LqKMPX4tkeSTQ8Bu_-PFFNqyE5jazQHBoCfUFCKQnXhY5w6YJnxIEUftrnl8rYn2xk2Sh3f9pAlRt2XbrT4IKb30AbKiIoYu_VbFZ6";

type SidebarProps = {
  notifications: AdminNotificationHeaderPayload;
};

export function AdminSidebar({ notifications }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col gap-2 p-6 h-full min-h-screen w-64 fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 z-40">
      <div className="mb-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 bg-primary-container rounded-lg flex items-center justify-center text-secondary-fixed-dim">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              grid_view
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="font-[Manrope] text-lg font-bold text-slate-900 dark:text-white">
              Unity Management
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Community Admin
            </p>
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <AdminNotificationsBell initial={notifications} />
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : href === "/admin/settings"
                ? pathname === "/admin/settings" ||
                  pathname.startsWith("/admin/settings/")
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-[Inter] text-sm font-medium ${
                active
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <Link
          href="/admin/announcements/new"
          className="w-full bg-gradient-to-br from-secondary to-secondary-fixed-dim text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-secondary/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Post update</span>
        </Link>
        <div className="mt-6 flex items-center gap-3 px-2">
          <Image
            className="w-10 h-10 rounded-full object-cover"
            alt="Admin user"
            src={AVATAR}
            width={40}
            height={40}
          />
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold truncate">Signed in</p>
            <p className="text-[10px] text-on-surface-variant truncate">
              Admin portal
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
