import type { Metadata } from "next";

import { NotificationPreferencesForm } from "@/components/portal/settings/notification-preferences-form";

import { getNotificationPreferences } from "./actions";

export const metadata: Metadata = {
  title: "Notifications",
};

export const dynamic = "force-dynamic";

export default async function SettingsNotificationsPage() {
  const res = await getNotificationPreferences();
  if ("error" in res) {
    return (
      <p className="text-error text-sm" role="alert">
        {res.error}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        Notifications
      </h2>
      <p className="text-sm text-on-surface-variant max-w-xl mb-6">
        Control the admin notification bell and optional future email delivery
        by topic. Run the latest database migrations so all preference columns
        exist.
      </p>
      <NotificationPreferencesForm initial={res.row} />
    </div>
  );
}
