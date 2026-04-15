"use client";

import { useCallback, useState } from "react";

import type {
  CategoryWithCount,
  DocumentWithCategory,
  DocumentFilters as Filters,
} from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { formatDate, relativeTime, isExpiringSoon } from "@/lib/utils/formatDate";
import { getFileTypeInfo, isPreviewable } from "@/lib/utils/getFileTypeIcon";

import {
  listPublicDocuments,
  getPublicDocumentDownloadUrl,
} from "../actions";

type Props = {
  initialDocuments: DocumentWithCategory[];
  initialTotal: number;
  pinnedDocuments: DocumentWithCategory[];
  categories: CategoryWithCount[];
  totalDocuments: number;
  lastUpdated: string | null;
};

export function PublicDocumentLibraryView({
  initialDocuments,
  initialTotal,
  pinnedDocuments,
  categories,
  totalDocuments,
  lastUpdated,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentWithCategory | null>(null);

  const fetchDocuments = useCallback(async (f: Filters, p: number, append = false) => {
    setIsLoading(true);
    const res = await listPublicDocuments(f, p);
    if (append) {
      setDocuments((prev) => [...prev, ...res.items]);
    } else {
      setDocuments(res.items);
    }
    setTotal(res.total);
    setIsLoading(false);
  }, []);

  const handleSearch = useCallback((val: string) => {
    setSearchInput(val);
    const timeout = setTimeout(() => {
      const f = { ...filters, search: val || undefined };
      setFilters(f);
      setPage(0);
      fetchDocuments(f, 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, fetchDocuments]);

  const handleCategoryChange = useCallback((catId: string | null) => {
    setActiveCategoryId(catId);
    const f = { ...filters, categoryId: catId ?? undefined };
    setFilters(f);
    setPage(0);
    fetchDocuments(f, 0);
  }, [filters, fetchDocuments]);

  const handleSortChange = useCallback((sort: string) => {
    const f = { ...filters, sort: sort as Filters["sort"] };
    setFilters(f);
    setPage(0);
    fetchDocuments(f, 0);
  }, [filters, fetchDocuments]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(filters, nextPage, true);
  }, [page, filters, fetchDocuments]);

  const handleDownload = useCallback(async (id: string) => {
    const res = await getPublicDocumentDownloadUrl(id);
    if (res.url) {
      const doc = documents.find((d) => d.id === id);
      const a = document.createElement("a");
      a.href = res.url;
      a.download = doc?.file_name ?? "document";
      a.click();
    }
  }, [documents]);

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
          Document Library
        </h1>
        <p className="mt-2 text-on-surface-variant">
          {totalDocuments} document{totalDocuments !== 1 ? "s" : ""} available
          {formattedDate ? ` · Last updated ${formattedDate}` : ""}
        </p>
      </div>

      {/* Pinned documents */}
      {pinnedDocuments.length > 0 && (
        <section className="mb-10" aria-label="Pinned documents">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="material-symbols-outlined text-[18px] text-amber-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              push_pin
            </span>
            <h2 className="text-sm font-semibold text-on-surface">Important Documents</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {pinnedDocuments.map((doc) => {
              const fileInfo = getFileTypeInfo(doc.file_type);
              return (
                <button
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="group flex min-w-[240px] max-w-[280px] shrink-0 items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ${fileInfo.color}`}>
                    <span className="material-symbols-outlined text-[24px]">{fileInfo.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface line-clamp-1">{doc.title}</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      {doc.category.name} · {formatBytes(doc.file_size_bytes)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search + Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full rounded-xl border border-outline-variant/50 bg-white py-3 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-shadow"
              aria-label="Search documents"
            />
          </div>
          <select
            value={filters.sort ?? "newest"}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-xl border border-outline-variant/50 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
            aria-label="Sort documents"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="a-z">A → Z</option>
            <option value="most-downloaded">Most downloaded</option>
          </select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategoryId === null
                ? "bg-secondary text-white"
                : "bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low"
            }`}
          >
            All ({totalDocuments})
          </button>
          {categories.filter((c) => c.document_count > 0).map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategoryId === cat.id
                  ? "bg-secondary text-white"
                  : "bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              {cat.name} ({cat.document_count})
            </button>
          ))}
        </div>
      </div>

      {/* Document grid */}
      {isLoading && documents.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-5 h-48">
              <div className="h-12 w-12 rounded-lg bg-surface-container-low mb-3" />
              <div className="h-4 w-3/4 rounded bg-surface-container-low mb-2" />
              <div className="h-3 w-1/2 rounded bg-surface-container-low" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">
              {searchInput || activeCategoryId ? "filter_list_off" : "folder_off"}
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-on-surface">
            {searchInput || activeCategoryId ? "No documents match your filters" : "No documents available yet"}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant max-w-sm">
            {searchInput || activeCategoryId
              ? "Try adjusting your search or selecting a different category."
              : "Community documents will appear here once published by management."}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-on-surface-variant">
            Showing <span className="font-medium text-on-surface">{documents.length}</span> of{" "}
            <span className="font-medium text-on-surface">{total}</span> documents
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <PublicDocumentCard
                key={doc.id}
                document={doc}
                onPreview={() => setPreviewDoc(doc)}
                onDownload={() => handleDownload(doc.id)}
              />
            ))}
          </div>
          {documents.length < total && !isLoading && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="rounded-xl border border-outline-variant/50 bg-white px-6 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                Load more documents
              </button>
            </div>
          )}
          {isLoading && (
            <div className="mt-4 flex justify-center">
              <span className="material-symbols-outlined text-[24px] text-secondary animate-spin">progress_activity</span>
            </div>
          )}
        </>
      )}

      {/* Preview overlay */}
      {previewDoc && (
        <PreviewOverlay
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => handleDownload(previewDoc.id)}
        />
      )}
    </div>
  );
}

/* ─── Card ──────────────────────────────────────────────────────────── */

const ACCESS_LABELS: Record<string, string> = {
  public: "Public",
  resident: "Resident",
};

function PublicDocumentCard({
  document: doc,
  onPreview,
  onDownload,
}: {
  document: DocumentWithCategory;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const fileInfo = getFileTypeInfo(doc.file_type);
  const expiring = isExpiringSoon(doc.expiration_date);

  return (
    <div
      className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      onClick={onPreview}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPreview(); } }}
      aria-label={`Open ${doc.title}`}
    >
      {doc.is_pinned && (
        <span className="absolute top-3 right-3 text-amber-500">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
        </span>
      )}

      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-low ${fileInfo.color}`}>
        <span className="material-symbols-outlined text-[28px]">{fileInfo.icon}</span>
      </div>

      <h3 className="font-headline text-sm font-semibold text-on-surface line-clamp-2 leading-snug">{doc.title}</h3>
      {doc.description && (
        <p className="mt-1 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{doc.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
          {doc.category.name}
        </span>
        {expiring && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
            <span className="material-symbols-outlined text-[12px]">warning</span>
            Expires soon
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-on-surface-variant">
        <span className="tabular-nums">{doc.version}</span>
        <span>·</span>
        <span>{formatBytes(doc.file_size_bytes)}</span>
        <span>·</span>
        <span title={formatDate(doc.uploaded_at)}>{relativeTime(doc.uploaded_at)}</span>
      </div>

      {doc.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {doc.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-surface-container-low px-1.5 py-0.5 text-[10px] text-on-surface-variant">{tag}</span>
          ))}
          {doc.tags.length > 3 && <span className="text-[10px] text-on-surface-variant">+{doc.tags.length - 3}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">download</span>
            {doc.download_count}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="rounded-lg p-1.5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-low hover:text-secondary"
          aria-label={`Download ${doc.title}`}
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Preview overlay ───────────────────────────────────────────────── */

function PreviewOverlay({
  document: doc,
  onClose,
  onDownload,
}: {
  document: DocumentWithCategory;
  onClose: () => void;
  onDownload: () => void;
}) {
  const fileInfo = getFileTypeInfo(doc.file_type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useState(() => {
    if (isPreviewable(doc.file_type)) {
      getPublicDocumentDownloadUrl(doc.id).then((res) => {
        if (res.url) setPreviewUrl(res.url);
      });
    }
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-slide-in-right" role="dialog" aria-label={`Preview: ${doc.title}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low ${fileInfo.color}`}>
              <span className="material-symbols-outlined text-[20px]">{fileInfo.icon}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-on-surface truncate">{doc.title}</h2>
              <p className="text-[11px] text-on-surface-variant">{fileInfo.label} · {formatBytes(doc.file_size_bytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 text-xs font-semibold text-white transition-transform active:scale-95">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close preview">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isPreviewable(doc.file_type) && previewUrl ? (
            doc.file_type === "application/pdf" ? (
              <iframe src={`${previewUrl}#toolbar=1`} className="h-full w-full border-0" title={`Preview of ${doc.title}`} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={doc.title} className="max-h-full max-w-full rounded-lg object-contain shadow-lg" />
              </div>
            )
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low ${fileInfo.color}`}>
                  <span className="material-symbols-outlined text-[48px]">{fileInfo.icon}</span>
                </div>
                <p className="text-sm text-on-surface-variant">Preview is not available for this file type.</p>
                <button onClick={onDownload} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-white px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download to view
                </button>
              </div>

              {/* Details */}
              {doc.description && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Description</h3>
                  <p className="text-sm text-on-surface leading-relaxed">{doc.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Category</dt>
                  <dd className="mt-0.5 text-sm text-on-surface">{doc.category.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Version</dt>
                  <dd className="mt-0.5 text-sm text-on-surface">{doc.version}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">File Size</dt>
                  <dd className="mt-0.5 text-sm text-on-surface">{formatBytes(doc.file_size_bytes)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Uploaded</dt>
                  <dd className="mt-0.5 text-sm text-on-surface">{formatDate(doc.uploaded_at)}</dd>
                </div>
                {doc.effective_date && (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Effective Date</dt>
                    <dd className="mt-0.5 text-sm text-on-surface">{formatDate(doc.effective_date)}</dd>
                  </div>
                )}
              </div>
              {doc.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
