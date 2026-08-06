"use client";

import React, { useMemo, useState } from "react";
import { ADMIN_CALENDAR, LEGAL_CALENDAR, MONTH_NAMES, TODAY } from "@/lib/admin-portal/fixtures";
import { useStore } from "@/lib/admin-portal/store";
import { calColor, calTint, color, font, pad, radius } from "@/lib/admin-portal/tokens";
import type { CalEvent } from "@/lib/admin-portal/types";
import {
  Card, Chip, ErrorLine, Field, FieldGrid, Input, Mono, PageTitle, Pill,
  Primary, Row, RowMain, Select, TextButton,
} from "../ui";

const KINDS = [
  { id: "all", label: "All" },
  { id: "Meeting", label: "Meetings" },
  { id: "Inspection", label: "Inspections" },
  { id: "Booking", label: "Bookings" },
  { id: "Legal", label: "Legal" },
  { id: "Community", label: "Community" },
];

const FEED_OF: Record<string, string> = {
  Meeting: "meetings", Inspection: "inspections", Booking: "bookings",
  Legal: "legal", Community: "community",
};

/** Parses the fixture "Apr 14" format. Production data should carry real dates. */
function parseDay(d: string): { month: number; day: number } | null {
  const m = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(d.trim());
  if (!m) return null;
  const mi = MONTH_NAMES.findIndex((x) => x.slice(0, 3) === m[1]);
  return mi < 0 ? null : { month: mi, day: parseInt(m[2], 10) };
}

