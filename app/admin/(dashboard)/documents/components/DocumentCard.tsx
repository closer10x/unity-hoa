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
  public: "bg-green-50 text-green-700 border-green-200",
  resident: "bg-blue-50 text-blue-700 border-blue-200",
  board: "bg-amber-50 text-amber-700 border-amber-200",
  manager_only: "bg-purple-50 text-purple-700 border-purple-200",
};

const ACCESS_LABELS: Record<string, string> = {
  public: "Public",
  resident: "Resident",
  board: "Board Only",
  manager_only: "Manager Only",
};

export function DocumentCard({ document: doc, isSelected, onSelect, onClick, onDownload }: Props) {
  const fileInfo = getFileTypeInfo(doc.file_type);
  const expiring = isExpiringSoon(doc.expiration_date);

  return (
    <div
      className={`group relative rounded-xl border bg-white p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
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
      aria-label={`Open ${doc.title}`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(doc.id)}
            className="h-4 w-4 rounded accent-secondary cursor-pointer"
            aria-label={`Select ${doc.title}`}
          />
        </div>
      )}

      {/* Pin indicator */}
      {doc.is_pinned && (
        <span className="absolute top-3 right-3 text-amber-500">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            push_pin
          </span>
        </span>
      )}

      {/* File type icon */}
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-low ${fileInfo.color}`}>
        <span className="material-symbols-outlined text-[28px]">{fileInfo.icon}</span>
      </div>

      {/* Title */}
      <h3 className="font-headline text-sm font-semibold text-on-surface line-clamp-2 leading-snug">
        {doc.title}
      </h3>

      {/* Description */}
      {doc.description && (
        <p className="mt-1 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
          {doc.description}
        </p>
      )}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
          {doc.category.name}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            ACCESS_BADGE_STYLES[doc.access_level] ?? "bg-gray-50 text-gray-700"
          }`}
        >
          {ACCESS_LABELS[doc.access_level]}
        </span>
        {expiring && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
            <span className="material-symbols-outlined text-[12px]">warning</span>
            Expires soon
          </span>
        )}
        {doc.requires_acknowledgment && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-medium text-orange-700">
            <span className="material-symbols-outlined text-[12px]">
              {doc.is_acknowledged ? "check_circle" : "pending"}
            </span>
            {doc.is_acknowledged ? "Acknowledged" : "Action needed"}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-on-surface-variant">
        <span className="tabular-nums">{doc.version}</span>
        <span>·</span>
        <span>{formatBytes(doc.file_size_bytes)}</span>
        <span>·</span>
        <span title={formatDate(doc.uploaded_at)}>{relativeTime(doc.uploaded_at)}</span>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {doc.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-surface-container-low px-1.5 py-0.5 text-[10px] text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-[10px] text-on-surface-variant">+{doc.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats + actions */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">visibility</span>
            {doc.view_count}
          </span>
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">download</span>
            {doc.download_count}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(doc.id);
          }}
          className="rounded-lg p-1.5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-low hover:text-secondary"
          aria-label={`Download ${doc.title}`}
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </div>
    </div>
  );
}
