"use client";

import React, { useMemo, useState } from "react";
import { MONTH_NAMES } from "@/lib/admin-portal/fixtures";
import { createCalendarEvent, moveCalendarEvent } from "@/lib/admin-portal/calendar-actions";
import { useStore } from "@/lib/admin-portal/store";
import { calColor, calTint, color, font, pad } from "@/lib/admin-portal/tokens";
import type { CalEvent } from "@/lib/admin-portal/types";
import {
  Card, Chip, DateInput, ErrorLine, Field, FieldGrid, Input, Mono, Pill, Primary, Row, RowMain, Select, TextButton,
} from "../ui";

const KINDS = [
  { id: "all", label: "All" },
  { id: "Meeting", label: "Meetings" },
  { id: "Inspection", label: "Inspections" },
  { id: "Booking", label: "Bookings" },
  { id: "Legal", label: "Legal" },
  { id: "Community", label: "Community" },
];

/**
 * Events arrive in two shapes: rows from the database carry an ISO date,
 * while sections that format for display hand over "Aug 7". Both have to land
 * on the same day of the grid, so everything is read through here.
 */
function parseDay(d: string): { year: number | null; month: number; day: number } | null {
  const text = d.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    return {
      year: parseInt(iso[1], 10),
      month: parseInt(iso[2], 10) - 1,
      day: parseInt(iso[3], 10),
    };
  }
  const named = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(text);
  if (!named) return null;
  const mi = MONTH_NAMES.findIndex((x) => x.slice(0, 3) === named[1]);
  return mi < 0 ? null : { year: null, month: mi, day: parseInt(named[2], 10) };
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** How a day reads in the agenda heading, whichever shape it arrived in. */
function dayLabel(d: string): string {
  const p = parseDay(d);
  if (!p) return d;
  return `${MONTH_NAMES[p.month].slice(0, 3)} ${p.day}`;
}

