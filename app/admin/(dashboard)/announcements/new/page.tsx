import type { Metadata } from "next";
import Link from "next/link";

import { AnnouncementForm } from "@/components/portal/announcements/announcement-form";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New announcement",
};

export default async function NewAnnouncementPage() {
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
        href="/admin/announcements"
        className="text-sm font-semibold text-secondary hover:underline inline-flex items-center gap-1 mb-6"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to announcements
      </Link>
      <h1 className="text-2xl font-headline font-bold text-on-surface mb-8">New announcement</h1>
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <AnnouncementForm mode="create" />
      </div>
    </div>
  );
}
