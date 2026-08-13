"use client";

import React, { useState } from "react";
import { WORK_STEPS } from "@/lib/admin-portal/actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { PendingConfirm, WorkOrder, WorkStatus } from "@/lib/admin-portal/types";
import {
  assignWorkOrder, createWorkOrder, setWorkOrderStatus, updateWorkOrder,
} from "@/lib/admin-portal/work-actions";
import { usePrimaryAction } from "../SectionHead";
import { Tag, TableRow, TableHead, Scroller, CellStack,
  DropZone,
  ActionSelect, AddDrawer, Card, Chip, ConfirmBar, DateInput, Empty, ErrorLine,
  Field, FieldGrid, FilterBar, Input, Mono, Primary, Row, RowMain,
  Select, Status, Area, TextButton,
} from "../ui";

const FILTERS = ["All", "New", "Scheduled", "In progress", "Closed", "In-house", "Vendor"];

/* Head and rows share one definition — see AGENTS.md on why a table's
   columns cannot be allowed to drift from its head. */
const WORK_COLS = "116px minmax(200px, 1.7fr) minmax(140px, 1fr) 120px minmax(180px, auto)";

export default function WorkOrders() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [reassigning, setReassigning] = useState("");

  /* Editing the order itself: what the job is, where and how urgent. */
  const [editing, setEditing] = useState("");
  const [ef, setEf] = useState({ title: "", location: "", detail: "", priority: "normal", dueAt: "" });
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(w: WorkOrder) {
    if (editing === w.id) { setEditing(""); return; }
    setEditing(w.id);
    setReassigning("");
    setFlowError("");
    setEf({
      title: w.title,
      location: w.detail === "No detail recorded" ? "" : w.detail,
      detail: "",
      priority: w.priority ?? "normal",
      dueAt: w.dueAt ? String(w.dueAt).slice(0, 10) : "",
    });
  }

  async function saveEdit(w: WorkOrder) {
    if (editSaving) return;
    setEditSaving(true);
    setFlowError("");
    const res = await updateWorkOrder({
      id: w.id, title: ef.title, location: ef.location,
      description: ef.detail, priority: ef.priority, dueAt: ef.dueAt,
    });
    setEditSaving(false);
    if (!res.ok) return setFlowError(res.error);
    s.setWork((prev) => prev.map((x) => x.id === w.id ? withAssignee(res.work, w.assignee) : x));
    s.audit(`Work order ${w.ref} edited — ${res.changed}`);
    setEditing("");
  }

  const [open, setOpen] = useState(false);
  /* The header's primary button opens this screen's add-form. */
  usePrimaryAction(() => setOpen(true));
  const [error, setError] = useState("");
  const [flowError, setFlowError] = useState("");
  const [saving, setSaving] = useState(false);
  const [comm, setComm] = useState(s.communities[0]?.name ?? "");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [assignee, setAssignee] = useState("");

  const isStaff = (nameToCheck: string) => s.staff.some((p) => p.name === nameToCheck);

  const assignOptions = [
    ...s.staff.filter((p) => p.active && (p.role === "Maintenance tech" || p.role === "Community manager"))
      .map((p) => ({ name: p.name, kind: "in-house" })),
    ...s.vendors.slice(0, 5).map((v) => ({ name: v.name, kind: "vendor" })),
  ];

  const visible = useSearchFilter(
    s.work, query, ["ref", "title", "detail", "assignee", "status"],
    (w) => {
      if (filter === "All") return true;
      if (filter === "In-house") return isStaff(w.assignee);
      if (filter === "Vendor") return w.assignee !== "Unassigned" && !isStaff(w.assignee);
      return w.status === filter;
    },
  );

  /**
   * A vendor has no employees row, so the database cannot hold their name and
   * the saved row comes back unassigned. Keep the name the office picked for
   * the rest of the session rather than blanking the column they just filled.
   */
  function withAssignee(saved: WorkOrder, fallback: string): WorkOrder {
    return saved.assigneeId ? saved : { ...saved, assignee: fallback };
  }

  async function save() {
    if (!comm.trim()) return setError("Pick the community.");
    if (!title.trim()) return setError("Give the work order a title.");
    if (!assignee) return setError("Assign it to a tech or a vendor.");
    setSaving(true);
    const res = await createWorkOrder({
      community: comm, location, title, detail, priority, assigneeName: assignee,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    const wo = withAssignee(res.work, assignee);
    s.setWork((prev) => [wo, ...prev]);
    s.audit(`Created work order ${wo.ref} — ${wo.title} · assigned to ${assignee}`);
    setOpen(false); setError(""); setTitle(""); setLocation(""); setDetail(""); setAssignee("");
  }

  const techsOnDuty = s.staff.filter((p) => p.active && p.role === "Maintenance tech").map((p) => p.name.split(" ")[0]).join(", ");

  return (
    <>
      <Card>
        <AddDrawer
          ownOpener={false}
          open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="New work order" title="New internal work order"
          note={`Techs on duty: ${techsOnDuty || "none"}`}>
          <FieldGrid>
            <Field label="Community">
              <Select value={comm} onChange={setComm} options={s.communities.map((c) => ({ id: c.name, label: c.name }))} />
            </Field>
            <Field label="Location"><Input value={location} onChange={setLocation} placeholder="e.g. north entry irrigation" /></Field>
            <Field label="Priority">
              <Select value={priority} onChange={setPriority} options={[
                { id: "Routine", label: "Routine — next visit" },
                { id: "Soon", label: "Soon — within a week" },
                { id: "Urgent", label: "Urgent — same day" },
              ]} />
            </Field>
          </FieldGrid>
          <Field label="What needs doing"><Input value={title} onChange={setTitle} placeholder="Short title for the crew" /></Field>
          <Field label="Scope notes"><Area value={detail} onChange={setDetail} placeholder="Access, parts, hazards, anything the tech should know." /></Field>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Assign to a Unity Grid tech, or sub it to a vendor</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {assignOptions.map((o) => (
                <Chip key={o.name} on={assignee === o.name} onClick={() => setAssignee(o.name)}>{o.name} · {o.kind}</Chip>
              ))}
            </div>
          </div>
          <DropZone camera>photos of the problem — take one now, or drag files here</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start" }}>
            {saving ? "Saving…" : "Create work order"}
          </Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search title, ref or assignee…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {visible.length === 0 ? <Empty>No work orders match that.</Empty> : (
        <Scroller min={900}>
        <TableHead
          cols={WORK_COLS}
          labels={["Ref", "Job", "Assigned to", "Status", ""]}
          align={[3]}
        />
        {visible.map((w) => {
          const menu = buildActionMenu(WORK_STEPS, w.status, w.id, w.title, pending, setPending);
          return (
            <React.Fragment key={w.id}>
              <TableRow cols={WORK_COLS}>
                <Mono size={13} style={{ color: color.neutral }}>{w.ref}</Mono>
                <CellStack top={w.title} sub={w.detail} />
                <CellStack
                  top={w.assignee}
                  sub={w.assignee === "Unassigned" ? "unassigned" : isStaff(w.assignee) ? "in-house" : "vendor"}
                />
                <span style={{ textAlign: "right" }}>
                  <Tag tone={w.status === "Closed" ? "moss" : w.status === "New" ? "amber" : "grey"}>{w.status}</Tag>
                </span>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ActionSelect options={menu.options} onChoose={menu.onChoose} />
                  <TextButton onClick={() => openEdit(w)}>{editing === w.id ? "Close" : "Edit"}</TextButton>
                  <TextButton onClick={() => setReassigning(reassigning === w.id ? "" : w.id)}>Reassign</TextButton>
                </span>
              </TableRow>

              {editing === w.id ? (
                <div style={{ padding: "0 24px 20px", borderBottom: `1px solid ${color.hairlineSoft}` }}>
                  <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: 14, padding: 20, display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Edit {w.ref}</span>
                      <TextButton tone="muted" onClick={() => setEditing("")}>Cancel</TextButton>
                    </div>
                    <FieldGrid>
                      <Field label="Title"><Input value={ef.title} onChange={(v) => setEf({ ...ef, title: v })} placeholder="What needs doing" /></Field>
                      <Field label="Location"><Input value={ef.location} onChange={(v) => setEf({ ...ef, location: v })} placeholder="e.g. Park 1" /></Field>
                      <Field label="Priority">
                        <Select value={ef.priority} onChange={(v) => setEf({ ...ef, priority: v })} options={[
                          { id: "low", label: "Low" },
                          { id: "normal", label: "Routine" },
                          { id: "high", label: "Urgent" },
                          { id: "urgent", label: "Emergency" },
                        ]} />
                      </Field>
                      <Field label="Due date"><DateInput value={ef.dueAt} onChange={(v: string) => setEf({ ...ef, dueAt: v })} /></Field>
                    </FieldGrid>
                    <Field label="Add to the description" hint="Appended detail for whoever picks the job up">
                      <Area value={ef.detail} onChange={(v) => setEf({ ...ef, detail: v })} rows={2} placeholder="Anything the tech should know" />
                    </Field>
                    <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                      Status and who it is assigned to are changed from the row itself, so an edit never moves the job along on its own.
                    </span>
                    <Primary onClick={() => saveEdit(w)} style={{ justifySelf: "start", opacity: editSaving ? 0.6 : 1 }}>
                      {editSaving ? "Saving…" : "Save changes"}
                    </Primary>
                  </div>
                </div>
              ) : null}

              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={async () => {
                    const next = menu.nextValue! as WorkStatus;
                    setPending(null);
                    setFlowError("");
                    const res = await setWorkOrderStatus({ id: w.id, status: next });
                    if (!res.ok) return setFlowError(res.error);
                    const saved = next === "New" ? res.work : withAssignee(res.work, w.assignee);
                    s.setWork((prev) => prev.map((x) => x.id === w.id ? saved : x));
                    s.audit(`Work order ${w.ref} → ${next} (${w.title})`);
                  }} />
              ) : null}

              {reassigning === w.id ? (
                <div style={{ padding: "0 24px 20px", display: "grid", gap: 12, borderBottom: `1px solid ${color.hairlineSoft}` }}>
                  <span style={{ fontSize: 14, color: color.inkSecondary }}>Assign to</span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {assignOptions.map((o) => (
                      <Chip key={o.name} on={w.assignee === o.name}
                        onClick={async () => {
                          setFlowError("");
                          const res = await assignWorkOrder({ id: w.id, assigneeName: o.name });
                          if (!res.ok) return setFlowError(res.error);
                          s.setWork((prev) => prev.map((x) => x.id === w.id ? withAssignee(res.work, o.name) : x));
                          setReassigning("");
                          s.audit(`Reassigned ${w.ref} to ${o.name}`);
                        }}>
                        {o.name} · {o.kind}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
        </Scroller>
        )}
      </Card>
    </>
  );
}