export default function Calendar() {
  const s = useStore();
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [dragging, setDragging] = useState("");
  const [moveError, setMoveError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState("Meeting");
  const [comm, setComm] = useState(s.communities[0]?.name ?? "");
  const [detail, setDetail] = useState("");

  /* Meetings, bookings and legal dates belong to their own sections; the
     calendar gathers them alongside the events the office adds here. */
  const allEvents: CalEvent[] = useMemo(() => [
    ...s.bookings.filter((b) => b.status !== "Completed" && b.status !== "Cancelled")
      .map((b) => ({ id: b.id, date: b.date, title: b.amenity, detail: b.detail, kind: "Booking", community: "" })),
    ...s.meetings.map((m) => ({
      id: m.id, date: m.date, title: m.title, detail: m.detail, kind: "Meeting", community: "",
    })),
    ...s.customEvents,
  ], [s.bookings, s.meetings, s.customEvents]);

  const visible = allEvents.filter((e) => filter === "all" || e.kind === filter);
  const compact = s.isMobile;

  const cells = useMemo(() => {
    const startPad = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month, year]);

  /* A day is "in this month" when it matches the month, and the year too when
     the source carried one. */
  const onDay = (e: CalEvent, day: number | null) => {
    const p = parseDay(e.date);
    if (!p || p.month !== month) return false;
    if (p.year != null && p.year !== year) return false;
    return day == null || p.day === day;
  };

  const selectedDay = selected ? (parseDay(selected)?.day ?? null) : null;

  const agenda = visible
    .filter((e) => onDay(e, selectedDay))
    .sort((a, b) => (parseDay(a.date)?.day ?? 99) - (parseDay(b.date)?.day ?? 99));

  const myCalendars = s.communities.filter((c) => {
    const me = s.staff.find((p) => p.name === s.currentUser.split(" · ")[0]);
    return me ? me.communities.includes(c.id) : true;
  });

  const label = (d: number) => isoOf(year, month, d);

  async function saveEvent() {
    if (saving) return;
    if (!title.trim()) return setError("Give the event a title.");
    if (!date.trim()) return setError("Pick a date.");
    setSaving(true);
    setError("");
    const res = await createCalendarEvent({
      title, date, time, kind, community: comm, detail,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setCustomEvents((prev) => [...prev, res.event]);
    s.audit(`Added calendar event \u201C${res.event.title}\u201D on ${res.event.date}`);
    setAddOpen(false); setTitle(""); setDate(""); setTime(""); setDetail("");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <Primary onClick={() => { setAddOpen(true); setError(""); }}>Add an event</Primary>
      </div>

      {addOpen ? (
        <Card>
          <div style={{ padding: "clamp(16px, 2.4vw, 24px)", display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>New event</span>
              <TextButton tone="muted" onClick={() => { setAddOpen(false); setError(""); }}>Cancel</TextButton>
            </div>
            <FieldGrid>
              <Field label="Title"><Input value={title} onChange={setTitle} placeholder="e.g. Reserve study walk-through" /></Field>
              <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
              <Field label="Start time"><Input value={time} onChange={setTime} placeholder="e.g. 6:30 PM" /></Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Community calendar">
                <Select value={comm} onChange={setComm} options={myCalendars.map((c) => ({ id: c.name, label: c.name }))} />
              </Field>
              <Field label="Category">
                <Select value={kind} onChange={setKind} options={[
                  { id: "Meeting", label: "Meeting" }, { id: "Inspection", label: "Inspection" },
                  { id: "Booking", label: "Amenity booking" }, { id: "Legal", label: "Legal date" },
                  { id: "Community", label: "Community event" },
                ]} />
              </Field>
              <Field label="Location"><Input value={detail} onChange={setDetail} placeholder="Place, room or address" /></Field>
            </FieldGrid>
            {error ? <ErrorLine>{error}</ErrorLine> : null}
            <Primary onClick={saveEvent} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Creating…" : "Create event"}
            </Primary>
          </div>
        </Card>
      ) : null}



      <Card>
        <div style={{ padding: `18px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" aria-label="Previous month"
              onClick={() => { setMonth((m) => m === 0 ? 11 : m - 1); if (month === 0) setYear((y) => y - 1); setSelected(""); }}
              style={{ font: "inherit", fontSize: 15, background: "none", border: `1px solid ${color.borderInput}`, borderRadius: 8, width: 44, height: 44, cursor: "pointer", color: color.inkSecondary }}>‹</button>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", minWidth: "11ch", textAlign: "center" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" aria-label="Next month"
              onClick={() => { setMonth((m) => m === 11 ? 0 : m + 1); if (month === 11) setYear((y) => y + 1); setSelected(""); }}
              style={{ font: "inherit", fontSize: 15, background: "none", border: `1px solid ${color.borderInput}`, borderRadius: 8, width: 44, height: 44, cursor: "pointer", color: color.inkSecondary }}>›</button>
            <Pill style={{ padding: "8px 16px", fontSize: 14 }}
              onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); setSelected(""); }}>Today</Pill>
          </span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <Chip key={k.id} size="sm" on={filter === k.id} onClick={() => { setFilter(k.id); setSelected(""); }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: k.id === "all" ? "oklch(0.6 0.02 150)" : calColor[k.id], display: "inline-block" }} />
                  {k.label}
                </span>
              </Chip>
            ))}
          </span>
        </div>

        <p style={{ padding: "10px 22px", fontSize: 13, color: color.inkQuaternary, borderBottom: `1px solid ${color.hairlineSoft}` }}>
          {compact
            ? "Tap a day to add an event or see what's on it — the full list is below."
            : "Click any day to add an event · drag an event added here to another day to reschedule it. Meetings and bookings move from their own sections."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", background: color.surfaceMuted, borderBottom: `1px solid ${color.hairlineSoft}` }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d} style={{ padding: "10px 12px", fontFamily: font.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkQuaternary }}>
              {d}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {cells.map((d, i) => {
            if (d === null) {
              return <div key={`pad${i}`} style={{ background: color.surfaceMuted, borderRight: `1px solid ${color.hairlineSoft}`, borderBottom: `1px solid ${color.hairlineSoft}`, minHeight: "clamp(72px, 13vw, 108px)" }} />;
            }
            const key = label(d);
            const dayEvents = visible.filter((e) => onDay(e, d));
            const isToday =
              year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
            const isSel = selected === key;
            return (
              <button key={key} type="button"
                onClick={() => {
                  if (dragging) return;
                  setSelected(isSel ? "" : key);
                  setAddOpen(true); setDate(key); setError("");
                }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const moved = allEvents.find((x) => x.id === dragging);
                  setDragging("");
                  if (!moved) return;
                  setMoveError("");
                  const res = await moveCalendarEvent({ id: moved.id, title: moved.title, date: key });
                  if (!res.ok) return setMoveError(res.error);
                  s.setCustomEvents((prev) =>
                    prev.map((x) => (x.id === moved.id ? { ...x, date: key } : x)));
                  s.audit(`Moved \u201C${moved.title}\u201D to ${key}`);
                }}
                style={{
                  textAlign: "left", font: "inherit", color: "inherit",
                  background: isSel ? color.accentTint : isToday ? "oklch(0.975 0.012 148)" : color.surface,
                  border: "none", borderRight: `1px solid ${color.hairlineSoft}`, borderBottom: `1px solid ${color.hairlineSoft}`,
                  minHeight: "clamp(72px, 13vw, 108px)", padding: "clamp(5px, 1vw, 8px)",
                  display: "grid", gap: 5, alignContent: "start", cursor: "pointer",
                }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <Mono size={12} style={{ color: isToday || isSel ? "oklch(0.35 0.05 155)" : color.inkSecondary, fontWeight: isToday || isSel ? 600 : 400 }}>{d}</Mono>
                  {isToday ? <Mono size={9} style={{ letterSpacing: "0.1em", textTransform: "uppercase", color: color.positive }}>today</Mono> : null}
                </span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: compact ? 3 : 4 }}>
                  {dayEvents.slice(0, 3).map((e) => {
                    const dragKey = e.id;
                    return (
                      <span key={e.id} draggable title={e.title}
                        onDragStart={(ev) => { ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", e.title); setDragging(dragKey); }}
                        onDragEnd={() => setDragging("")}
                        style={{
                          display: compact ? "inline-block" : "block",
                          width: compact ? 9 : "100%", height: compact ? 9 : "auto",
                          fontSize: 11, lineHeight: 1.3,
                          color: calColor[e.kind] ?? color.inkSecondary,
                          background: compact ? (calColor[e.kind] ?? color.neutral) : (calTint[e.kind] ?? "oklch(0.96 0.008 145)"),
                          borderRadius: compact ? 999 : 5,
                          padding: compact ? 0 : "4px 6px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          cursor: "grab", opacity: dragging === dragKey ? 0.4 : 1,
                        }}>
                        {compact ? "" : e.title}
                      </span>
                    );
                  })}
                </span>
                {dayEvents.length > 3 ? <Mono size={10} style={{ color: color.inkQuaternary, paddingLeft: 2 }}>+{dayEvents.length - 3} more</Mono> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ padding: `20px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
            {selected ? `Agenda · ${dayLabel(selected)}` : `Everything in ${MONTH_NAMES[month]}`}
          </h2>
          <span style={{ fontSize: 14, color: color.inkTertiary }}>{agenda.length} {agenda.length === 1 ? "item" : "items"}</span>
        </div>
        {moveError ? <div style={{ padding: `12px ${pad.card}` }}><ErrorLine>{moveError}</ErrorLine></div> : null}
        {agenda.length === 0 ? (
          <div style={{ padding: `28px ${pad.card}`, fontSize: 15, color: color.inkTertiary }}>Nothing scheduled here.</div>
        ) : agenda.map((e) => (
          <Row key={e.id}>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: calColor[e.kind] ?? color.neutral, display: "inline-block" }} />
              <Mono size={13} style={{ color: color.inkSecondary }}>{dayLabel(e.date)}</Mono>
            </span>
            <RowMain label={e.title} detail={e.detail} />
            <Mono size={11} style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: calColor[e.kind] ?? color.neutral }}>{e.kind}</Mono>
          </Row>
        ))}
      </Card>
    </>
  );
}
