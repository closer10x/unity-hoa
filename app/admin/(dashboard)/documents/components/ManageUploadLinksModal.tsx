"use client";

import { useCallback, useEffect, useState } from "react";
import type { UploadLinkRow } from "@/lib/types/uploadLinks";
import type { DocumentCategoryRow } from "@/lib/types/documents";
import { generatePassword } from "@/lib/utils/generatePassword";
import {
  listUploadLinks,
  createUploadLink,
  deactivateUploadLink,
  deleteUploadLink,
} from "../upload-link-actions";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategoryRow[];
};

type View = "list" | "create" | "success";

type CreatedLink = {
  id: string;
  label: string;
  password: string;
};

export function ManageUploadLinksModal({ isOpen, onClose, categories }: Props) {
  const [links, setLinks] = useState<UploadLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);

  // Create form state
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [expiresPreset, setExpiresPreset] = useState<string>("never");
  const [customExpires, setCustomExpires] = useState("");
  const [maxUploads, setMaxUploads] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [requiresReview, setRequiresReview] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    const data = await listUploadLinks();
    setLinks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchLinks();
  }, [isOpen, fetchLinks]);

  const resetCreateForm = () => {
    setLabel("");
    setPassword(generatePassword());
    setExpiresPreset("never");
    setCustomExpires("");
    setMaxUploads("");
    setSelectedCategories([]);
    setRequiresReview(true);
    setCreateError("");
  };

  const handleCreate = async () => {
    if (!label.trim()) { setCreateError("Label is required"); return; }
    if (!password.trim() || password.length < 6) { setCreateError("Password must be at least 6 characters"); return; }

    setCreating(true);
    setCreateError("");

    let expiresAt: string | null = null;
    if (expiresPreset !== "never") {
      if (expiresPreset === "custom") {
        expiresAt = customExpires ? new Date(customExpires).toISOString() : null;
      } else {
        const days = parseInt(expiresPreset, 10);
        expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      }
    }

    const res = await createUploadLink({
      label: label.trim(),
      password,
      expiresAt,
      maxUploads: maxUploads ? parseInt(maxUploads, 10) : null,
      allowedCategories: selectedCategories,
      requiresReview,
    });

    setCreating(false);

    if (res.error) {
      setCreateError(res.error);
      return;
    }

    setCreatedLink({ id: res.id!, label: label.trim(), password });
    setView("success");
    fetchLinks();
  };

  const handleDeactivate = async (id: string) => {
    await deactivateUploadLink(id);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    await deleteUploadLink(id);
    fetchLinks();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getUploadUrl = (id: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/upload/${id}`;
    }
    return `/upload/${id}`;
  };

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-4 z-50 mx-auto my-auto flex max-h-[90vh] max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-label="Manage upload links"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button
                onClick={() => { setView("list"); resetCreateForm(); }}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {view === "list" && "Secure Upload Links"}
                {view === "create" && "Create Upload Link"}
                {view === "success" && "Link Created"}
              </h2>
              {view === "list" && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Share password-protected upload portals with external users
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─── List View ─────────────────────────────────────────── */}
          {view === "list" && (
            <div className="space-y-4">
              <button
                onClick={() => { resetCreateForm(); setView("create"); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline-variant/50 px-4 py-3 text-sm font-medium text-on-surface-variant hover:border-secondary/50 hover:text-secondary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create New Upload Link
              </button>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="material-symbols-outlined text-[24px] text-secondary animate-spin">progress_activity</span>
                </div>
              ) : links.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3 block">link</span>
                  <p className="text-sm text-on-surface-variant">No upload links created yet</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1">
                    Create a link to let external users upload documents securely
                  </p>
                </div>
              ) : (
                links.map((link) => {
                  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                  const isMaxed = link.max_uploads ? link.upload_count >= link.max_uploads : false;
                  const inactive = !link.is_active || isExpired || isMaxed;

                  return (
                    <div
                      key={link.id}
                      className={`rounded-xl border p-4 space-y-3 ${inactive ? "border-gray-200 bg-gray-50/50 opacity-70" : "border-gray-200"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                            <p className="text-sm font-semibold text-on-surface truncate">{link.label}</p>
                            {!link.is_active && (
                              <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase">Inactive</span>
                            )}
                            {isExpired && link.is_active && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 uppercase">Expired</span>
                            )}
                            {isMaxed && link.is_active && !isExpired && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 uppercase">Limit reached</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-on-surface-variant">
                            <span>Created {new Date(link.created_at).toLocaleDateString()}</span>
                            {link.expires_at && (
                              <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                            )}
                            <span>{link.upload_count}{link.max_uploads ? `/${link.max_uploads}` : ""} uploads</span>
                            {link.last_used_at && (
                              <span>Last used {new Date(link.last_used_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(getUploadUrl(link.id), `url-${link.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedId === `url-${link.id}` ? "check" : "content_copy"}
                          </span>
                          {copiedId === `url-${link.id}` ? "Copied!" : "Copy Link"}
                        </button>

                        {link.is_active && (
                          <button
                            onClick={() => handleDeactivate(link.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">block</span>
                            Deactivate
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(link.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-medium text-error hover:bg-red-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Create View ───────────────────────────────────────── */}
          {view === "create" && (
            <div className="space-y-5">
              {createError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Label *
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Q2 Vendor Uploads"
                  className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2.5 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Password *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 rounded-lg border border-outline-variant/50 bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                  <button
                    onClick={() => setPassword(generatePassword())}
                    className="shrink-0 rounded-lg border border-outline-variant/50 px-3 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(password, "create-pw")}
                    className="shrink-0 rounded-lg border border-outline-variant/50 px-3 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedId === "create-pw" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Expiration
                  </label>
                  <select
                    value={expiresPreset}
                    onChange={(e) => setExpiresPreset(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2.5 text-sm outline-none focus:border-secondary"
                  >
                    <option value="never">Never</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="custom">Custom date</option>
                  </select>
                  {expiresPreset === "custom" && (
                    <input
                      type="date"
                      value={customExpires}
                      onChange={(e) => setCustomExpires(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Max Uploads
                  </label>
                  <input
                    type="number"
                    value={maxUploads}
                    onChange={(e) => setMaxUploads(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2.5 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Allowed Categories
                </label>
                <p className="text-[11px] text-on-surface-variant/70 mb-2">
                  Leave empty to allow all categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategories((prev) =>
                            selected ? prev.filter((c) => c !== cat.id) : [...prev, cat.id],
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                          selected
                            ? "border-secondary bg-secondary/10 text-secondary"
                            : "border-outline-variant/50 text-on-surface-variant hover:border-secondary/50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/50 p-4 cursor-pointer select-none hover:bg-surface-container-low/50 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="accent-secondary w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-on-surface">Require admin review</p>
                  <p className="text-xs text-on-surface-variant">
                    Uploads will go to a pending queue before appearing in the library
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ─── Success View ──────────────────────────────────────── */}
          {view === "success" && createdLink && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-on-surface">{createdLink.label}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Share the link and password below with external users
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                    Upload URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={getUploadUrl(createdLink.id)}
                      className="flex-1 rounded-lg border border-outline-variant/50 bg-surface-container-low/50 px-3 py-2 text-sm font-mono outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(getUploadUrl(createdLink.id), "success-url")}
                      className="shrink-0 rounded-lg border border-outline-variant/50 px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedId === "success-url" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={createdLink.password}
                      className="flex-1 rounded-lg border border-outline-variant/50 bg-surface-container-low/50 px-3 py-2 text-sm font-mono outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(createdLink.password, "success-pw")}
                      className="shrink-0 rounded-lg border border-outline-variant/50 px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedId === "success-pw" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const text = `Upload Link: ${getUploadUrl(createdLink.id)}\nPassword: ${createdLink.password}`;
                  copyToClipboard(text, "success-both");
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedId === "success-both" ? "check" : "content_copy"}
                </span>
                {copiedId === "success-both" ? "Copied!" : "Copy Link & Password"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {view === "create" && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-white">
            <button
              onClick={() => { setView("list"); resetCreateForm(); }}
              className="rounded-lg border border-outline-variant/50 px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Creating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Create Upload Link
                </>
              )}
            </button>
          </div>
        )}

        {view === "success" && (
          <div className="flex items-center justify-center border-t border-gray-200 px-6 py-4 bg-white">
            <button
              onClick={() => { setView("list"); resetCreateForm(); setCreatedLink(null); }}
              className="rounded-lg border border-outline-variant/50 px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
