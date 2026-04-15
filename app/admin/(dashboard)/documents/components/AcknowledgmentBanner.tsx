"use client";

import type { DocumentWithCategory } from "@/lib/types/documents";

type Props = {
  documents: DocumentWithCategory[];
  onDocumentClick: (doc: DocumentWithCategory) => void;
};

export function AcknowledgmentBanner({ documents, onDocumentClick }: Props) {
  if (documents.length === 0) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4"
      role="alert"
    >
      <span className="material-symbols-outlined text-[22px] text-orange-600 shrink-0 mt-0.5">
        assignment_late
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-orange-900">
          {documents.length} document{documents.length !== 1 ? "s" : ""} require your acknowledgment
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onDocumentClick(doc)}
              className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-800 transition-colors hover:bg-orange-100"
            >
              {doc.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