export default function Calendar() {
  const s = useStore();
  const [month, setMonth] = useState(TODAY.month);
  const [year, setYear] = useState(TODAY.year);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [dragging, setDragging] = useState("");

  const [syncOpen, setSyncOpen] = useState(false);
  const [connected, setConnected] = useState(true);
  const [lastSync, setLastSync] = useState("12 minutes ago");
  const [direction, setDirection] = useState("Two-way");
  const [reminder, setReminder] = useState("1 day");
  const [copied, setCopied] = useState(false);
  const [feeds, setFeeds] = useState<Record<string, boolean>>({
    meetings: true, inspections: true, bookings: true, legal: false, community: true,
  });
  const [calsOn, setCalsOn] = useState<Record<string, boolean>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState("Meeting");
  const [comm, setComm] = useState(s.communities[0]?.name ?? "Sofi Lakes");
  const [detail, setDetail] = useState("");

  const allEvents: CalEvent[] = useMemo(() => {
    const base: CalEvent[] = [
      ...ADMIN_CALENDAR,
      ...LEGAL_CALENDAR,
      ...s.bookings.filter((b) => b.status !== "Completed" && b.status !== "Cancelled")
        .map((b) => ({ id: b.id, date: b.date, title: b.amenity, detail: b.detail, kind: "Booking", community: "" })),
      ...s.customEvents,
    ];
    return base.map((e) => {
      const moved = s.eventMoves[`${e.kind}|${e.title}`];
      return moved ? { ...e, date: moved } : e;
    });
  }, [s.bookings, s.customEvents, s.eventMoves]);

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

  const agenda = visible
    .filter((e) => {
      const p = parseDay(e.date);
      if (selected) return e.date === selected;
      return p && p.month === month;
    })
    .sort((a, b) => (parseDay(a.date)?.day ?? 99) - (parseDay(b.date)?.day ?? 99));

  const myCalendars = s.communities.filter((c) => {
    const me = s.staff.find((p) => p.name === s.currentUser.split(" · ")[0]);
    return me ? me.communities.includes(c.id) : true;
  });

  const label = (d: number) => `${MONTH_NAMES[month].slice(0, 3)} ${d < 10 ? `0${d}` : d}`;

  function saveEvent() {
    if (!title.trim()) return setError("Give the event a title.");
    if (!date.trim()) return setError("Add a date.");
    s.setCustomEvents((prev) => [...prev, {
      id: s.uid("ce"), date: date.trim(), title: title.trim(), kind, community: comm,
      detail: `${comm}${time.trim() ? ` · ${time.trim()}` : ""}${detail.trim() ? ` · ${detail.trim()}` : ""} · added by ${s.currentUser.split(" · ")[0]}`,
    }]);
    s.audit(`Added calendar event \u201C${title.trim()}\u201D on ${date.trim()}`);
    setAddOpen(false); setError(""); setTitle(""); setDate(""); setTime(""); setDetail("");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <PageTitle title="Calendar" lede={`Meetings, inspections, bookings and legal dates across ${s.scopeLabel}.`} />
        <Primary onClick={() => { setAddOpen(true); setError(""); }}>Add an event</Primary>
      </div>

      {addOpen ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>New event</span>
              <TextButton tone="muted" onClick={() => { setAddOpen(false); setError(""); }}>Cancel</TextButton>
            </div>
            <FieldGrid>
              <Field label="Title"><Input value={title} onChange={setTitle} placeholder="e.g. Reserve study walk-through" /></Field>
              <Field label="Date"><Input value={date} onChange={setDate} placeholder="e.g. Jun 09" /></Field>
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
            <Primary onClick={saveEvent} style={{ justifySelf: "start" }}>
              {connected && feeds[FEED_OF[kind]] ? "Create & push to Google" : "Create event"}
            </Primary>
          </div>
        </Card>
      ) : null}

      <Card style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "center", padding: "18px 22px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: connected ? color.positive : "oklch(0.7 0.02 150)", display: "inline-block" }} />
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{connected ? "ecruz@unitygrid.com" : "Not connected"}</span>
            <span style={{ display: "block", fontSize: 13, color: connected ? color.positive : color.attention, marginTop: 2 }}>
              {connected
                ? `Last synced ${lastSync} · ${direction.toLowerCase()} · ${allEvents.length} events`
                : "Connect a Google account to push meetings, inspections and bookings to it."}
            </span>
          </span>
        </span>
        <span style={{ display: "flex", gap: 10, flexWrap: "wrap", justifySelf: "end" }}>
          <Pill style={{ padding: "8px 16px", fontSize: 14 }} onClick={() => { setLastSync("just now"); setConnected(true); }}>Sync now</Pill>
          <Pill style={{ padding: "8px 16px", fontSize: 14 }} onClick={() => setSyncOpen(!syncOpen)}>
            {syncOpen ? "Hide sync settings" : "Manage sync"}
          </Pill>
        </span>
      </Card>

      {syncOpen ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 14, color: color.inkSecondary }}>What syncs to Google</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { id: "meetings", label: "Board & committee meetings" },
                  { id: "inspections", label: "Inspection routes" },
                  { id: "bookings", label: "Amenity bookings" },
                  { id: "legal", label: "Legal dates" },
                  { id: "community", label: "Community events" },
                ].map((f) => (
                  <Chip key={f.id} size="sm" on={feeds[f.id]} onClick={() => setFeeds({ ...feeds, [f.id]: !feeds[f.id] })}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </div>
            <FieldGrid>
              <Field label="Direction">
                <Select value={direction} onChange={setDirection} options={[
                  { id: "Push only", label: "Push to Google only" },
                  { id: "Two-way", label: "Two-way — pull Google edits back" },
                ]} />
              </Field>
              <Field label="Reminders">
                <Select value={reminder} onChange={setReminder} options={[
                  { id: "1 day", label: "1 day before" }, { id: "3 days", label: "3 days before" },
                  { id: "1 week", label: "1 week before" }, { id: "None", label: "No reminders" },
                ]} />
              </Field>
              <div>
                <span style={{ display: "block", fontSize: 14, color: color.inkSecondary, marginBottom: 8 }}>Subscribe link (iCal)</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Mono style={{ flex: "1 1 auto", color: color.inkTertiary, background: color.surfaceSunken, border: `1px solid ${color.hairline}`, borderRadius: 8, padding: "10px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    https://cal.unitygrid.com/{s.scope}/feed.ics
                  </Mono>
                  <Pill style={{ padding: "8px 16px", fontSize: 14 }} onClick={() => setCopied(true)}>{copied ? "Copied" : "Copy link"}</Pill>
                </div>
              </div>
            </FieldGrid>
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 14, color: color.inkSecondary }}>Community calendars you cover</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {myCalendars.map((c, i) => {
                  const on = calsOn[c.id] !== false;
                  const palette = ["oklch(0.5 0.06 155)", "oklch(0.52 0.08 250)", "oklch(0.55 0.09 60)", "oklch(0.5 0.09 320)"];
                  return (
                    <Chip key={c.id} size="sm" on={on} onClick={() => setCalsOn({ ...calsOn, [c.id]: !on })}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: palette[i % palette.length], display: "inline-block" }} />
                        {c.name}
                      </span>
                    </Chip>
                  );
                })}
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: color.inkQuaternary }}>
              {direction === "Two-way"
                ? "Edits made in Google flow back here. Deletions in Google only remove the calendar entry, never the underlying record."
                : "Events push one way. Nothing in Google can change a meeting, booking or legal date here."}
            </p>
          </div>
        </Card>
      ) : null}

      <Card>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" aria-label="Previous month"
              onClick={() => { setMonth((m) => m === 0 ? 11 : m - 1); if (month === 0) setYear((y) => y - 1); setSelected(""); }}
              style={{ font: "inherit", fontSize: 15, background: "none", border: `1px solid ${color.borderInput}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: color.inkSecondary }}>‹</button>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", minWidth: 170, textAlign: "center" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" aria-label="Next month"
              onClick={() => { setMonth((m) => m === 11 ? 0 : m + 1); if (month === 11) setYear((y) => y + 1); setSelected(""); }}
              style={{ font: "inherit", fontSize: 15, background: "none", border: `1px solid ${color.borderInput}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: color.inkSecondary }}>›</button>
            <Pill style={{ padding: "8px 16px", fontSize: 14 }}
              onClick={() => { setMonth(TODAY.month); setYear(TODAY.year); setSelected(""); }}>Today</Pill>
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
            : "Click any day to add an event · drag an event to another day to reschedule it — the move is logged with your name."}
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
            const dayEvents = visible.filter((e) => {
              const p = parseDay(e.date);
              return p && p.month === month && p.day === d;
            });
            const isToday = year === TODAY.year && month === TODAY.month && d === TODAY.day;
            const isSel = selected === key;
            return (
              <button key={key} type="button"
                onClick={() => {
                  if (dragging) return;
                  setSelected(isSel ? "" : key);
                  setAddOpen(true); setDate(key); setError("");
                }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragging) return;
                  s.setEventMoves((prev) => ({ ...prev, [dragging]: key }));
                  s.audit(`Moved \u201C${dragging.split("|")[1]}\u201D to ${key}`);
                  setDragging("");
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
                    const dragKey = `${e.kind}|${e.title}`;
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
            {selected ? `Agenda · ${selected}` : `Everything in ${MONTH_NAMES[month]}`}
          </h2>
          <span style={{ fontSize: 14, color: color.inkTertiary }}>{agenda.length} {agenda.length === 1 ? "item" : "items"}</span>
        </div>
        {agenda.length === 0 ? (
          <div style={{ padding: `28px ${pad.card}`, fontSize: 15, color: color.inkTertiary }}>Nothing scheduled here.</div>
        ) : agenda.map((e) => {
          const synced = connected && feeds[FEED_OF[e.kind]];
          return (
            <Row key={e.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: calColor[e.kind] ?? color.neutral, display: "inline-block" }} />
                <Mono size={13} style={{ color: color.inkSecondary }}>{e.date}</Mono>
              </span>
              <RowMain label={e.title} detail={e.detail} />
              <Mono size={11} style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: calColor[e.kind] ?? color.neutral }}>{e.kind}</Mono>
              <Mono size={12} style={{ color: synced ? color.positive : color.inkQuaternary }}>{synced ? "on Google" : "local only"}</Mono>
            </Row>
          );
        })}
      </Card>
    </>
  );
}
