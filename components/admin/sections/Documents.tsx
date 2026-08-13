"use client";

import React, { useEffect, useState } from "react";
import { setDocumentPublished } from "@/lib/admin-portal/document-actions";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import { usePrimaryAction } from "../SectionHead";
import {
  AddDrawer, Card, Empty, ErrorLine, Field, FieldGrid, FilterBar, Input,
  Pill, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const FILTERS = ["All", "Published", "Draft"];

export default function Documents() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  // Add-form state
  const [open, setOpen] = useState(false);
  /* The header's primary button opens this screen's add-form. */
  usePrimaryAction(() => setOpen(true));
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    if (!open || categories.length > 0) return;
    fetch("/api/documents/upload")
      .then((r) => r.json())
      .then((d: { categories?: { id: string; name: string }[] }) => {
        if (d.categories) setCategories(d.categories);
      })
      .catch(() => setError("Could not load categories."));
  }, [open, categories.length]);

  const visible = useSearchFilter(
    s.docs, query, ["title", "meta"],
    (d) => filter === "All" ? true : filter === "Published" ? d.published : !d.published,
  );

  async function save() {
    if (!title.trim()) return setError("Give the document a title.");
    if (!categoryId) return setError("Pick a category.");
    if (!file) return setError("Attach a file.");
    setError("");
    setSaving(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title.trim());
      form.set("categoryId", categoryId);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        document?: { id: string };
      };
      if (!res.ok || !data.ok || !data.document) {
        setError(data.error ?? "The upload failed.");
        return;
      }
      const doc = data.document;
      const catName = categories.find((c) => c.id === categoryId)?.name ?? "Uncategorised";
      s.setDocs((prev) => [
        { id: doc.id, title: title.trim(), meta: `${catName} · ${file.name}`, published: false },
        ...prev,
      ]);
      s.audit(`Added document "${title.trim()}" to ${catName}`);
      setOpen(false); setTitle(""); setCategoryId(""); setFile(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <AddDrawer ownOpener={false} open={open} onOpen={() => { setOpen(true); setError(""); }}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Add a document" title="Add a document">
          <FieldGrid>
            <Field label="Title"><Input value={title} onChange={setTitle} placeholder="e.g. 2026 approved budget" /></Field>
            <Field label="Category">
              <Select value={categoryId} onChange={setCategoryId}
                options={[{ id: "", label: "Select a category…" }, ...categories.map((c) => ({ id: c.id, label: c.name }))]} />
            </Field>
          </FieldGrid>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 14, color: color.inkSecondary, marginBottom: 8 }}>
              File (PDF or image, up to 25 MB)
            </span>
            <input
              type="file"
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ font: "inherit", fontSize: 14, color: color.inkSecondary }}
            />
          </label>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary, margin: 0 }}>
            New documents start as drafts — publish them when they&apos;re ready
            for residents.
          </p>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start", ...(saving ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
            {saving ? "Uploading…" : "Add document"}
          </Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search documents…"
          filters={FILTERS} active={filter} onFilter={setFilter} />
        {rowError ? <div style={{ padding: "12px 24px" }}><ErrorLine>{rowError}</ErrorLine></div> : null}
        {visible.length === 0 ? <Empty>No documents match that.</Empty> : visible.map((d) => (
          <Row key={d.id}>
            <RowMain label={d.title} detail={d.meta} />
            <Status tone={d.published ? "positive" : "attention"}>{d.published ? "Published" : "Draft"}</Status>
            <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <TextButton onClick={() => window.open(`/api/documents/${d.id}/download`, "_blank", "noopener")}>
                View
              </TextButton>
              <Pill style={{ padding: "8px 16px", fontSize: 14, opacity: busyId === d.id ? 0.6 : 1 }}
                onClick={async () => {
                  if (busyId) return;
                  setBusyId(d.id);
                  setRowError("");
                  const next = !d.published;
                  const res = await setDocumentPublished({ id: d.id, title: d.title, published: next });
                  setBusyId(null);
                  if (!res.ok) return setRowError(res.error);
                  s.setDocs((prev) => prev.map((x) => x.id === d.id ? { ...x, published: next } : x));
                  s.audit(`${next ? "Published" : "Unpublished"} ${d.title}`);
                }}>
                {busyId === d.id ? "…" : d.published ? "Unpublish" : "Publish"}
              </Pill>
            </span>
          </Row>
        ))}
      </Card>
    </>
  );
}
