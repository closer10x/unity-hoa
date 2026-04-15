"use client";

import Link from "next/link";
import { useState } from "react";

import type { CategoryWithCount, DocumentWithCategory } from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { formatDate } from "@/lib/utils/formatDate";
import { getFileTypeInfo } from "@/lib/utils/getFileTypeIcon";
import {
  getDocumentDownloadUrl,
  acknowledgeDocument,
} from "../actions";

type Props = {
  document: DocumentWithCategory;
  categories: CategoryWithCount[];
  totalDocuments: number;
  lastUpdated: string | null;
};

const ACCESS_LABELS: Record<string, string> = {
  public: "Public",
  resident: "Resident",
  board: "Board Only",
  manager_only: "Manager Only",
};

const ACCESS_BADGE_STYLES: Record<string, string> = {
  public: "bg-green-50 text-green-700 border-green-200",
  resident: "bg-blue-50 text-blue-700 border-blue-200",
  board: "bg-amber-50 text-amber-700 border-amber-200",
  manager_only: "bg-purple-50 text-purple-700 border-purple-200",
};

export function DocumentDeepLinkView({ document: doc }: Props) {
  const [hasAcknowledged, setHasAcknowledged] = useState(doc.is_acknowledged ?? false);
  const [isAcking, setIsAcking] = useState(false);
  const fileInfo = getFileTypeInfo(doc.file_type);

  const handleDownload = async () => {
    const res = await getDocumentDownloadUrl(doc.id);
    if (res.url) {
      const a = document.createElement("a");
      a.href = res.url;
      a.download = doc.file_name;
      a.click();
    }
  };

  const handleAcknowledge = async () => {
    setIsAcking(true);
    const res = await acknowledgeDocument(doc.id);
    if (!res.error) setHasAcknowledged(true);
    setIsAcking(false);
  };

  return (
    <div className="flex-1 px-4 pb-8 sm:px-6 lg:px-8 pt-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-on-surface-variant" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/admin/documents" className="hover:text-secondary transition-colors">
              Document Library
            </Link>
          </li>
          <li>
            <span className="material-symbols-outlined text-[14px] align-middle">chevron_right</span>
          </li>
          <li className="text-on-surface font-medium truncate">{doc.title}</li>
        </ol>
      </nav>

      <div className="mx-auto max-w-4xl">
        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low ${fileInfo.color}`}>
              <span className="material-symbols-outlined text-[32px]">{fileInfo.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {doc.is_pinned && (
                  <span className="text-amber-500">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      push_pin
                    </span>
                  </span>
                )}
                <h1 className="font-headline text-xl font-bold text-on-surface">{doc.title}</h1>
              </div>
              {doc.description && (
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{doc.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                  {doc.category.name}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${ACCESS_BADGE_STYLES[doc.access_level]}`}>
                  {ACCESS_LABELS[doc.access_level]}
                </span>
                <span className="text-xs text-on-surface-variant tabular-nums">{doc.version}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-white px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Copy Link
            </button>
          </div>

          {/* Metadata grid */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
            <MetaField label="File Size" value={formatBytes(doc.file_size_bytes)} />
            <MetaField label="Uploaded" value={formatDate(doc.uploaded_at)} />
            <MetaField label="Downloads" value={String(doc.download_count)} />
            <MetaField label="Views" value={String(doc.view_count)} />
            {doc.effective_date && <MetaField label="Effective Date" value={formatDate(doc.effective_date)} />}
            {doc.expiration_date && <MetaField label="Expiration Date" value={formatDate(doc.expiration_date)} />}
          </div>

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgment */}
          {doc.requires_acknowledgment && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                <h3 className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">assignment_late</span>
                  Acknowledgment Required
                </h3>
                {hasAcknowledged ? (
                  <p className="mt-2 text-sm text-green-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    You have acknowledged this document.
                  </p>
                ) : (
                  <button
                    onClick={handleAcknowledge}
                    disabled={isAcking}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-60"
                  >
                    {isAcking ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    )}
                    I have read and understood this document
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-on-surface">{value}</dd>
    </div>
  );
}
