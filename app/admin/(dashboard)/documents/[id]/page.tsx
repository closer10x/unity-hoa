import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import { getDocument, listCategories, getDocumentStats } from "../actions";
import { DocumentDeepLinkView } from "./DocumentDeepLinkView";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: "Document" };

  const doc = await getDocument(id);
  return { title: doc?.title ?? "Document" };
}

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: Props) {
  await requireAdminUser();
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-on-surface-variant">Supabase is not configured.</p>
      </div>
    );
  }

  const [doc, categories, stats] = await Promise.all([
    getDocument(id),
    listCategories(),
    getDocumentStats(),
  ]);

  if (!doc) notFound();

  return (
    <DocumentDeepLinkView
      document={doc}
      categories={categories}
      totalDocuments={stats.totalDocuments}
      lastUpdated={stats.lastUpdated}
    />
  );
}
