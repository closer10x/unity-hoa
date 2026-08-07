"use client";

import React, { useMemo, useState } from "react";

import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import type { DocItem } from "@/lib/resident-portal/types";
import {
  Card, Empty, FilterBar, Mono, PageTitle, Row, RowMain, TextButton,
} from "@/components/admin/ui";

export default function Documents() {
  const s = useResident();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const d of s.docs) seen.add(d.category);
    return ["All", ...Array.from(seen)];
  }, [s.docs]);

  const visible = useSearchFilter(
    s.docs, query, ["title", "meta", "category"],
    (d: DocItem) => (filter === "All" ? true : d.category === filter),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, DocItem[]>();
    for (const d of visible) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <>
      <PageTitle
        title="Documents"
        lede="Governing documents, financials, meeting minutes and your own statements."
      />

      <Card>
        <FilterBar query={query} onQuery={setQuery} placeholder="Search documents…"
          filters={categories} active={filter} onFilter={setFilter} />
        {visible.length === 0 ? (
          <Empty>
            {s.docs.length === 0
              ? "No documents have been published yet. The office adds them from the admin portal's Documents section."
              : "No documents match that."}
          </Empty>
        ) : (
          grouped.map(([category, docs]) => (
            <div key={category}>
              <div style={{ padding: `14px ${pad.card} 6px`, background: color.surfaceMuted }}>
                <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
                  {category}
                </span>
              </div>
              {docs.map((d) => (
                <Row key={d.id}>
                  <RowMain label={d.title} />
                  <Mono size={13} style={{ color: color.neutral }}>{d.meta}</Mono>
                  <span style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Opens the PDF in a new tab via a signed URL; the
                        download variant asks the browser to save instead. */}
                    <TextButton onClick={() => window.open(`/api/documents/${d.id}/download`, "_blank", "noopener")}>
                      View
                    </TextButton>
                    <TextButton onClick={() => { window.location.href = `/api/documents/${d.id}/download?download=1`; }}>
                      Download
                    </TextButton>
                  </span>
                </Row>
              ))}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
