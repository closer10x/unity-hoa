"use client";

import React, { useState } from "react";

import { createArcApplication } from "@/lib/resident-portal/request-actions";
import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import type { ResArcApp } from "@/lib/resident-portal/types";
import {
  AddDrawer, Area, Card, DateInput, DropZone, Empty, ErrorLine, Field,
  FieldGrid, FilterBar, Input, Mono, Primary, Row, RowMain, Select,
  Status,
} from "../ui";
import { color } from "../ui";

const PROJECT_TYPES = [
  "Fence or gate", "Patio, pergola or deck", "Exterior paint", "Roof",
  "Pool or spa", "Landscaping change", "Solar panels", "Room addition", "Other",
];

const FILTERS = ["All", "In review", "Decided"];

export default function Architectural() {
  const s = useResident();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [detail, setDetail] = useState("");
  const [contractor, setContractor] = useState("");
  const [start, setStart] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [sending, setSending] = useState(false);

  const visible = useSearchFilter(
    s.arcApps, query, ["ref", "title", "detail", "status"],
    (a: ResArcApp) =>
      filter === "All" ? true : filter === "Decided" ? a.ok : !a.ok,
  );

  /* Was assembled here and pushed into React state — the committee never saw
     it and a reload lost it. It now writes the arc_applications row the
     office reads. */
  async function submit() {
    if (sending) return;
    if (!type) return setError("Pick the kind of project.");
    if (!detail.trim())
      return setError("Describe the project — materials, colors and placement help the committee say yes faster.");
    setSending(true);
    setError("");
    const res = await createArcApplication({ type, detail, contractor, start });
    setSending(false);
    if (!res.ok) return setError(res.error);
    s.setArcApps((prev) => [res.app, ...prev]);
    setSubmitted(res.app.ref);
    setOpen(false);
    setType(""); setDetail(""); setContractor(""); setStart("");
  }

  return (
    <>

      {submitted ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 8 }}>
            <Mono size={13} style={{ color: color.positive }}>Application {submitted} received</Mono>
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>
              The committee meets twice monthly and answers within 30 days.
              Correspondence lands in Messages and here on the application.
            </span>
          </div>
        </Card>
      ) : null}

      <Card>
        <AddDrawer
          open={open}
          onOpen={() => { setOpen(true); setError(""); setSubmitted(""); }}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Start an application"
          title="Start an application"
          note="Plans, drawings and neighbor consent attach below."
          count={s.arcApps.length ? `${s.arcApps.length} application${s.arcApps.length === 1 ? "" : "s"}` : undefined}
        >
          <FieldGrid>
            <Field label="Project type">
              <Select value={type} onChange={setType} placeholder="Pick a type…"
                options={PROJECT_TYPES.map((t) => ({ id: t, label: t }))} />
            </Field>
            <Field label="Contractor" hint="Optional — name or company">
              <Input value={contractor} onChange={setContractor} placeholder="Who's doing the work?" />
            </Field>
            <Field label="Estimated start">
              <DateInput value={start} onChange={setStart} />
            </Field>
          </FieldGrid>
          <Field label="Describe the project">
            <Area value={detail} onChange={setDetail} rows={3}
              placeholder="Dimensions, materials, colors, and where on the lot it goes." />
          </Field>
          <DropZone>Drag plans, drawings or neighbor consent here — or click to browse</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={submit} style={{ justifySelf: "start" }}>Submit application</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search your applications…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {visible.length === 0 ? (
          <Empty>
            {s.arcApps.length === 0
              ? "No applications yet. Exterior changes need approval before work begins — start above."
              : "No applications match that."}
          </Empty>
        ) : (
          visible.map((a) => (
            <Row key={a.id}>
              <Mono size={13} style={{ color: color.neutral }}>{a.ref}</Mono>
              <RowMain label={a.title} detail={a.detail} />
              <Status tone={a.ok ? "positive" : "attention"}>{a.status}</Status>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}
