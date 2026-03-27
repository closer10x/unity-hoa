"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateNotificationPreferences } from "@/app/admin/(dashboard)/settings/notifications/actions";
import type { NotificationPreferencesRow } from "@/lib/types/settings";

type Props = {
  initial: NotificationPreferencesRow;
};

export function NotificationPreferencesForm({ initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const r = await updateNotificationPreferences(
      new FormData(e.currentTarget),
    );
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setMsg("Preferences saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
          In-app (header bell)
        </h3>
        <p className="text-xs text-on-surface-variant">
          Controls which items appear in your admin notification list.
        </p>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="announcements"
            defaultChecked={initial.announcements}
            className="rounded border-outline-variant w-4 h-4"
          />
          Community announcements
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="maintenance_updates"
            defaultChecked={initial.maintenance_updates}
            className="rounded border-outline-variant w-4 h-4"
          />
          Maintenance / work orders (new orders, updates, photos, due dates)
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="events"
            defaultChecked={initial.events}
            className="rounded border-outline-variant w-4 h-4"
          />
          Community calendar events
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="billing_reminders"
            defaultChecked={initial.billing_reminders}
            className="rounded border-outline-variant w-4 h-4"
          />
          Billing &amp; finance alerts (when available)
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
          Email (optional)
        </h3>
        <p className="text-xs text-on-surface-variant">
          Stored for future delivery. Sending email requires Supabase Auth / SMTP
          configuration.
        </p>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="email_announcements"
            defaultChecked={initial.email_announcements}
            className="rounded border-outline-variant w-4 h-4"
          />
          Email: announcements
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="email_maintenance_updates"
            defaultChecked={initial.email_maintenance_updates}
            className="rounded border-outline-variant w-4 h-4"
          />
          Email: maintenance / work orders
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="email_events"
            defaultChecked={initial.email_events}
            className="rounded border-outline-variant w-4 h-4"
          />
          Email: events
        </label>
        <label className="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            name="email_billing_reminders"
            defaultChecked={initial.email_billing_reminders}
            className="rounded border-outline-variant w-4 h-4"
          />
          Email: billing reminders
        </label>
      </section>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
      >
        Save preferences
      </button>
      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {msg ? <p className="text-secondary text-sm">{msg}</p> : null}
    </form>
  );
}
