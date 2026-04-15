"use client";

import type { DocumentWithCategory } from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { getFileTypeInfo } from "@/lib/utils/getFileTypeIcon";

type Props = {
  documents: DocumentWithCategory[];
  onDocumentClick: (doc: DocumentWithCategory) => void;
};

export function PinnedDocumentsRow({ documents, onDocumentClick }: Props) {
  if (documents.length === 0) return null;

  return (
    <section aria-label="Pinned documents">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined text-[18px] text-amber-500"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          push_pin
        </span>
        <h2 className="text-sm font-semibold text-on-surface">Pinned Documents</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
        {documents.map((doc) => {
          const fileInfo = getFileTypeInfo(doc.file_type);
          return (
            <button
              key={doc.id}
              onClick={() => onDocumentClick(doc)}
              className="group flex min-w-[220px] max-w-[260px] shrink-0 items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ${fileInfo.color}`}>
                <span className="material-symbols-outlined text-[22px]">{fileInfo.icon}</span>
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
  );
}
