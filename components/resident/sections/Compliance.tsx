"use client";

import React, { useState } from "react";

import { uploadResidentPhoto } from "@/lib/messages/upload-attachment";
import { createConcernReport } from "@/lib/resident-portal/request-actions";
import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import type { ComplianceNotice } from "@/lib/resident-portal/types";
import {
  AddDrawer, Area, Card, CardHeadMeta as CardHead, Chip, DropZone, Empty, ErrorLine, Field,
  FieldGrid, FilterBar, Input, Mono, Primary, Row, RowMain, Select,
  Status,
} from "../ui";
import { color } from "../ui";

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const visible = useSearchFilter(
    s.notices, query, ["title", "detail", "status"],
    (n: ComplianceNotice) =>
      filter === "All" ? true : filter === "Resolved" ? n.ok : !n.ok,
  );

  /* Was assembled here and never left the tab — the office never saw it
     and a reload lost it. It now writes the concern_reports row the
     office reads. Photo is optional; a failed upload still files the words. */
  async function submit() {
    if (sending) return;
    if (!type) return setError("Pick the kind of issue.");
    if (!location.trim()) return setError("Tell us where it is.");
    setSending(true);
    setError("");
    let photoPath: string | undefined;
    if (photo) {
      const up = await uploadResidentPhoto(photo, "compliance");
      if (up.ok) photoPath = up.path;
    }
    const res = await createConcernReport({ type, location, detail, anonymous, photoPath });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setSent(true);
    setOpen(false);
    setType(""); setLocation(""); setDetail(""); setAnonymous(false); setPhoto(null);
  }

  return (
    <>

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
          onCancel={() => { setOpen(false); setError(""); setPhoto(null); }}
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
          <DropZone
            camera
            files={photo ? [photo] : []}
            onFiles={(next) => setPhoto(next[0] ?? null)}
          >
            Add a photo if it helps
          </DropZone>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip on={anonymous} onClick={() => setAnonymous(!anonymous)}>
              {anonymous ? "Anonymous" : "Include my name"}
            </Chip>
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Reports are confidential either way — the neighbor never sees who filed.
            </span>
          </div>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={submit} style={{ justifySelf: "start" }}>{sending ? "Sending…" : "Send report"}</Primary>
        </AddDrawer>
      </Card>
    </>
  );
}
