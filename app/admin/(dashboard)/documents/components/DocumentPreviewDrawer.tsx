"use client";

import { useCallback, useEffect, useState } from "react";

import type { DocumentWithCategory, AcknowledgmentWithUser } from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { formatDate } from "@/lib/utils/formatDate";
import { getFileTypeInfo, isPreviewable } from "@/lib/utils/getFileTypeIcon";
import {
  getDocumentDownloadUrl,
  incrementViewCount,
  acknowledgeDocument,
  getDocumentAcknowledgments,
} from "../actions";

type Props = {
  document: DocumentWithCategory | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

const ACCESS_LABELS: Record<string, string> = {
  public: "Public",
  resident: "Resident",
  board: "Board Only",
  manager_only: "Manager Only",
};

export function DocumentPreviewDrawer({
  document: doc,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(doc?.is_acknowledged ?? false);
  const [acknowledgments, setAcknowledgments] = useState<AcknowledgmentWithUser[]>([]);
  const [showAckReport, setShowAckReport] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "details">("preview");

  useEffect(() => {
    if (!doc) {
      setPreviewUrl(null);
      return;
    }

    setHasAcknowledged(doc.is_acknowledged ?? false);
    setShowAckReport(false);
    setActiveTab("preview");

    incrementViewCount(doc.id);

    if (isPreviewable(doc.file_type)) {
      getDocumentDownloadUrl(doc.id).then((res) => {
        if (res.url) setPreviewUrl(res.url);
      });
    } else {
      setPreviewUrl(null);
    }
  }, [doc?.id]);

  const handleDownload = useCallback(async () => {
    if (!doc) return;
    const res = await getDocumentDownloadUrl(doc.id);
    if (res.url) {
      const a = document.createElement("a");
      a.href = res.url;
      a.download = doc.file_name;
      a.click();
    }
  }, [doc]);

  const handleAcknowledge = useCallback(async () => {
    if (!doc) return;
    setIsAcknowledging(true);
    const res = await acknowledgeDocument(doc.id);
    if (!res.error) setHasAcknowledged(true);
    setIsAcknowledging(false);
  }, [doc]);

  const loadAckReport = useCallback(async () => {
    if (!doc) return;
    setShowAckReport(true);
    const data = await getDocumentAcknowledgments(doc.id);
    setAcknowledgments(data);
  }, [doc]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrevious) onPrevious?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    if (doc) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [doc, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!doc) return null;

  const fileInfo = getFileTypeInfo(doc.file_type);
  const canPreview = isPreviewable(doc.file_type);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-slide-in-right"
        role="dialog"
        aria-label={`Preview: ${doc.title}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {(hasPrevious || hasNext) && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
                  aria-label="Previous document"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
                  aria-label="Next document"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            )}
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low ${fileInfo.color}`}>
              <span className="material-symbols-outlined text-[20px]">{fileInfo.icon}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-on-surface truncate">{doc.title}</h2>
              <p className="text-[11px] text-on-surface-variant">{fileInfo.label} · {formatBytes(doc.file_size_bytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low"
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "preview"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "preview" ? (
            <div className="h-full">
              {canPreview && previewUrl ? (
                doc.file_type === "application/pdf" ? (
                  <iframe
                    src={`${previewUrl}#toolbar=1`}
                    className="h-full w-full border-0"
                    title={`Preview of ${doc.title}`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 bg-surface-container-low">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={doc.title}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                    />
                  </div>
                )
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low ${fileInfo.color}`}>
                    <span className="material-symbols-outlined text-[48px]">{fileInfo.icon}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Preview is not available for this file type.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-white px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download to view
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <MetaField label="Category" value={doc.category.name} />
                <MetaField label="Access Level" value={ACCESS_LABELS[doc.access_level]} />
                <MetaField label="Version" value={doc.version} />
                <MetaField label="File Type" value={fileInfo.label} />
                <MetaField label="File Size" value={formatBytes(doc.file_size_bytes)} />
                <MetaField label="Uploaded" value={formatDate(doc.uploaded_at)} />
                {doc.effective_date && <MetaField label="Effective Date" value={formatDate(doc.effective_date)} />}
                {doc.expiration_date && <MetaField label="Expiration Date" value={formatDate(doc.expiration_date)} />}
                <MetaField label="Downloads" value={String(doc.download_count)} />
                <MetaField label="Views" value={String(doc.view_count)} />
              </div>

              {/* Description */}
              {doc.description && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Description
                  </h3>
                  <p className="text-sm text-on-surface leading-relaxed">{doc.description}</p>
                </div>
              )}

              {/* Tags */}
              {doc.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledgment section */}
              {doc.requires_acknowledgment && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                  <h3 className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">assignment_late</span>
                    Acknowledgment Required
                  </h3>
                  {hasAcknowledged ? (
                    <p className="mt-2 text-sm text-green-700 flex items-center gap-1.5">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      You have acknowledged this document.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <button
                        onClick={handleAcknowledge}
                        disabled={isAcknowledging}
                        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-60"
                      >
                        {isAcknowledging ? (
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        )}
                        I have read and understood this document
                      </button>
                    </div>
                  )}
                  {!showAckReport && (
                    <button
                      onClick={loadAckReport}
                      className="mt-3 text-xs font-medium text-orange-700 underline underline-offset-2 hover:text-orange-900"
                    >
                      View acknowledgment report
                    </button>
                  )}
                  {showAckReport && (
                    <div className="mt-3 border-t border-orange-200 pt-3">
                      <p className="text-xs font-semibold text-orange-900 mb-2">
                        {acknowledgments.length} acknowledgment{acknowledgments.length !== 1 ? "s" : ""}
                      </p>
                      {acknowledgments.length > 0 ? (
                        <ul className="space-y-1">
                          {acknowledgments.map((ack) => (
                            <li key={ack.id} className="flex items-center justify-between text-xs">
                              <span className="text-on-surface">{ack.user_display_name ?? "User"}</span>
                              <span className="text-on-surface-variant tabular-nums">
                                {formatDate(ack.acknowledged_at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-on-surface-variant">No acknowledgments yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-on-surface">{value}</dd>
    </div>
  );
}
