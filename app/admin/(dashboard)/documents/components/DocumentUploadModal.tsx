"use client";

import { useCallback, useRef, useState } from "react";

import type { DocumentCategoryRow, DocumentAccessLevel } from "@/lib/types/documents";
import { formatBytes } from "@/lib/utils/formatBytes";
import { getFileTypeInfo, getFileTypeFromName } from "@/lib/utils/getFileTypeIcon";
import { uploadDocument } from "../actions";

type Props = {
  categories: DocumentCategoryRow[];
  existingTags: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
];

const MAX_SIZE = 50 * 1024 * 1024;

type FileEntry = {
  file: File;
  title: string;
  categoryId: string;
  accessLevel: DocumentAccessLevel;
  description: string;
  version: string;
  effectiveDate: string;
  expirationDate: string;
  tags: string;
  isPinned: boolean;
  requiresAck: boolean;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

export function DocumentUploadModal({ categories, existingTags, isOpen, onClose, onSuccess }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = entries.some((e) => e.status === "uploading");

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newEntries: FileEntry[] = [];
      for (const file of Array.from(files)) {
        const mime = file.type || getFileTypeFromName(file.name);
        if (!ALLOWED_TYPES.includes(mime) && !mime.startsWith("image/")) continue;
        if (file.size > MAX_SIZE) continue;

        const titleFromName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        newEntries.push({
          file,
          title: titleFromName,
          categoryId: categories[0]?.id ?? "",
          accessLevel: "resident",
          description: "",
          version: "v1.0",
          effectiveDate: "",
          expirationDate: "",
          tags: "",
          isPinned: false,
          requiresAck: false,
          status: "pending",
          progress: 0,
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
    },
    [categories],
  );

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx: number, updates: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...updates } : e)));
  };

  const handleUploadAll = async () => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status !== "pending") continue;

      updateEntry(i, { status: "uploading", progress: 50 });

      const fd = new FormData();
      fd.set("file", entry.file);
      fd.set("title", entry.title);
      fd.set("category_id", entry.categoryId);
      fd.set("access_level", entry.accessLevel);
      fd.set("description", entry.description);
      fd.set("version", entry.version);
      fd.set("effective_date", entry.effectiveDate);
      fd.set("expiration_date", entry.expirationDate);
      fd.set("tags", entry.tags);
      fd.set("is_pinned", String(entry.isPinned));
      fd.set("requires_acknowledgment", String(entry.requiresAck));

      const res = await uploadDocument(fd);
      if (res.error) {
        updateEntry(i, { status: "error", error: res.error, progress: 0 });
      } else {
        updateEntry(i, { status: "done", progress: 100 });
      }
    }
    onSuccess();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  if (!isOpen) return null;

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const doneCount = entries.filter((e) => e.status === "done").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-4 z-50 mx-auto my-auto flex max-h-[90vh] max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-label="Upload documents"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Upload Documents</h2>
            {entries.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-0.5">
                {entries.length} file{entries.length !== 1 ? "s" : ""} · {doneCount} uploaded
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
              isDragging
                ? "border-secondary bg-secondary/5"
                : "border-outline-variant/50 bg-surface-container-low/50 hover:border-secondary/50"
            }`}
          >
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50 mb-2">
              cloud_upload
            </span>
            <p className="text-sm font-medium text-on-surface">
              Drop files here or <span className="text-secondary">browse</span>
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              PDF, Word, Excel, Images · Max 50 MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File entries */}
          {entries.map((entry, idx) => {
            const info = getFileTypeInfo(entry.file.type || getFileTypeFromName(entry.file.name));
            return (
              <div
                key={idx}
                className={`rounded-xl border p-4 space-y-3 ${
                  entry.status === "done"
                    ? "border-green-200 bg-green-50/30"
                    : entry.status === "error"
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200"
                }`}
              >
                {/* File row */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low ${info.color}`}>
                    <span className="material-symbols-outlined text-[22px]">{info.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-on-surface truncate">{entry.file.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {info.label} · {formatBytes(entry.file.size)}
                    </p>
                  </div>
                  {entry.status === "done" && (
                    <span className="material-symbols-outlined text-[22px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                  {entry.status === "uploading" && (
                    <span className="material-symbols-outlined text-[22px] text-secondary animate-spin">
                      progress_activity
                    </span>
                  )}
                  {entry.status === "pending" && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="rounded-lg p-1 text-on-surface-variant hover:text-error"
                      aria-label="Remove file"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                {entry.status === "error" && (
                  <p className="text-xs text-error">{entry.error}</p>
                )}

                {entry.status === "uploading" && (
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all duration-500"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}

                {/* Editable fields (only when pending) */}
                {entry.status === "pending" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(e) => updateEntry(idx, { title: e.target.value })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Category *
                      </label>
                      <select
                        value={entry.categoryId}
                        onChange={(e) => updateEntry(idx, { categoryId: e.target.value })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Access Level
                      </label>
                      <select
                        value={entry.accessLevel}
                        onChange={(e) => updateEntry(idx, { accessLevel: e.target.value as DocumentAccessLevel })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                      >
                        <option value="public">Public</option>
                        <option value="resident">Resident</option>
                        <option value="board">Board Only</option>
                        <option value="manager_only">Manager Only</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Description
                      </label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => updateEntry(idx, { description: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        value={entry.version}
                        onChange={(e) => updateEntry(idx, { version: e.target.value })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={entry.tags}
                        onChange={(e) => updateEntry(idx, { tags: e.target.value })}
                        placeholder="Comma separated"
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                        list={`tags-list-${idx}`}
                      />
                      <datalist id={`tags-list-${idx}`}>
                        {existingTags.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={entry.effectiveDate}
                        onChange={(e) => updateEntry(idx, { effectiveDate: e.target.value })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={entry.expirationDate}
                        onChange={(e) => updateEntry(idx, { expirationDate: e.target.value })}
                        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={entry.isPinned}
                          onChange={(e) => updateEntry(idx, { isPinned: e.target.checked })}
                          className="accent-secondary"
                        />
                        Pin to top
                      </label>
                      <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={entry.requiresAck}
                          onChange={(e) => updateEntry(idx, { requiresAck: e.target.checked })}
                          className="accent-secondary"
                        />
                        Require acknowledgment
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-white">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg border border-outline-variant/50 px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Uploading…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
