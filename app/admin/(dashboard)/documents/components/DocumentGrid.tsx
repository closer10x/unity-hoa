"use client";

import type { DocumentWithCategory } from "@/lib/types/documents";
import { DocumentCard } from "./DocumentCard";
import { DocumentListRow } from "./DocumentListRow";
import { EmptyState } from "./EmptyState";

type Props = {
  documents: DocumentWithCategory[];
  total: number;
  viewMode: "grid" | "list";
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onDocumentClick: (doc: DocumentWithCategory) => void;
  onDownload: (id: string) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function DocumentGrid({
  documents,
  total,
  viewMode,
  selectedIds,
  onSelect,
  onDocumentClick,
  onDownload,
  onLoadMore,
  isLoading,
  hasFilters,
  onClearFilters,
}: Props) {
  if (!isLoading && documents.length === 0) {
    return <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />;
  }

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          Showing <span className="font-medium text-on-surface">{documents.length}</span> of{" "}
          <span className="font-medium text-on-surface">{total}</span> document{total !== 1 ? "s" : ""}
        </p>
        {selectedIds.size > 0 && (
          <p className="text-xs font-medium text-secondary">
            {selectedIds.size} selected
          </p>
        )}
      </div>

      {/* Grid / List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedIds.has(doc.id)}
              onSelect={onSelect}
              onClick={onDocumentClick}
              onDownload={onDownload}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentListRow
              key={doc.id}
              document={doc}
              isSelected={selectedIds.has(doc.id)}
              onSelect={onSelect}
              onClick={onDocumentClick}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}

      {/* Skeleton loaders */}
      {isLoading && (
        <div className={viewMode === "grid" ? "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "mt-2 space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-xl border border-gray-100 bg-white ${
                viewMode === "grid" ? "p-4 h-48" : "px-4 py-3 h-16 flex items-center gap-4"
              }`}
            >
              <div className={`rounded-lg bg-surface-container-low ${viewMode === "grid" ? "h-12 w-12 mb-3" : "h-10 w-10 shrink-0"}`} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-container-low" />
                <div className="h-3 w-1/2 rounded bg-surface-container-low" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {documents.length < total && !isLoading && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onLoadMore}
            className="rounded-lg border border-outline-variant/50 bg-white px-6 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Load more documents
          </button>
        </div>
      )}
    </div>
  );
}
