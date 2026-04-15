"use client";

import type { DocumentWithCategory } from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { formatDate, relativeTime, isExpiringSoon } from "@/lib/utils/formatDate";
import { getFileTypeInfo } from "@/lib/utils/getFileTypeIcon";

type Props = {
  document: DocumentWithCategory;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onClick: (doc: DocumentWithCategory) => void;
  onDownload: (id: string) => void;
};

const ACCESS_BADGE_STYLES: Record<string, string> = {
  public: "bg-green-50 text-green-700",
  resident: "bg-blue-50 text-blue-700",
  board: "bg-amber-50 text-amber-700",
  manager_only: "bg-purple-50 text-purple-700",
};

const ACCESS_LABELS: Record<string, string> = {
  public: "Public",
  resident: "Resident",
  board: "Board Only",
  manager_only: "Manager Only",
};

export function DocumentListRow({ document: doc, isSelected, onSelect, onClick, onDownload }: Props) {
  const fileInfo = getFileTypeInfo(doc.file_type);
  const expiring = isExpiringSoon(doc.expiration_date);

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border bg-white px-4 py-3 transition-all duration-200 hover:shadow-sm cursor-pointer ${
        isSelected
          ? "border-secondary ring-2 ring-secondary/20"
          : "border-gray-200 hover:border-gray-300"
      } ${doc.is_pinned ? "bg-amber-50/30" : ""}`}
      onClick={() => onClick(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(doc);
        }
      }}
    >
      {/* Checkbox */}
      {onSelect && (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(doc.id)}
            className="h-4 w-4 rounded accent-secondary cursor-pointer shrink-0"
            aria-label={`Select ${doc.title}`}
          />
        </div>
      )}

      {/* File icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low ${fileInfo.color}`}>
        <span className="material-symbols-outlined text-[24px]">{fileInfo.icon}</span>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {doc.is_pinned && (
            <span className="text-amber-500">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                push_pin
              </span>
            </span>
          )}
          <h3 className="text-sm font-semibold text-on-surface truncate">{doc.title}</h3>
        </div>
        {doc.description && (
          <p className="mt-0.5 text-xs text-on-surface-variant truncate">{doc.description}</p>
        )}
      </div>

      {/* Category */}
      <span className="hidden md:inline-flex items-center rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        {doc.category.name}
      </span>

      {/* Access */}
      <span
        className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0 ${
          ACCESS_BADGE_STYLES[doc.access_level]
        }`}
      >
        {ACCESS_LABELS[doc.access_level]}
      </span>

      {/* Expiration warning */}
      {expiring && (
        <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0" title="Expires soon">
          warning
        </span>
      )}

      {/* Acknowledgment */}
      {doc.requires_acknowledgment && (
        <span
          className={`material-symbols-outlined text-[18px] shrink-0 ${
            doc.is_acknowledged ? "text-green-600" : "text-orange-500"
          }`}
          style={doc.is_acknowledged ? { fontVariationSettings: "'FILL' 1" } : {}}
          title={doc.is_acknowledged ? "Acknowledged" : "Acknowledgment required"}
        >
          {doc.is_acknowledged ? "check_circle" : "pending"}
        </span>
      )}

      {/* Meta */}
      <div className="hidden lg:flex items-center gap-3 text-[11px] text-on-surface-variant tabular-nums shrink-0">
        <span>{doc.version}</span>
        <span>{formatBytes(doc.file_size_bytes)}</span>
        <span title={formatDate(doc.uploaded_at)}>{relativeTime(doc.uploaded_at)}</span>
      </div>

      {/* Stats */}
      <div className="hidden xl:flex items-center gap-2 text-[11px] text-on-surface-variant shrink-0">
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          {doc.view_count}
        </span>
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">download</span>
          {doc.download_count}
        </span>
      </div>

      {/* Download */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload(doc.id);
        }}
        className="rounded-lg p-1.5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-low hover:text-secondary shrink-0"
        aria-label={`Download ${doc.title}`}
      >
        <span className="material-symbols-outlined text-[20px]">download</span>
      </button>
    </div>
  );
}
