"use client";

import React, { useMemo, useState } from "react";

import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import type { WorkOrder } from "@/lib/admin-portal/types";
import { assignWorkOrder } from "@/lib/admin-portal/work-actions";
import {
  AddDrawer, Card, CardHead, Chip, DateInput, Field, FieldGrid, Mono, Pill,
  Primary, Select,
} from "../ui";

/**
 * Admin → Property → Schedule.
 *
 * A dispatch board for the people doing the physical work: one row per field
 * tech, one column per day, and every assigned work order sitting in the cell
 * where it is due. Techs come from the employees table; jobs come from
 * work_orders via assigned_to and due_at, so nothing here is invented — an
 * empty board means nothing has been scheduled yet.
 *
 * "Add to the schedule" assigns an open work order to a person and a day,
 * drawing both from records that already exist — the employees table and the
 * work order list — rather than introducing a parallel roster. The assignment
 * writes assigned_to and due_at back to work_orders and stamps the audit
 * trail, so the board survives a refresh.
 */

/** Roles that do physical work and therefore belong on the board. */
const FIELD_ROLES = ["Maintenance tech", "Inspector"];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const PRIORITY_TONE: Record<string, string> = {
  urgent: color.critical,
  high: color.attention,
};

function JobPill({ w }: { w: WorkOrder }) {
  const tone = PRIORITY_TONE[(w.priority ?? "").toLowerCase()] ?? color.neutral;
  return (
    <span
      title={`${w.ref} — ${w.title}`}
      style={{
        display: "block",
        background: color.accentTint,
        border: `1px solid ${color.accentTintBorder}`,
        borderRadius: radius.sm,
        padding: "6px 8px",
        fontSize: 13,
        lineHeight: 1.3,
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 11, color: tone, display: "block" }}>
        {w.ref}
        {w.priority ? ` · ${w.priority}` : ""}
      </span>
      <span style={{ display: "block", marginTop: 2 }}>{w.title}</span>
    </span>
  );
}

