import { SettingsSubnav } from "@/components/portal/settings/settings-subnav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Settings
        </h1>
        <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
          Manage your account, portal users, maintenance assignees, community
          profile, and notification preferences.
        </p>
      </div>
      <SettingsSubnav />
      {children}
    </div>
  );
}
