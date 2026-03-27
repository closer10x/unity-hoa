import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
};

const CARDS = [
  {
    href: "/admin/settings/account",
    title: "My account",
    description: "Email, password, and display name for your admin login.",
    icon: "person",
  },
  {
    href: "/admin/settings/users",
    title: "Users",
    description:
      "Create administrator or basic (HOA staff) accounts for the portal.",
    icon: "group_add",
  },
  {
    href: "/admin/settings/employees",
    title: "Employees & assignments",
    description:
      "Maintenance roster used when assigning work orders to team members.",
    icon: "engineering",
  },
  {
    href: "/admin/settings/organization",
    title: "Organization",
    description: "Association name, support contact, address, and timezone.",
    icon: "apartment",
  },
  {
    href: "/admin/settings/community",
    title: "Community metrics",
    description:
      "Dashboard headline numbers: residents, dues, reserve fund, and related copy.",
    icon: "tune",
  },
  {
    href: "/admin/settings/notifications",
    title: "Notifications",
    description: "Email preferences for announcements, maintenance, and billing.",
    icon: "notifications",
  },
] as const;

export default function SettingsHubPage() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {CARDS.map(({ href, title, description, icon }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm hover:border-secondary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-3xl text-secondary group-hover:scale-105 transition-transform">
              {icon}
            </span>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                {title}
              </h2>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
