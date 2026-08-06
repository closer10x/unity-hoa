"use client";

import React, { useState } from "react";
import { WORK_STEPS } from "@/lib/admin-portal/actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, font } from "@/lib/admin-portal/tokens";
import type { PendingConfirm, WorkOrder } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, Card, CardHead, Chip, ConfirmBar, Empty, ErrorLine,
  Field, FieldGrid, FilterBar, Input, Mono, PageTitle, Primary, Row, RowMain,
  Select, Status, Area, TextButton,
} from "../ui";

const FILTERS = ["All", "New", "Scheduled", "In progress", "Closed", "In-house", "Vendor"];

export default function WorkOrders() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [reassigning, setReassigning] = useState("");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [comm, setComm] = useState(s.communities[0]?.name ?? "Sofi Lakes");
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

  function save() {
    if (!title.trim()) return setError("Give the work order a title.");
    if (!assignee) return setError("Assign it to a tech or a vendor.");
    const wo: WorkOrder = {
      id: s.uid("w"),
      ref: `UG-${Math.floor(400000 + Math.random() * 99999)}`,
      title: title.trim(),
      detail: `${comm}${location.trim() ? ` · ${location.trim()}` : ""} · ${priority.toLowerCase()} · internal`,
      assignee, status: "Scheduled",
    };
    s.setWork((prev) => [wo, ...prev]);
    s.audit(`Created work order ${wo.ref} — ${wo.title} · assigned to ${assignee}`);
    setOpen(false); setError(""); setTitle(""); setLocation(""); setDetail(""); setAssignee("");
  }

  const techsOnDuty = s.staff.filter((p) => p.active && p.role === "Maintenance tech").map((p) => p.name.split(" ")[0]).join(", ");

  return (
    <>
      <PageTitle title="Work orders" lede="Resident reports and scheduled maintenance. Assign it, then close with a note." />
      <Card>
        <AddDrawer
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
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start" }}>Create work order</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search title, ref or assignee…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {visible.length === 0 ? <Empty>No work orders match that.</Empty> : visible.map((w) => {
          const menu = buildActionMenu(WORK_STEPS, w.status, w.id, w.title, pending, setPending);
          return (
            <React.Fragment key={w.id}>
              <Row>
                <Mono size={13} style={{ color: color.neutral }}>{w.ref}</Mono>
                <RowMain label={w.title} detail={w.detail} />
                <span>
                  <span style={{ display: "block", fontSize: 14, color: color.inkSecondary }}>{w.assignee}</span>
                  <Mono size={11} style={{ color: color.inkQuaternary }}>
                    {w.assignee === "Unassigned" ? "unassigned" : isStaff(w.assignee) ? "in-house" : "vendor"}
                  </Mono>
                </span>
                <Status tone={w.status === "Closed" ? "positive" : w.status === "New" ? "attention" : "neutral"}>{w.status}</Status>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ActionSelect options={menu.options} onChoose={menu.onChoose} />
                  <TextButton onClick={() => setReassigning(reassigning === w.id ? "" : w.id)}>Reassign</TextButton>
                </span>
              </Row>

              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setWork((prev) => prev.map((x) => x.id === w.id ? { ...x, status: next } : x));
                    setPending(null);
                    s.audit(`Work order ${w.ref} → ${next} (${w.title})`);
                  }} />
              ) : null}

              {reassigning === w.id ? (
                <div style={{ padding: "0 24px 20px", display: "grid", gap: 12, borderBottom: `1px solid ${color.hairlineSoft}` }}>
                  <span style={{ fontSize: 14, color: color.inkSecondary }}>Assign to</span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {assignOptions.map((o) => (
                      <Chip key={o.name} on={w.assignee === o.name}
                        onClick={() => {
                          s.setWork((prev) => prev.map((x) => x.id === w.id
                            ? { ...x, assignee: o.name, status: x.status === "New" ? "Scheduled" : x.status } : x));
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
      </Card>
    </>
  );
}
