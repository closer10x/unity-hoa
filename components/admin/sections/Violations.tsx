"use client";

import React, { useState } from "react";
import { VIOLATION_STEPS } from "@/lib/admin-portal/actions";
import {
  addViolationNote, createViolation, recordViolationMailing, setViolationStatus,
} from "@/lib/admin-portal/compliance-actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, pad, radius, rowGrid } from "@/lib/admin-portal/tokens";
import type { PendingConfirm, Violation, ViolationStatus } from "@/lib/admin-portal/types";
import { usePrimaryAction } from "../SectionHead";
import {
  ActionSelect, AddDrawer, Area, Card, ConfirmBar, DateInput, DropZone, Empty,
  ErrorLine, Eyebrow, Field, FieldGrid, FilterBar, Input, Mono, Pill,
  Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const FILTERS = ["All", "Open", "Reported", "Courtesy sent", "Notice sent", "Hearing set", "Resolved"];

const TYPES = [
  "Lawn or landscaping upkeep", "Trash bins or debris", "Parking or inoperable vehicle",
  "Unapproved exterior work", "Fence or structure disrepair", "Pets off leash or waste",
  "Noise or nuisance", "Other",
];

/* Cure periods are counted in whole days and are legally significant, so this
   is a fixed 1–30 list rather than free text that could hold "two weeks". */
const CURE_DAYS = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1;
  return { id: `${n} day${n === 1 ? "" : "s"}`, label: `${n} day${n === 1 ? "" : "s"}` };
});

