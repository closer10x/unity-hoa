"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CategoryWithCount,
  DocumentWithCategory,
  DocumentFilters as Filters,
} from "@/lib/types/documents";

import { listDocuments, getDocumentDownloadUrl, listAllTags } from "../actions";
import { AcknowledgmentBanner } from "./AcknowledgmentBanner";
import { BulkActionsBar } from "./BulkActionsBar";
import { CategorySidebar, CategoryTabs } from "./CategorySidebar";
import { DocumentFilters } from "./DocumentFilters";
import { DocumentGrid } from "./DocumentGrid";
import { DocumentLibraryHeader } from "./DocumentLibraryHeader";
import { DocumentPreviewDrawer } from "./DocumentPreviewDrawer";
import { DocumentUploadModal } from "./DocumentUploadModal";
import { ManageUploadLinksModal } from "./ManageUploadLinksModal";
import { PendingReviewTab } from "./PendingReviewTab";
import { PinnedDocumentsRow } from "./PinnedDocumentsRow";

type LibraryTab = "documents" | "pending";

type Props = {
  initialDocuments: DocumentWithCategory[];
  initialTotal: number;
  pinnedDocuments: DocumentWithCategory[];
  unacknowledgedDocuments: DocumentWithCategory[];
  categories: CategoryWithCount[];
  totalDocuments: number;
  lastUpdated: string | null;
  initialPendingCount: number;
};

export function DocumentLibraryView({
  initialDocuments,
  initialTotal,
  pinnedDocuments,
  unacknowledgedDocuments,
  categories,
  totalDocuments,
  lastUpdated,
  initialPendingCount,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("doc-view-mode") as "grid" | "list") ?? "grid";
    }
    return "grid";
  });

  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [previewDoc, setPreviewDoc] = useState<DocumentWithCategory | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showManageLinks, setShowManageLinks] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>("documents");
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const handleViewModeChange = useCallback((mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("doc-view-mode", mode);
    }
  }, []);

  const fetchDocuments = useCallback(
    async (f: Filters, p: number, append = false) => {
      setIsLoading(true);
      const res = await listDocuments(f, p);
      if (append) {
        setDocuments((prev) => [...prev, ...res.items]);
      } else {
        setDocuments(res.items);
      }
      setTotal(res.total);
      setIsLoading(false);
    },
    [],
  );

  const handleFiltersChange = useCallback(
    (f: Filters) => {
      setFilters(f);
      setPage(0);
      setSelectedIds(new Set());
      fetchDocuments(f, 0);
    },
    [fetchDocuments],
  );

  const handleCategoryChange = useCallback(
    (categoryId: string | null) => {
      const f = { ...filters, categoryId: categoryId ?? undefined };
      handleFiltersChange(f);
    },
    [filters, handleFiltersChange],
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(filters, nextPage, true);
  }, [page, filters, fetchDocuments]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDownload = useCallback(async (id: string) => {
    const res = await getDocumentDownloadUrl(id);
    if (res.url) {
      const doc = documents.find((d) => d.id === id);
      const a = document.createElement("a");
      a.href = res.url;
      a.download = doc?.file_name ?? "document";
      a.click();
    }
  }, [documents]);

  const handleDocumentClick = useCallback((doc: DocumentWithCategory) => {
    setPreviewDoc(doc);
  }, []);

  const previewIndex = previewDoc ? documents.findIndex((d) => d.id === previewDoc.id) : -1;

  const handlePrevious = useCallback(() => {
    if (previewIndex > 0) setPreviewDoc(documents[previewIndex - 1]);
  }, [previewIndex, documents]);

  const handleNext = useCallback(() => {
    if (previewIndex < documents.length - 1) setPreviewDoc(documents[previewIndex + 1]);
  }, [previewIndex, documents]);

  const handleUploadOpen = useCallback(async () => {
    const tags = await listAllTags();
    setExistingTags(tags);
    setShowUpload(true);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    fetchDocuments(filters, 0);
  }, [filters, fetchDocuments]);

  const handleBulkComplete = useCallback(() => {
    fetchDocuments(filters, 0);
  }, [filters, fetchDocuments]);

  const hasFilters = Boolean(
    filters.search || filters.categoryId || filters.accessLevel ||
    filters.fileType || filters.dateRange || filters.showArchived,
  );

  return (
    <div className="flex-1 px-4 pb-8 sm:px-6 lg:px-8 pt-6">
      {/* Header */}
      <DocumentLibraryHeader
        totalDocuments={totalDocuments}
        lastUpdated={lastUpdated}
        onUploadClick={handleUploadOpen}
        onManageLinksClick={() => setShowManageLinks(true)}
        pendingCount={pendingCount}
      />

      {/* Tabs: Documents / Pending Review */}
      <div className="mt-6 flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("documents")}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "text-secondary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Documents
          {activeTab === "documents" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-secondary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "text-secondary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Pending Review
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold min-w-[20px] h-5 px-1.5">
              {pendingCount}
            </span>
          )}
          {activeTab === "pending" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-secondary rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "documents" ? (
        <>
          {/* Acknowledgment banner */}
          <div className="mt-6">
            <AcknowledgmentBanner
              documents={unacknowledgedDocuments}
              onDocumentClick={handleDocumentClick}
            />
          </div>

          {/* Pinned documents */}
          {pinnedDocuments.length > 0 && (
            <div className="mt-6">
              <PinnedDocumentsRow
                documents={pinnedDocuments}
                onDocumentClick={handleDocumentClick}
              />
            </div>
          )}

          {/* Category tabs (mobile) */}
          <div className="mt-6">
            <CategoryTabs
              categories={categories}
              activeCategoryId={filters.categoryId ?? null}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* Filters */}
          <div className="mt-4">
            <DocumentFilters
              categories={categories}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>

          {/* Main content area */}
          <div className="mt-6 flex gap-8">
            {/* Sidebar (desktop) */}
            <CategorySidebar
              categories={categories}
              activeCategoryId={filters.categoryId ?? null}
              onCategoryChange={handleCategoryChange}
            />

            {/* Document grid / list */}
            <div className="min-w-0 flex-1">
              <DocumentGrid
                documents={documents}
                total={total}
                viewMode={viewMode}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onDocumentClick={handleDocumentClick}
                onDownload={handleDownload}
                onLoadMore={handleLoadMore}
                isLoading={isLoading}
                hasFilters={hasFilters}
                onClearFilters={() => handleFiltersChange({})}
              />
            </div>
          </div>

          {/* Bulk actions */}
          <BulkActionsBar
            selectedIds={selectedIds}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              icon: c.icon,
              sort_order: c.sort_order,
              created_at: c.created_at,
            }))}
            onClearSelection={() => setSelectedIds(new Set())}
            onActionComplete={handleBulkComplete}
          />
        </>
      ) : (
        <div className="mt-6">
          <PendingReviewTab
            categories={categories}
            pendingCount={pendingCount}
            onCountChange={setPendingCount}
          />
        </div>
      )}

      {/* Preview drawer */}
      <DocumentPreviewDrawer
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={previewIndex > 0}
        hasNext={previewIndex < documents.length - 1}
      />

      {/* Upload modal */}
      <DocumentUploadModal
        categories={categories}
        existingTags={existingTags}
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Manage Upload Links modal */}
      <ManageUploadLinksModal
        isOpen={showManageLinks}
        onClose={() => setShowManageLinks(false)}
        categories={categories}
      />
    </div>
  );
}
