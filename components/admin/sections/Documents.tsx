"use client";

import React, { useState } from "react";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import { Card, Empty, FilterBar, PageTitle, Pill, Row, RowMain, Status } from "../ui";

const FILTERS = ["All", "Published", "Draft"];

export default function Documents() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const visible = useSearchFilter(
    s.docs, query, ["title", "meta"],
    (d) => filter === "All" ? true : filter === "Published" ? d.published : !d.published,
  );

  return (
    <>
      <PageTitle title="Documents" lede="Governing documents, financials and minutes. Publishing makes a document visible in every resident portal." />
      <Card>
        <FilterBar query={query} onQuery={setQuery} placeholder="Search documents…"
          filters={FILTERS} active={filter} onFilter={setFilter} />
        {visible.length === 0 ? <Empty>No documents match that.</Empty> : visible.map((d) => (
          <Row key={d.id}>
            <RowMain label={d.title} detail={d.meta} />
            <Status tone={d.published ? "positive" : "attention"}>{d.published ? "Published" : "Draft"}</Status>
            <Pill onClick={() => {
              s.setDocs((prev) => prev.map((x) => x.id === d.id ? { ...x, published: !x.published } : x));
              s.audit(`${d.published ? "Unpublished" : "Published"} ${d.title}`);
            }}>
              {d.published ? "Unpublish" : "Publish"}
            </Pill>
          </Row>
        ))}
      </Card>
    </>
  );
}