export default function Violations() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [fileOpen, setFileOpen] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [mailDrafts, setMailDrafts] = useState<Record<string, { kind: string; method: string; sent: string; tracking: string }>>({});

  const [open, setOpen] = useState(false);
  /* The header's primary button opens this screen's add-form. */
  usePrimaryAction(() => setOpen(true));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [flowError, setFlowError] = useState("");
  const [comm, setComm] = useState(s.communities[0]?.name ?? "");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("Inspection finding");
  const [inspector, setInspector] = useState(s.staff.find((p) => p.role === "Inspector")?.name ?? "");
  const [cure, setCure] = useState("14 days");
  const [note, setNote] = useState("");

  const visible = useSearchFilter(
    s.violations, query, ["title", "detail", "status"],
    (v) => filter === "All" ? true : filter === "Open" ? v.status !== "Resolved" : v.status === filter,
  );

  function patch(id: string, next: Partial<Violation>) {
    s.setViolations((prev) => prev.map((v) => v.id === id ? { ...v, ...next } : v));
  }

  async function logFinding() {
    if (!comm.trim()) return setError("Pick the community this lot belongs to.");
    if (!address.trim()) return setError("Add the address or lot.");
    if (!type) return setError("Pick a violation type.");
    setSaving(true);
    const res = await createViolation({
      community: comm, address, violationType: type, source, inspector,
      cureDays: parseInt(cure, 10), notes: note,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setViolations((prev) => [res.violation, ...prev]);
    setOpen(false); setError(""); setAddress(""); setType(""); setNote("");
  }

  return (
    <>
      <Card>
        <AddDrawer
          ownOpener={false}
          open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Log a finding" title="Log an inspection finding"
          count={`${s.violations.length} on file`}>
          <FieldGrid>
            <Field label="Community">
              <Select value={comm} onChange={setComm} options={s.communities.map((c) => ({ id: c.name, label: c.name }))} />
            </Field>
            <Field label="Address or lot">
              <Input value={address} onChange={setAddress} placeholder="e.g. 1109 Willow Bend" suggestions={s.addressBook} />
            </Field>
            <Field label="Violation type">
              <Select value={type} onChange={setType} placeholder="Select a type…" options={TYPES.map((t) => ({ id: t, label: t }))} />
            </Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Source">
              <Select value={source} onChange={setSource} options={[
                { id: "Inspection finding", label: "Inspection finding" },
                { id: "Resident report", label: "Resident report" },
                { id: "Board referral", label: "Board referral" },
                { id: "Vendor report", label: "Vendor report" },
                { id: "Other", label: "Other" },
              ]} />
            </Field>
            <Field label="Inspector">
              <Select value={inspector} onChange={setInspector} options={s.staff.filter((p) => p.active).map((p) => ({ id: p.name, label: p.name }))} />
            </Field>
            <Field label="Cure by">
              <Select
                value={cure}
                onChange={setCure}
                options={CURE_DAYS}
              />
            </Field>
          </FieldGrid>
          <Field label="Notes for the file">
            <Area value={note} onChange={setNote} placeholder="What was observed, and the CC&amp;R section it falls under." />
          </Field>
          <DropZone camera>inspection photos — take one now, or drag files here (timestamped in the file)</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Primary onClick={logFinding}>{saving ? "Saving…" : "Log finding"}</Primary>
          </div>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search address, type or community…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {visible.length === 0 ? <Empty>No violations match that.</Empty> : visible.map((v) => {
          const menu = buildActionMenu(VIOLATION_STEPS, v.status, v.id, v.detail.split(" · ")[0], pending, setPending);
          const md = mailDrafts[v.id] ?? { kind: "Courtesy notice", method: "First-class mail", sent: "", tracking: "" };
          return (
            <React.Fragment key={v.id}>
              <Row>
                <Mono size={13} style={{ color: color.neutral }}>{v.date}</Mono>
                <RowMain label={v.title} detail={v.detail} />
                <Status tone={v.status === "Resolved" ? "positive" : v.status === "Hearing set" ? "critical" : "attention"}>{v.status}</Status>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ActionSelect options={menu.options} onChoose={menu.onChoose} />
                  <TextButton onClick={() => setFileOpen(fileOpen === v.id ? "" : v.id)}>
                    {fileOpen === v.id ? "Close case file" : "Case file"}
                  </TextButton>
                </span>
              </Row>

              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={async () => {
                    const next = menu.nextValue! as ViolationStatus;
                    const label = VIOLATION_STEPS.find((x) => x.id === next)?.label ?? `Status set to ${next}`;
                    setPending(null);
                    setFlowError("");
                    const res = await setViolationStatus({ id: v.id, status: next, note: label });
                    if (!res.ok) return setFlowError(res.error);
                    patch(v.id, { status: res.status, activity: [...v.activity, res.activity] });
                  }} />
              ) : null}

              {fileOpen === v.id ? (
                <div style={{ padding: `4px ${pad.card} 24px`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 22 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <Eyebrow>Photos &amp; attachments</Eyebrow>
                    {v.photos.length === 0 ? (
                      <DropZone camera>no photos on this file yet — take one now, or drag files here</DropZone>
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {v.photos.map((p, i) => (
                          <Mono key={i} size={12} style={{ background: color.surfaceSunken, border: `1px solid ${color.borderInput}`, borderRadius: 6, padding: "8px 11px", color: color.inkSecondary }}>{p}</Mono>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <Eyebrow>Mailing record</Eyebrow>
                    <div style={{ background: color.surface, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.md, overflow: "hidden" }}>
                      {v.mailings.length === 0 ? (
                        <div style={{ padding: 14, fontSize: 14, color: color.inkTertiary }}>Nothing mailed yet.</div>
                      ) : v.mailings.map((m, i) => (
                        <div key={i} style={{ ...rowGrid, padding: "11px 14px", borderBottom: `1px solid ${color.hairlineSoft}`, gap: "4px 16px" }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{m.kind}</span>
                          <span style={{ fontSize: 14, color: color.inkTertiary }}>{m.method}</span>
                          <Mono size={12} style={{ color: color.inkQuaternary }}>sent {m.sent}</Mono>
                          <Mono size={12} style={{ color: color.inkQuaternary }}>{m.tracking || "—"}</Mono>
                          <Mono size={12} style={{ color: m.status === "Delivered" ? color.positive : color.attention }}>{m.status}</Mono>
                        </div>
                      ))}
                    </div>
                    <FieldGrid>
                      <Field label="Notice kind">
                        <Select value={md.kind} onChange={(x) => setMailDrafts({ ...mailDrafts, [v.id]: { ...md, kind: x } })}
                          options={["Courtesy notice", "Second notice", "Final notice", "Hearing notice", "Fine assessed"].map((k) => ({ id: k, label: k }))} />
                      </Field>
                      <Field label="Method">
                        <Select value={md.method} onChange={(x) => setMailDrafts({ ...mailDrafts, [v.id]: { ...md, method: x } })}
                          options={["First-class mail", "Certified mail", "Certified + return receipt", "Email + portal", "Hand delivered"].map((k) => ({ id: k, label: k }))} />
                      </Field>
                      <Field label="Date sent"><DateInput value={md.sent} onChange={(x) => setMailDrafts({ ...mailDrafts, [v.id]: { ...md, sent: x } })} /></Field>
                      <Field label="Tracking no."><Input value={md.tracking} onChange={(x) => setMailDrafts({ ...mailDrafts, [v.id]: { ...md, tracking: x } })} placeholder="Certified mail only" /></Field>
                    </FieldGrid>
                    <Pill style={{ justifySelf: "start" }}
                      onClick={async () => {
                        if (!md.sent.trim()) return setFlowError("Pick the date the notice went out.");
                        setFlowError("");
                        const res = await recordViolationMailing({
                          violationId: v.id, kind: md.kind, method: md.method,
                          tracking: md.tracking, sentOn: md.sent,
                        });
                        if (!res.ok) return setFlowError(res.error);
                        patch(v.id, {
                          mailings: [...v.mailings, res.mailing],
                          activity: [...v.activity, res.activity],
                        });
                        setMailDrafts({ ...mailDrafts, [v.id]: { kind: "Courtesy notice", method: "First-class mail", sent: "", tracking: "" } });
                      }}>
                      Record this mailing
                    </Pill>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <Eyebrow>Activity log</Eyebrow>
                    <div style={{ background: color.surface, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.md, overflow: "hidden" }}>
                      {[...v.activity].reverse().map((a) => (
                        <div key={a.id} style={{ ...rowGrid, padding: "11px 14px", borderBottom: `1px solid ${color.hairlineSoft}`, gap: "4px 16px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                          <span style={{ fontSize: 14 }}>{a.text}</span>
                          <Mono size={12} style={{ color: color.neutral }}>{a.who}</Mono>
                          <Mono size={12} style={{ color: color.inkQuaternary }}>{a.time}</Mono>
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                      Every status change is stamped with the staff account that made it. The log can&rsquo;t be edited.
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <Eyebrow>Management notes</Eyebrow>
                    {v.notes.map((n, i) => (
                      <div key={i} style={{ background: color.surfaceSunken, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.md, padding: 14 }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 5 }}>
                          <Mono size={12} style={{ color: color.neutral }}>{n.author}</Mono>
                          <Mono size={11} style={{ color: color.inkQuaternary }}>{n.time}</Mono>
                        </span>
                        <span style={{ fontSize: 15, lineHeight: 1.55 }}>{n.text}</span>
                      </div>
                    ))}
                    <Area value={noteDrafts[v.id] ?? ""} rows={2}
                      onChange={(x) => setNoteDrafts({ ...noteDrafts, [v.id]: x })}
                      placeholder="Add a note for the file — what you observed, who you spoke with." />
                    <Pill style={{ justifySelf: "start" }}
                      onClick={async () => {
                        const text = (noteDrafts[v.id] ?? "").trim();
                        if (!text) return;
                        setFlowError("");
                        const res = await addViolationNote({ violationId: v.id, text });
                        if (!res.ok) return setFlowError(res.error);
                        patch(v.id, {
                          notes: [...v.notes, res.note],
                          activity: [...v.activity, res.activity],
                        });
                        setNoteDrafts({ ...noteDrafts, [v.id]: "" });
                      }}>
                      Save note
                    </Pill>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
}
