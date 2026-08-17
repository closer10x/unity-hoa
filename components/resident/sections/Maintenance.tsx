"use client";

import React, { useState } from "react";

import { uploadResidentPhoto } from "@/lib/messages/upload-attachment";
import { createMaintenanceRequest } from "@/lib/resident-portal/request-actions";
import { useResident, useSearchFilter } from "@/lib/resident-portal/store";
import type { MaintReq } from "@/lib/resident-portal/types";
import { recordPhotoUrl } from "@/lib/supabase/message-files";
import {
  Card, CardHead, Empty, ErrorLine, Field, FieldRow, NoteLine, PAGE, PhotoPicker, Pill,
  Progress, RecordPhoto, inputCls, primaryBtn,
} from "../ui";

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

/** Where a request has got to, as a share of the three steps a job has. */
function progressOf(r: MaintReq): { pct: number; step: string } {
  if (!r.open || r.status === "Closed") return { pct: 100, step: "Done" };
  if (r.status === "In progress" || r.status === "Scheduled") {
    return { pct: 66, step: "Step 2 of 3" };
  }
  return { pct: 33, step: "Step 1 of 3" };
}

function toneOf(r: MaintReq): "moss" | "amber" | "grey" {
  if (!r.open || r.status === "Closed") return "grey";
  if (r.status === "In progress" || r.status === "Scheduled") return "moss";
  return "amber";
}

export default function Maintenance() {
  const s = useResident();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("routine");
  const [detail, setDetail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [sentRef, setSentRef] = useState("");
  const [sending, setSending] = useState(false);

  const visible = useSearchFilter(
    s.requests, query, ["ref", "title", "detail", "status"],
    (r: MaintReq) => (filter === "All" ? true : filter === "Open" ? r.open : !r.open),
  );

  /* Was built here and pushed into React state: the resident got a reference
     number, the office got nothing, and a reload lost the request. It now
     writes the work_orders row the office reads. */
  async function submit() {
    if (sending) return;
    if (!location) return setError("Tell us where the problem is.");
    if (!detail.trim()) return setError("Describe what's wrong so the crew arrives prepared.");
    setSending(true);
    setError("");
    /* A failed upload must not block the request — the crew would rather
       have the words than wait on a photo that never arrived. */
    let photoPath: string | undefined;
    if (photo) {
      const up = await uploadResidentPhoto(photo, "work-orders");
      if (up.ok) photoPath = up.path;
    }
    const res = await createMaintenanceRequest({ location, category, urgency, detail, photoPath });
    setSending(false);
    if (!res.ok) return setError(res.error);
    s.setRequests((prev) => [res.request, ...prev]);
    setSentRef(res.request.ref);
    setLocation(""); setCategory(""); setUrgency("routine"); setDetail(""); setPhoto(null);
  }

  return (
    <div className={PAGE} style={{ paddingInline: 0, paddingTop: 0 }}>
      {/* The form beside the list where there is room, above it where there
          is not — the request you are filing is the reason you opened this. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] items-start gap-4">
        <Card className="px-[clamp(18px,3vw,30px)] py-7">
          <CardHead title="Your requests" />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your requests…"
              className={`${inputCls} min-w-0 flex-[1_1_180px]`}
            />
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  "min-h-11 rounded-full px-4 text-[13px] font-bold tracking-[0.06em] uppercase transition-colors " +
                  (f === filter
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-muted hover:border-ink")
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            {visible.length === 0 ? (
              <Empty>
                {s.requests.length === 0
                  ? "You haven't filed a request yet. When something needs fixing, use the form."
                  : "No requests match that."}
              </Empty>
            ) : (
              visible.map((r) => {
                const prog = progressOf(r);
                const closed = !r.open || r.status === "Closed";
                return (
                  <div
                    key={r.id}
                    className={
                      "rounded-xl border border-line px-[clamp(16px,2.5vw,22px)] py-5 " +
                      (closed ? "opacity-75" : "")
                    }
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <span className="min-w-0 text-[17px] font-semibold text-ink">{r.title}</span>
                      <Pill tone={toneOf(r)}>{r.status}</Pill>
                    </div>
                    <p className="mb-3 text-[15px] leading-[1.55] text-muted">
                      {r.ref} · {r.detail}
                    </p>
                    {r.photoPath ? (
                      <div className="mb-3">
                        <RecordPhoto href={recordPhotoUrl("work-orders", r.id)} alt={r.title} size={72} />
                      </div>
                    ) : null}
                    {closed ? null : <Progress pct={prog.pct} step={prog.step} />}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="px-[clamp(18px,3vw,30px)] py-7">
          <CardHead title="New request" />
          {sentRef ? (
            <div className="mt-4">
              <NoteLine>
                Request {sentRef} received. The office reviews new requests each business
                morning — you&rsquo;ll hear back here and by email once it&rsquo;s assigned.
              </NoteLine>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4">
            <Field label="Where is it?">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputCls}
              >
                <option value="">Pick a location…</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <FieldRow>
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pick a category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="How urgent?">
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className={inputCls}
                >
                  {URGENCY.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </Field>
            </FieldRow>
            <Field
              label="What's wrong?"
              hint="What you see, since when, and anything the crew should know before they arrive."
            >
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-[#D8D4C6] bg-field px-3.5 py-3 text-[16px] leading-[1.55] text-ink"
              />
            </Field>
            <PhotoPicker
              label="Photo"
              hint="Optional. A photo helps the crew arrive prepared."
              file={photo}
              onChange={setPhoto}
              size={160}
            />
            {error ? <ErrorLine>{error}</ErrorLine> : null}
            <button type="button" onClick={submit} disabled={sending} className={`${primaryBtn} justify-self-start`}>
              Send request
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
