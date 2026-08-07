"use client";

import React, { useState } from "react";

import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { ComplianceNotice } from "@/lib/resident-portal/types";
import {
  AddDrawer, Area, Card, CardHead, Chip, DropZone, Empty, ErrorLine, Field,
  FieldGrid, FilterBar, Input, Mono, PageTitle, Primary, Row, RowMain, Select,
  Status,
} from "@/components/admin/ui";

const CONCERN_TYPES = [
  "Lawn or landscaping", "Trash bins or debris", "Parking or vehicles",
  "Noise", "Pets", "Exterior condition", "Common area damage", "Other",
];

const FILTERS = ["All", "Open", "Resolved"];

export default function Compliance() {
  const s = useResident();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [detail, setDetail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sent, setSent] = useState(false);

  const visible = useSearchFilter(
    s.notices, query, ["title", "detail", "status"],
    (n: ComplianceNotice) =>
      filter === "All" ? true : filter === "Resolved" ? n.ok : !n.ok,
  );

  function submit() {
    if (!type) return setError("Pick the kind of issue.");
    if (!location.trim()) return setError("Tell us where it is.");
    setSent(true);
    setOpen(false);
    setError(""); setType(""); setLocation(""); setDetail(""); setAnonymous(false);
  }

  return (
    <>
      <PageTitle
        title="Compliance"
        lede="Notices on your property, their cure deadlines, and a way to report a concern."
      />

      <Card>
        <CardHead title="Your property" meta={s.property.address} />
        <FilterBar query={query} onQuery={setQuery} placeholder="Search notices…"
          filters={FILTERS} active={filter} onFilter={setFilter} />
        {visible.length === 0 ? (
          <Empty>
            {s.notices.length === 0
              ? "No notices on your property. Nothing needs your attention."
              : "No notices match that."}
          </Empty>
        ) : (
          visible.map((n) => (
            <Row key={n.id}>
              <Mono size={13} style={{ color: color.neutral }}>{n.date}</Mono>
              <RowMain label={n.title} detail={n.detail} />
              <Status tone={n.ok ? "positive" : "critical"}>{n.status}</Status>
            </Row>
          ))
        )}
      </Card>

      {sent ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 8 }}>
            <Mono size={13} style={{ color: color.positive }}>Concern received</Mono>
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>
              An inspector will take a look on the next route. Reports are
              never shared with the neighbor{anonymous ? "" : ", though your name is on file with the office"}.
            </span>
          </div>
        </Card>
      ) : null}

      <Card>
        <AddDrawer
          open={open}
          onOpen={() => { setOpen(true); setError(""); setSent(false); }}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Report a concern"
          title="Report a concern"
          note="For issues elsewhere in the neighborhood."
        >
          <FieldGrid>
            <Field label="What kind of issue?">
              <Select value={type} onChange={setType} placeholder="Pick one…"
                options={CONCERN_TYPES.map((t) => ({ id: t, label: t }))} />
            </Field>
            <Field label="Where is it?">
              <Input value={location} onChange={setLocation} placeholder="Street and closest address" />
            </Field>
          </FieldGrid>
          <Field label="What did you see?">
            <Area value={detail} onChange={setDetail} rows={3}
              placeholder="What's going on and how long it's been happening." />
          </Field>
          <DropZone camera>Add a photo if it helps</DropZone>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip on={anonymous} onClick={() => setAnonymous(!anonymous)}>
              {anonymous ? "Anonymous" : "Include my name"}
            </Chip>
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Reports are confidential either way — the neighbor never sees who filed.
            </span>
          </div>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={submit} style={{ justifySelf: "start" }}>Send report</Primary>
        </AddDrawer>
      </Card>
    </>
  );
}
