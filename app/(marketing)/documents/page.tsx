import type { Metadata } from "next";

import { isSupabaseConfigured } from "@/lib/supabase/server";

import {
  listPublicCategories,
  listPublicDocuments,
  listPublicPinnedDocuments,
  getPublicDocumentStats,
} from "./actions";
import { PublicDocumentLibraryView } from "./components/PublicDocumentLibraryView";

export const metadata: Metadata = {
  title: "Document Library",
};

export const dynamic = "force-dynamic";

export default async function PublicDocumentLibraryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-20 text-center">
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-surface-container-low">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">folder_off</span>
        </div>
        <h1 className="mt-4 font-headline text-2xl font-bold text-on-surface">Document Library</h1>
        <p className="mt-2 text-on-surface-variant">
          The document library is being set up. Please check back soon.
        </p>
      </div>
    );
  }

  const [categories, { items, total }, pinned, stats] = await Promise.all([
    listPublicCategories(),
    listPublicDocuments({}, 0),
    listPublicPinnedDocuments(),
    getPublicDocumentStats(),
  ]);

  return (
    <PublicDocumentLibraryView
      initialDocuments={items}
      initialTotal={total}
      pinnedDocuments={pinned}
      categories={categories}
      totalDocuments={stats.totalDocuments}
      lastUpdated={stats.lastUpdated}
    />
  );
}
