"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SettingsNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

const LINKS: SettingsNavLink[] = [
  { href: "/admin/settings", label: "Overview", exact: true },
  { href: "/admin/settings/account", label: "My account" },
  { href: "/admin/settings/users", label: "Users" },
  { href: "/admin/settings/employees", label: "Employees" },
  { href: "/admin/settings/organization", label: "Organization" },
  { href: "/admin/settings/community", label: "Community metrics" },
  { href: "/admin/settings/notifications", label: "Notifications" },
];

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 mb-8 border-b border-outline-variant/30 pb-4"
      aria-label="Settings sections"
    >
      {LINKS.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              active
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
