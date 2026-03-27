import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAnnouncement } from "@/app/admin/(dashboard)/announcements/actions";
import { AnnouncementForm } from "@/components/portal/announcements/announcement-form";
import { SupabaseNotConfigured } from "@/components/portal/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: "Edit announcement" };
  const r = await getAnnouncement(id);
  if ("error" in r) return { title: "Edit announcement" };
  return { title: `Edit · ${r.row.title}` };
}

export default async function EditAnnouncementPage({ params }: Props) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const r = await getAnnouncement(id);
  if ("error" in r) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/admin/announcements"
        className="text-sm font-semibold text-secondary hover:underline inline-flex items-center gap-1 mb-6"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to announcements
      </Link>
      <h1 className="text-2xl font-headline font-bold text-on-surface mb-8">Edit announcement</h1>
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <AnnouncementForm mode="edit" initial={r.row} />
      </div>
    </div>
  );
}
