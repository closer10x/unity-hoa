"use client";

import { useState } from "react";

import type { DocumentCategoryRow } from "@/lib/types/documents";
import { archiveDocuments, deleteDocuments } from "../actions";

type Props = {
  selectedIds: Set<string>;
  categories: DocumentCategoryRow[];
  onClearSelection: () => void;
  onActionComplete: () => void;
};

export function BulkActionsBar({ selectedIds, categories, onClearSelection, onActionComplete }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleArchive = async () => {
    setIsProcessing(true);
    await archiveDocuments([...selectedIds]);
    setIsProcessing(false);
    onClearSelection();
    onActionComplete();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${count} document${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setIsProcessing(true);
    await deleteDocuments([...selectedIds]);
    setIsProcessing(false);
    onClearSelection();
    onActionComplete();
  };

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-fit">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
        <span className="text-sm font-medium text-on-surface">
          {count} selected
        </span>

        <div className="h-5 w-px bg-gray-200" />

        <button
          onClick={handleArchive}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">archive</span>
          Archive
        </button>

        <button
          onClick={handleDelete}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          Delete
        </button>

        <div className="h-5 w-px bg-gray-200" />

        <button
          onClick={onClearSelection}
          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low"
          aria-label="Clear selection"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
