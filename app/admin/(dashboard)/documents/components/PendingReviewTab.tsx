"use client";

import { useCallback, useEffect, useState } from "react";

import { formatBytes } from "@/lib/utils/formatBytes";
import { getFileTypeInfo, getFileTypeFromName } from "@/lib/utils/getFileTypeIcon";
import type { PendingDocumentWithLink } from "@/lib/types/uploadLinks";
import type { DocumentCategoryRow } from "@/lib/types/documents";
import {
  listPendingDocuments,
  approvePendingDocument,
  rejectPendingDocument,
  getPendingDocumentDownloadUrl,
} from "../upload-link-actions";

type Props = {
  categories: DocumentCategoryRow[];
  pendingCount: number;
  onCountChange: (count: number) => void;
};

export function PendingReviewTab({ categories, pendingCount, onCountChange }: Props) {
  const [documents, setDocuments] = useState<PendingDocumentWithLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const data = await listPendingDocuments();
    setDocuments(data);
    onCountChange(data.length);
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handlePreview = async (id: string) => {
    const res = await getPendingDocumentDownloadUrl(id);
    if (res.url) window.open(res.url, "_blank");
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await approvePendingDocument(id);
    setActionLoading(null);
    fetchDocuments();
  };

  const handleApproveWithEdits = async (id: string) => {
    setActionLoading(id);
    await approvePendingDocument(id, {
      title: editTitle || undefined,
      description: editDescription || undefined,
      categoryId: editCategoryId || undefined,
    });
    setActionLoading(null);
    setEditingId(null);
    fetchDocuments();
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    await rejectPendingDocument(id, rejectReason.trim());
    setActionLoading(null);
    setRejectingId(null);
    setRejectReason("");
    fetchDocuments();
  };

  const openEditModal = (doc: PendingDocumentWithLink) => {
    setEditingId(doc.id);
    setEditTitle(doc.submitted_title);
    setEditDescription(doc.submitted_description ?? "");
    setEditCategoryId(doc.submitted_category ?? "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-[24px] text-secondary animate-spin">progress_activity</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3 block">task_alt</span>
        <p className="text-sm font-medium text-on-surface">No pending documents</p>
        <p className="text-xs text-on-surface-variant mt-1">
          All uploaded documents have been reviewed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const info = getFileTypeInfo(doc.file_type || getFileTypeFromName(doc.file_name));
        const isActioning = actionLoading === doc.id;

        return (
          <div key={doc.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            {/* File info row */}
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low ${info.color}`}>
                <span className="material-symbols-outlined text-[22px]">{info.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface">{doc.submitted_title}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {doc.file_name} · {info.label} · {formatBytes(doc.file_size_bytes)}
                </p>
                {doc.submitted_description && (
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {doc.submitted_description}
                  </p>
                )}
              </div>
              {isActioning && (
                <span className="material-symbols-outlined text-[20px] text-secondary animate-spin shrink-0">progress_activity</span>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
              {doc.upload_link_label && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">link</span>
                  {doc.upload_link_label}
                </span>
              )}
              {doc.category_name && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">folder</span>
                  {doc.category_name}
                </span>
              )}
              {doc.submitter_name && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">person</span>
                  {doc.submitter_name}
                </span>
              )}
              {doc.submitter_email && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">mail</span>
                  {doc.submitter_email}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                {new Date(doc.submitted_at).toLocaleString()}
              </span>
            </div>

            {/* Reject form (inline) */}
            {rejectingId === doc.id && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-error">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="Explain why this document was rejected…"
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-error resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(doc.id)}
                    disabled={!rejectReason.trim() || isActioning}
                    className="rounded-lg bg-error px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Approve with edits form (inline) */}
            {editingId === doc.id && (
              <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3 space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">Edit Before Approving</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Category</label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                    >
                      <option value="">— Select —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveWithEdits(doc.id)}
                    disabled={isActioning}
                    className="rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Approve with Edits
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {rejectingId !== doc.id && editingId !== doc.id && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handlePreview(doc.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  Preview
                </button>
                <button
                  onClick={() => handleApprove(doc.id)}
                  disabled={isActioning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Approve
                </button>
                <button
                  onClick={() => openEditModal(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Approve with Edits
                </button>
                <button
                  onClick={() => setRejectingId(doc.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-error hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
