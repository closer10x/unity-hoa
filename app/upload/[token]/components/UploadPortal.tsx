"use client";

import { useCallback, useRef, useState } from "react";

import { formatBytes } from "@/lib/utils/formatBytes";
import { getFileTypeInfo, getFileTypeFromName } from "@/lib/utils/getFileTypeIcon";
import type { UploadLinkPublicInfo } from "@/lib/types/uploadLinks";
import type { DocumentCategoryRow } from "@/lib/types/documents";
import { validateUploadPassword, uploadViaLink } from "../actions";

type Props = {
  token: string;
  link?: UploadLinkPublicInfo;
  categories?: DocumentCategoryRow[];
  error?: string;
};

type UploadEntry = {
  file: File;
  title: string;
  description: string;
  categoryId: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

export function UploadPortal({ token, link, categories = [], error }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [allDone, setAllDone] = useState(false);
  const [uploadCount, setUploadCount] = useState(link?.upload_count ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = link?.max_uploads ? link.max_uploads - uploadCount : null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setAuthLoading(true);
    setAuthError("");

    const res = await validateUploadPassword(token, password);
    setAuthLoading(false);

    if (!res.success) {
      setAuthError(res.error ?? "Invalid password");
      return;
    }

    setAuthenticated(true);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const ALLOWED = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
      ];
      const MAX = 50 * 1024 * 1024;

      const newEntries: UploadEntry[] = [];
      for (const file of Array.from(files)) {
        const mime = file.type || getFileTypeFromName(file.name);
        if (!ALLOWED.includes(mime) && !mime.startsWith("image/")) continue;
        if (file.size > MAX) continue;

        newEntries.push({
          file,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          description: "",
          categoryId: categories[0]?.id ?? "",
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

  const updateEntry = (idx: number, updates: Partial<UploadEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...updates } : e)));
  };

  const handleUploadAll = async () => {
    let anySuccess = false;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status !== "pending") continue;

      if (remaining !== null && uploadCount + 1 > (link?.max_uploads ?? Infinity)) {
        updateEntry(i, { status: "error", error: "Upload limit reached" });
        continue;
      }

      updateEntry(i, { status: "uploading", progress: 50 });

      const fd = new FormData();
      fd.set("file", entry.file);
      fd.set("title", entry.title);
      fd.set("category_id", entry.categoryId);
      fd.set("description", entry.description);
      fd.set("submitter_name", submitterName);
      fd.set("submitter_email", submitterEmail);

      const res = await uploadViaLink(token, fd);

      if (res.error) {
        updateEntry(i, { status: "error", error: res.error, progress: 0 });
      } else {
        updateEntry(i, { status: "done", progress: 100 });
        setUploadCount((c) => c + 1);
        anySuccess = true;
      }
    }

    if (anySuccess) setAllDone(true);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleUploadMore = () => {
    setEntries([]);
    setAllDone(false);
  };

  const isUploading = entries.some((e) => e.status === "uploading");
  const pendingCount = entries.filter((e) => e.status === "pending").length;

  /* ─── Error state (invalid link) ──────────────────────────────────── */
  if (error) {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-error">error</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Upload Unavailable</h2>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto">{error}</p>
        </div>
      </Shell>
    );
  }

  /* ─── Password gate ───────────────────────────────────────────────── */
  if (!authenticated) {
    return (
      <Shell>
        <div className="text-center space-y-2 mb-8">
          <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px] text-secondary">lock</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Secure Document Upload</h2>
          <p className="text-sm text-on-surface-variant">
            Enter the password provided to access this upload portal
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {authError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error text-center">
              {authError}
            </div>
          )}

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="w-full rounded-lg border border-outline-variant/50 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              aria-label="Upload password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant hover:text-on-surface"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={authLoading || !password.trim()}
            className="w-full rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {authLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Verifying…
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </Shell>
    );
  }

  /* ─── Success state ───────────────────────────────────────────────── */
  if (allDone) {
    const doneEntries = entries.filter((e) => e.status === "done");
    const errorEntries = entries.filter((e) => e.status === "error");

    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">
            {doneEntries.length} Document{doneEntries.length !== 1 ? "s" : ""} Uploaded
          </h2>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
            {link?.requires_review
              ? "Your documents have been submitted for review. The community manager will review them shortly."
              : "Your documents have been added to the library."}
          </p>

          {errorEntries.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error text-left">
              {errorEntries.length} file{errorEntries.length !== 1 ? "s" : ""} failed to upload:
              <ul className="mt-1 list-disc pl-5">
                {errorEntries.map((e, i) => (
                  <li key={i}>{e.file.name}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 text-left">
            {doneEntries.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/30 px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span className="text-sm text-on-surface truncate">{e.file.name}</span>
              </div>
            ))}
          </div>

          {(remaining === null || remaining > 0) && (
            <button
              onClick={handleUploadMore}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Upload More
            </button>
          )}
        </div>
      </Shell>
    );
  }

  /* ─── Upload interface ────────────────────────────────────────────── */
  return (
    <Shell wide>
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-on-surface">
            {link?.label ?? "Document Upload"}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-1.5 text-xs text-on-surface-variant">
            {remaining !== null && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">upload</span>
                {remaining} upload{remaining !== 1 ? "s" : ""} remaining
              </span>
            )}
            {link?.expires_at && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Expires {new Date(link.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Submitter info (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
              Your Name <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
              Your Email <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="e.g., john@example.com"
              className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

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
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50 mb-2">cloud_upload</span>
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
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
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
                  <span className="material-symbols-outlined text-[22px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
                {entry.status === "uploading" && (
                  <span className="material-symbols-outlined text-[22px] text-secondary animate-spin">progress_activity</span>
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
                      Category
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
                      Description
                    </label>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => updateEntry(idx, { description: e.target.value })}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Upload button */}
        {entries.length > 0 && !allDone && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setEntries([])}
              disabled={isUploading}
              className="rounded-lg border border-outline-variant/50 px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              Clear All
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Uploading…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Upload {pendingCount} Document{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ─── Layout shell for the public upload page ────────────────────────── */

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center px-4 py-8 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-secondary-fixed-dim">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            grid_view
          </span>
        </div>
        <p className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
          Unity Grid Management
        </p>
      </div>

      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-white border border-gray-200 shadow-lg shadow-black/5 p-6 sm:p-8`}>
        {children}
      </div>

      <p className="mt-8 text-[11px] text-on-surface-variant/60 text-center">
        Secured by Unity Grid Management · Files are encrypted in transit
      </p>
    </div>
  );
}
