import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import {
  listCategories,
  listDocuments,
  listPinnedDocuments,
  listUnacknowledgedDocuments,
  getDocumentStats,
} from "./actions";
import { getPendingCount } from "./upload-link-actions";
import { DocumentLibraryView } from "./components/DocumentLibraryView";

export const metadata: Metadata = {
  title: "Document Library",
};

export const dynamic = "force-dynamic";

export default async function DocumentLibraryPage() {
  await requireAdminUser();
  const supabaseReady = isSupabaseConfigured();

  if (!supabaseReady) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-on-surface-variant">
          Supabase is not configured. Connect your database to use the Document Library.
        </p>
      </div>
    );
  }

  const session = await requireAdminUser();
  const [categories, { items, total }, pinned, unacknowledged, stats, pendingCount] = await Promise.all([
    listCategories(),
    listDocuments({}, 0),
    listPinnedDocuments(),
    listUnacknowledgedDocuments(session.user.id),
    getDocumentStats(),
    getPendingCount(),
  ]);

  return (
    <DocumentLibraryView
      initialDocuments={items}
      initialTotal={total}
      pinnedDocuments={pinned}
      unacknowledgedDocuments={unacknowledged}
      categories={categories}
      totalDocuments={stats.totalDocuments}
      lastUpdated={stats.lastUpdated}
      initialPendingCount={pendingCount}
    />
  );
}
