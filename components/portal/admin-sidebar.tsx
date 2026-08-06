"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminNotificationsBell } from "@/components/portal/admin-notifications-bell";
import type { AdminNotificationHeaderPayload } from "@/lib/notifications/load";

/**
 * Admin nav groups, verbatim from docs/design/handoff.md:
 *   Today · Money · Property · People · Office
 *
 * No icons anywhere — the handoff is explicit that no icon set is used and
 * status is carried by colour and mono text labels.
 *
 * Sections marked `built: false` are specified in the handoff but not yet
 * implemented; they render as disabled so the information architecture is
 * visible without linking to a 404.
 */
export const NAV_GROUPS = [
  {
    group: "Today",
    items: [
      { href: "/admin", label: "Dashboard", built: true },
      { href: "/admin/calendar", label: "Calendar", built: false },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/admin/finances", label: "Accounting", built: true },
      { href: "/admin/legal", label: "Legal & liens", built: true },
    ],
  },
  {
    group: "Property",
    items: [
      { href: "/admin/maintenance", label: "Work orders", built: true },
      { href: "/admin/architectural", label: "Architectural", built: true },
      { href: "/admin/violations", label: "Violations", built: true },
      { href: "/admin/bookings", label: "Bookings", built: true },
      { href: "/admin/vendors", label: "Vendors", built: true },
    ],
  },
  {
    group: "People",
    items: [
      { href: "/admin/owners", label: "Owners", built: true },
      { href: "/admin/announcements", label: "Communications", built: true },
      { href: "/admin/board", label: "Board & meetings", built: true },
    ],
  },
  {
    group: "Office",
    items: [
      { href: "/admin/documents", label: "Documents", built: true },
      { href: "/admin/communities", label: "Communities", built: true },
      { href: "/admin/settings/employees", label: "Team", built: true },
    ],
  },
] as const;

type SidebarProps = {
  notifications: AdminNotificationHeaderPayload;
};

function isActive(href: string, pathname: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ notifications }: SidebarProps) {
  const pathname = usePathname();

  return (
    /* Handoff shell: an in-flow sticky column, flex 1 1 236px, capped at
       236px, laid out as a grid with 10px between groups. Not a fixed rail —
       and no media queries, so it wraps intrinsically below ~700px. */
    <aside
      className="sticky top-[88px] grid min-w-0 content-start gap-2.5 self-start"
      style={{ flex: "1 1 236px", maxWidth: "236px" }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link href="/admin" className="flex min-w-0 items-baseline gap-2.5">
          <span
            aria-hidden
            className="inline-block size-[11px] shrink-0 rounded-[2px] bg-secondary"
          />
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold tracking-[-0.01em] text-on-surface">
              Unity Grid
            </span>
            <span className="mt-0.5 block font-label text-[10px] uppercase tracking-[0.12em] text-outline">
              Management
            </span>
          </span>
        </Link>
        <div className="shrink-0 pt-0.5">
          <AdminNotificationsBell initial={notifications} />
        </div>
      </div>

      <nav className="grid content-start gap-2.5">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group} className="grid content-start gap-1">
            <p className="mb-1 px-3 font-label text-[10px] uppercase tracking-[0.12em] text-outline">
              {group}
            </p>
            {items.map((item) =>
              item.built ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href, pathname) ? "page" : undefined}
                  className={
                    isActive(item.href, pathname)
                      ? "rounded-[10px] border border-accent-tint-border bg-secondary-container px-3 py-2.5 text-[15px] font-semibold text-on-secondary-container"
                      : "rounded-[10px] px-3 py-2.5 text-[15px] text-on-surface-variant hover:bg-row-hover hover:text-on-surface"
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.href}
                  aria-disabled
                  title="Specified in the handoff — not built yet"
                  className="flex items-baseline justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[15px] text-outline"
                >
                  {item.label}
                  <span className="font-label text-[10px] uppercase tracking-[0.12em]">
                    Soon
                  </span>
                </span>
              ),
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