export default function Schedule() {
  const s = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showAllStaff, setShowAllStaff] = useState(false);

  // Add-to-schedule drawer
  const [open, setOpen] = useState(false);
  const [tech, setTech] = useState("");
  const [job, setJob] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const crew = useMemo(() => {
    const active = s.staff.filter((m) => m.active);
    return showAllStaff ? active : active.filter((m) => FIELD_ROLES.includes(m.role));
  }, [s.staff, showAllStaff]);

  /** Scheduled = has a tech and a due date. */
  const scheduled = useMemo(
    () => s.work.filter((w) => w.assigneeId && w.dueAt && w.status !== "Closed"),
    [s.work],
  );

  const unscheduled = useMemo(
    () => s.work.filter((w) => (!w.assigneeId || !w.dueAt) && w.status !== "Closed"),
    [s.work],
  );

  const cell = (staffId: string, day: Date) =>
    scheduled.filter(
      (w) => w.assigneeId === staffId && (w.dueAt ?? "").slice(0, 10) === iso(day),
    );

  async function schedule() {
    if (!tech) return setError("Pick who is doing the work.");
    if (!job) return setError("Pick a work order to schedule.");
    if (!day) return setError("Pick the day it is due.");
    const who = s.staff.find((m) => m.id === tech);
    const wo = s.work.find((w) => w.id === job);
    if (!who || !wo) return setError("That tech or work order is no longer available.");

    setSaving(true);
    const res = await assignWorkOrder({ id: job, assigneeName: who.name, dueAt: day });
    setSaving(false);
    if (!res.ok) return setError(res.error);

    s.setWork((prev) => prev.map((w) => (w.id === job ? res.work : w)));
    s.audit(`Scheduled ${wo.ref} — ${wo.title} · ${who.name} · ${day}`);
    setOpen(false);
    setError("");
    setTech("");
    setJob("");
    setDay("");
  }

  const todayIso = iso(new Date());
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <>

      <Card>
        {s.canEditSchedule ? (
        <AddDrawer
          open={open}
          onOpen={() => setOpen(true)}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Add to the schedule"
          title="Put a job on a tech's day"
          note="Assigns an open work order to a person and a date."
        >
          <FieldGrid>
            <Field label="Who">
              <Select
                value={tech}
                onChange={setTech}
                options={[
                  { id: "", label: "Select a person…" },
                  ...s.staff
                    .filter((m) => m.active)
                    .map((m) => ({ id: m.id, label: `${m.name} · ${m.role}` })),
                ]}
              />
            </Field>
            <Field label="Work order">
              <Select
                value={job}
                onChange={setJob}
                options={[
                  { id: "", label: "Select an open work order…" },
                  ...s.work
                    .filter((w) => w.status !== "Closed")
                    .map((w) => ({ id: w.id, label: `${w.ref} — ${w.title}` })),
                ]}
              />
            </Field>
            <Field label="Day"><DateInput value={day} onChange={setDay} /></Field>
          </FieldGrid>
          {error ? (
            <span style={{ fontSize: 14, color: color.critical }}>{error}</span>
          ) : null}
          <Primary onClick={schedule}>{saving ? "Saving…" : "Add to schedule"}</Primary>
        </AddDrawer>
        ) : (
          <div style={{ padding: pad.card, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: color.inkTertiary }}>
              You have view-only access to the schedule.
            </span>
            <Mono size={12} style={{ color: color.inkQuaternary }}>
              An office manager can grant editing in Team.
            </Mono>
          </div>
        )}
        <CardHead
          title={weekLabel}
          meta={`${scheduled.length} scheduled · ${unscheduled.length} unscheduled`}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            padding: "14px clamp(16px, 2.4vw, 24px)",
            alignItems: "center",
          }}
        >
          <Pill onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Previous</Pill>
          <Pill onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Pill>
          <Pill onClick={() => setWeekStart(addDays(weekStart, 7))}>Next ›</Pill>
          <Chip on={showAllStaff} onClick={() => setShowAllStaff(!showAllStaff)}>
            {showAllStaff ? "All staff" : "Field crew only"}
          </Chip>
        </div>

        {crew.length === 0 ? (
          <div style={{ padding: "22px clamp(16px, 2.4vw, 24px)", fontSize: 15, color: color.inkTertiary }}>
            No {showAllStaff ? "active staff" : "maintenance techs or inspectors"} on file yet.
            Add them under Team, then assign work orders to them.
          </div>
        ) : (
          /* Horizontal scroll rather than squeezing: a 7-day board has a real
             minimum width, and crushing the columns makes it unreadable. */
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 860 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px repeat(7, minmax(96px, 1fr))",
                  background: color.surfaceMuted,
                  borderTop: `1px solid ${color.hairline}`,
                  borderBottom: `1px solid ${color.hairline}`,
                }}
              >
                <span style={{ padding: "10px 14px", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
                  Tech
                </span>
                {days.map((d) => (
                  <span
                    key=  {iso(d)}
                    style={{
                      padding: "10px 8px",
                      fontFamily: font.mono,
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: iso(d) === todayIso ? color.accent : color.inkQuaternary,
                      fontWeight: iso(d) === todayIso ? 600 : 400,
                    }}
                  >
                    {DAY_NAMES[d.getDay()]} {d.getDate()}
                  </span>
                ))}
              </div>

              {crew.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px repeat(7, minmax(96px, 1fr))",
                    borderBottom: `1px solid ${color.hairlineSoft}`,
                  }}
                >
                  <span style={{ padding: "12px 14px", minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ display: "block", fontSize: 13, color: color.inkTertiary }}>{m.role}</span>
                  </span>
                  {days.map((d) => {
                    const jobs = cell(m.id, d);
                    return (
                      <span
                        key={iso(d)}
                        style={{
                          padding: 8,
                          display: "grid",
                          gap: 6,
                          alignContent: "start",
                          minHeight: 64,
                          background: iso(d) === todayIso ? "oklch(0.975 0.01 145)" : undefined,
                          borderLeft: `1px solid ${color.hairlineSoft}`,
                        }}
                      >
                        {jobs.map((w) => <JobPill key={w.id} w={w} />)}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHead
          title="Waiting to be scheduled"
          meta={`${unscheduled.length} open`}
        />
        {unscheduled.length === 0 ? (
          <div style={{ padding: "22px clamp(16px, 2.4vw, 24px)", fontSize: 15, color: color.inkTertiary }}>
            Every open work order has a tech and a due date.
          </div>
        ) : (
          <div style={{ padding: "14px clamp(16px, 2.4vw, 24px)", display: "grid", gap: 8 }}>
            {unscheduled.map((w) => (
              <span
                key={w.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  justifyItems: "start",
                  gap: "6px 18px",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontFamily: font.mono, fontSize: 12, color: color.neutral }}>{w.ref}</span>
                <span style={{ fontSize: 15 }}>{w.title}</span>
                <span style={{ fontSize: 14, color: color.inkTertiary }}>
                  {w.assigneeId ? "No due date" : "Unassigned"}
                </span>
                <Pill onClick={() => s.setView("work")}>Open work order</Pill>
              </span>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
