"use client";

import React, { useState } from "react";
import { WORK_STEPS } from "@/lib/admin-portal/actions";
import { crewLinkNote } from "@/lib/admin-portal/crew-link";
import { localDayIso } from "@/lib/admin-portal/day";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import type { PendingConfirm, Staff, WorkOrder, WorkStatus } from "@/lib/admin-portal/types";
import { recordPhotoUrl } from "@/lib/supabase/message-files";
import {
  assignWorkOrder, createWorkOrder, setWorkOrderStatus, updateWorkOrder,
} from "@/lib/admin-portal/work-actions";
import { isFieldRole } from "@/lib/crew/roles";
import { usePrimaryAction } from "../SectionHead";
import { Tag, TableRow, TableHead, Scroller, CellStack,
  CardHead, CopyLine, DropZone,
  ActionSelect, AddDrawer, Card, Chip, ConfirmBar, DateInput, Empty, ErrorLine,
  Field, FieldGrid, FilterBar, Input, Mono, Primary,
  Select, Area, TextButton,
} from "../ui";

const FILTERS = ["All", "New", "Scheduled", "In progress", "Closed", "In-house", "Vendor"];

/**
 * Who is out there today, and how to reach their board.
 *
 * There is no duty roster in the database and inventing one would be a
 * fixture standing in for a record, so "on duty" is read off the work itself:
 * an active field employee with a job due today on their board is on today.
 * That is the same rule the Schedule board draws its columns from, so the two
 * screens can never disagree about who is working.
 *
 * The job-board link sits with the person rather than behind a menu because
 * handing it over is the common act — a tech loses the text, changes phone,
 * or a manager needs it open on their own screen to see what the crew sees.
 */
type CrewDay = {
  person: Staff;
  /** Open jobs due today — what puts them on duty. */
  dueToday: number;
  open: number;
  overdue: number;
};

function crewStatus(c: CrewDay): { label: string; tone: "moss" | "amber" | "grey"; detail: string } {
  if (!c.person.active) {
    return {
      label: "Off",
      tone: "grey",
      detail: "Account switched off — they can't be assigned work until it is switched back on.",
    };
  }
  const overdue = c.overdue ? ` · ${c.overdue} past due` : "";
  if (c.dueToday > 0) {
    return {
      label: "On today",
      tone: "moss",
      detail: `${c.dueToday} job${c.dueToday === 1 ? "" : "s"} due today · ${c.open} open in total${overdue}`,
    };
  }
  if (c.open > 0) {
    return {
      label: c.overdue ? "Behind" : "No jobs today",
      tone: c.overdue ? "amber" : "grey",
      detail: `${c.open} open, none due today${overdue}`,
    };
  }
  return { label: "Clear", tone: "grey", detail: "Nothing on their board." };
}

function CrewOnDuty({ crew }: { crew: CrewDay[] }) {
  const onDuty = crew.filter((c) => c.person.active && c.dueToday > 0);
  const dueTotal = onDuty.reduce((sum, c) => sum + c.dueToday, 0);

  return (
    <Card>
      <CardHead
        title="Field crew"
        meta={
          crew.length === 0
            ? "Nobody on the field crew yet"
            : onDuty.length
              ? `${onDuty.map((c) => c.person.name.split(" ")[0]).join(", ")} on duty · ${dueTotal} job${dueTotal === 1 ? "" : "s"} due today`
              : "Nobody has a job due today"
        }
      />
      <div style={{ padding: `2px ${pad.card} 20px`, display: "grid", gap: 4 }}>
        {crew.length === 0 ? (
          <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkTertiary, paddingTop: 14 }}>
            No maintenance techs or inspectors on file. Add one under Team — their
            job-board link is created with the account and texted to them.
          </span>
        ) : (
          crew.map((c, i) => {
            const st = crewStatus(c);
            return (
              <div
                key={c.person.id}
                style={{
                  display: "grid", gap: 9, minWidth: 0,
                  padding: "14px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${color.hairlineSoft}`,
                  opacity: c.person.active ? 1 : 0.72,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", alignItems: "baseline", minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: color.ink }}>{c.person.name}</span>
                  <Mono size={12} style={{ color: color.neutral }}>{c.person.role}</Mono>
                  <span style={{ marginLeft: "auto" }}><Tag tone={st.tone}>{st.label}</Tag></span>
                </div>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: color.inkTertiary }}>{st.detail}</span>
                {c.person.crewUrl ? (
                  <CopyLine value={c.person.crewUrl} note={crewLinkNote(c.person)} />
                ) : (
                  <span style={{ fontFamily: font.mono, fontSize: 12.5, color: color.attention }}>
                    No job board link — issue one from Team.
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

/* Head and rows share one definition — see AGENTS.md on why a table's
   columns cannot be allowed to drift from its head. */
const WORK_COLS = "116px minmax(200px, 1.7fr) minmax(140px, 1fr) 120px minmax(180px, auto)";

/** Thumbnail on the job cell — paired with the title so a sixth column does not wrap the actions. */
function JobPhoto({ id, alt, size = 40 }: { id: string; alt: string; size?: number }) {
  const href = recordPhotoUrl("work-orders", id);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${alt} — open full size`}
      style={{ display: "block", lineHeight: 0, flex: "0 0 auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt={alt}
        style={{
          width: size, height: size, objectFit: "cover",
          borderRadius: 8, border: `1px solid ${color.hairlineSoft}`,
        }}
      />
    </a>
  );
}

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

  /* The crew, and what each of them has on today. Inspectors count: they are
     out on the same properties, off the same board. */
  const today = localDayIso();
  const crew: CrewDay[] = s.staff
    .filter((p) => isFieldRole(p.role))
    .map((person) => {
      const theirs = s.work.filter((w) => w.assigneeId === person.id && w.status !== "Closed");
      const due = (w: WorkOrder) => String(w.dueAt ?? "").slice(0, 10);
      return {
        person,
        dueToday: theirs.filter((w) => due(w) === today).length,
        open: theirs.length,
        overdue: theirs.filter((w) => due(w) && due(w) < today).length,
      };
    })
    /* On duty first, then everyone still working, then the switched-off. */
    .sort((a, b) =>
      Number(b.person.active) - Number(a.person.active) ||
      b.dueToday - a.dueToday ||
      a.person.name.localeCompare(b.person.name),
    );

  return (
    <>
      <CrewOnDuty crew={crew} />

      <Card>
        <AddDrawer
          ownOpener={false}
          open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="New work order" title="New internal work order">
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
                <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  {w.photoPath ? <JobPhoto id={w.id} alt={w.title} /> : null}
                  <CellStack top={w.title} sub={w.detail} />
                </span>
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
                    {w.photoPath ? (
                      <div>
                        <span style={{ display: "block", fontSize: 14, color: color.inkSecondary, marginBottom: 8 }}>
                          Resident photo
                        </span>
                        <JobPhoto id={w.id} alt={w.title} size={160} />
                      </div>
                    ) : null}
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
