import type { Metadata } from "next";
import Link from "next/link";

import { EventForm } from "@/components/portal/events/event-form";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New event",
};

export default async function NewEventPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/admin/events"
        className="text-sm font-semibold text-secondary hover:underline inline-flex items-center gap-1 mb-6"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to events
      </Link>
      <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Post new event</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Times are captured from your browser and stored in UTC.
      </p>
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <EventForm mode="create" />
      </div>
    </div>
  );
}
