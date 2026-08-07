"use client";

import React, { useState } from "react";

import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { MaintReq } from "@/lib/resident-portal/types";
import {
  AddDrawer, Area, Card, DropZone, Empty, ErrorLine, Field, FieldGrid,
  FilterBar, Mono, PageTitle, Primary, Row, RowMain, Select, Status,
} from "@/components/admin/ui";

const LOCATIONS = [
  "My home", "Front yard or easement", "Street or sidewalk", "Common area",
  "Pool or clubhouse", "Gate or entry", "Lake or greenbelt", "Other",
];

const CATEGORIES = [
  "Plumbing", "Electrical or lighting", "Landscaping or irrigation",
  "Gates & access", "Amenity or clubhouse", "Streets & drainage", "Other",
];

const URGENCY = [
  { id: "routine", label: "Routine — within a couple of weeks" },
  { id: "soon", label: "Soon — within a few days" },
  { id: "urgent", label: "Urgent — safety or property damage" },
];

const FILTERS = ["All", "Open", "Closed"];

export default function Maintenance() {
  const s = useResident();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("routine");
  const [detail, setDetail] = useState("");
  const [sentRef, setSentRef] = useState("");

  const visible = useSearchFilter(
    s.requests, query, ["ref", "title", "detail", "status"],
    (r: MaintReq) => (filter === "All" ? true : filter === "Open" ? r.open : !r.open),
  );

  function submit() {
    if (!location) return setError("Tell us where the problem is.");
    if (!detail.trim()) return setError("Describe what's wrong so the crew arrives prepared.");
    const ref = `UG-${Math.floor(100000 + Math.random() * 899999)}`;
    const req: MaintReq = {
      id: s.uid("mr"),
      ref,
      title: category ? `${category} — ${location}` : location,
      detail: `Reported ${s.stamp()} · ${URGENCY.find((u) => u.id === urgency)?.label ?? ""}`,
      status: "Received",
      open: true,
    };
    s.setRequests((prev) => [req, ...prev]);
    setSentRef(ref);
    setOpen(false);
    setError(""); setLocation(""); setCategory(""); setUrgency("routine"); setDetail("");
  }

  return (
    <>
      <PageTitle title="Maintenance" lede="Report a problem and follow every request you've filed." />

      {sentRef ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 8 }}>
            <Mono size={13} style={{ color: color.positive }}>Request {sentRef} received</Mono>
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>
              The office reviews new requests each business morning. You’ll hear
              back here and by email once it’s assigned.
            </span>
          </div>
        </Card>
      ) : null}

      <Card>
        <AddDrawer
          open={open}
          onOpen={() => { setOpen(true); setError(""); setSentRef(""); }}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Report a problem"
          title="Report a problem"
          count={s.requests.length ? `${s.requests.length} request${s.requests.length === 1 ? "" : "s"}` : undefined}
        >
          <FieldGrid>
            <Field label="Where is it?">
              <Select value={location} onChange={setLocation} placeholder="Pick a location…"
                options={LOCATIONS.map((l) => ({ id: l, label: l }))} />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={setCategory} placeholder="Pick a category…"
                options={CATEGORIES.map((c) => ({ id: c, label: c }))} />
            </Field>
            <Field label="How urgent?">
              <Select value={urgency} onChange={setUrgency} options={URGENCY} />
            </Field>
          </FieldGrid>
          <Field label="What's wrong?">
            <Area value={detail} onChange={setDetail} rows={3}
              placeholder="What you see, since when, and anything the crew should know before they arrive." />
          </Field>
          <DropZone camera>Drag photos here, or take one</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={submit} style={{ justifySelf: "start" }}>Send request</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search your requests…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {visible.length === 0 ? (
          <Empty>
            {s.requests.length === 0
              ? "You haven't filed a request yet. When something needs fixing, report it above."
              : "No requests match that."}
          </Empty>
        ) : (
          visible.map((r) => (
            <Row key={r.id}>
              <Mono size={13} style={{ color: color.neutral }}>{r.ref}</Mono>
              <RowMain label={r.title} detail={r.detail} />
              <Status tone={r.status === "Closed" ? "neutral" : r.status === "In progress" ? "positive" : "attention"}>
                {r.status}
              </Status>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}
