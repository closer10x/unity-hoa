"use client";

import React, { useState } from "react";
import { MEETING_STEPS } from "@/lib/admin-portal/actions";
import { emptyAddress, formatAddress } from "@/lib/admin-portal/address";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, pad, radius } from "@/lib/admin-portal/tokens";
import type { Address, Director, Meeting, PendingConfirm } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, AddressFields, Area, Card, CardHead, ConfirmBar,
  ErrorLine, Eyebrow, Field, FieldGrid, Input, Mono, PageTitle, Pill, Primary,
  Row, RowMain, Select, Status, TextButton,
} from "../ui";

const ROLES = ["President", "Vice president", "Treasurer", "Secretary", "Director at large"];
const TYPES = ["Regular board meeting", "Annual meeting", "Special meeting", "Budget workshop", "Architectural committee", "Executive session"];

export default function Board() {
  const s = useStore();

  /* directors */
  const [dOpen, setDOpen] = useState(false);
  const [dError, setDError] = useState("");
  const [dName, setDName] = useState("");
  const [dRole, setDRole] = useState(ROLES[0]);
  const [dAddress, setDAddress] = useState<Address>(emptyAddress());
  const [dStart, setDStart] = useState("");
  const [dEnd, setDEnd] = useState("");

  /* meetings */
  const [mOpen, setMOpen] = useState(false);
  const [mError, setMError] = useState("");
  const [mComm, setMComm] = useState(s.communities[0]?.name ?? "Sofi Lakes");
  const [mType, setMType] = useState(TYPES[0]);
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("");
  const [mPlace, setMPlace] = useState("");
  const [mAddress, setMAddress] = useState("");
  const [mNotice, setMNotice] = useState("");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [minutesOpen, setMinutesOpen] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { attendance: string; body: string; motions: string }>>({});

  function saveDirector() {
    if (!dName.trim()) return setDError("Add the director's name.");
    if (!dStart.trim() || !dEnd.trim()) return setDError("Add the term start and end years.");
    const d: Director = {
      id: s.uid("dir"), name: dName.trim(), role: dRole,
      address: formatAddress(dAddress) || "Address on file",
      term: `Term ${dStart.trim()}–${dEnd.trim()}`,
    };
    s.setDirectors((prev) => [...prev, d]);
    s.audit(`Seated ${d.name} as ${d.role}`);
    setDOpen(false); setDError(""); setDName(""); setDAddress(emptyAddress()); setDStart(""); setDEnd("");
  }

  function saveMeeting() {
    if (!mDate.trim()) return setMError("Add the meeting date.");
    if (!mTime.trim()) return setMError("Add a start time.");
    if (!mPlace.trim()) return setMError("Add a location.");
    const m: Meeting = {
      id: s.uid("m"), date: mDate.trim(), title: mType,
      detail: `${mComm} · ${mPlace.trim()}, ${mTime.trim()}${mAddress.trim() ? ` · ${mAddress.trim()}` : ""}`,
      status: "Scheduled",
      notice: mNotice.trim() || "Notice not sent", noticeOk: false, minutes: null,
    };
    s.setMeetings((prev) => [...prev, m]);
    s.audit(`Scheduled ${mType} on ${mDate.trim()} at ${mPlace.trim()}`);
    setMOpen(false); setMError(""); setMDate(""); setMTime(""); setMPlace(""); setMAddress(""); setMNotice("");
  }

  return (
    <>
      <PageTitle title="Board & meetings" lede="Directors, the meeting calendar, statutory notice and the minutes record." />

      <Card>
        <CardHead title="Directors" meta={`${s.directors.length} seated`} />
        <AddDrawer open={dOpen} onOpen={() => { setDOpen(true); setDError(""); }} onCancel={() => { setDOpen(false); setDError(""); }}
          openLabel="Seat a director" title="Seat a director">
          <FieldGrid>
            <Field label="Name"><Input value={dName} onChange={setDName} placeholder="First and last" /></Field>
            <Field label="Role"><Select value={dRole} onChange={setDRole} options={ROLES.map((r) => ({ id: r, label: r }))} /></Field>
          </FieldGrid>
          <AddressFields value={dAddress} onChange={setDAddress} />
          <FieldGrid>
            <Field label="Term start"><Input value={dStart} onChange={setDStart} placeholder="e.g. 2026" /></Field>
            <Field label="Term end"><Input value={dEnd} onChange={setDEnd} placeholder="e.g. 2029" /></Field>
          </FieldGrid>
          {dError ? <ErrorLine>{dError}</ErrorLine> : null}
          <Primary onClick={saveDirector} style={{ justifySelf: "start" }}>Seat director</Primary>
        </AddDrawer>
        {s.directors.map((d) => (
          <Row key={d.id}>
            <RowMain label={d.name} detail={d.address} />
            <Mono size={12} style={{ color: color.neutral }}>{d.role}</Mono>
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{d.term}</span>
            <TextButton tone="destructive"
              onClick={() => {
                s.setDirectors((prev) => prev.filter((x) => x.id !== d.id));
                s.audit(`Ended term for ${d.name} (${d.role})`);
              }}>
              End term
            </TextButton>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="Meetings" meta="Notice windows follow Texas Property Code" />
        <AddDrawer open={mOpen} onOpen={() => { setMOpen(true); setMError(""); }} onCancel={() => { setMOpen(false); setMError(""); }}
          openLabel="Schedule a meeting" title="Schedule a meeting">
          <FieldGrid>
            <Field label="Community"><Select value={mComm} onChange={setMComm} options={s.communities.map((c) => ({ id: c.name, label: c.name }))} /></Field>
            <Field label="Meeting type"><Select value={mType} onChange={setMType} options={TYPES.map((t) => ({ id: t, label: t }))} /></Field>
            <Field label="Date"><Input value={mDate} onChange={setMDate} placeholder="e.g. Jun 09" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Start time"><Input value={mTime} onChange={setMTime} placeholder="e.g. 6:30 PM" /></Field>
            <Field label="Location"><Input value={mPlace} onChange={setMPlace} placeholder="e.g. Clubhouse Annex" /></Field>
            <Field label="Address"><Input value={mAddress} onChange={setMAddress} placeholder="e.g. 7880 Morrison Rd, Katy" /></Field>
          </FieldGrid>
          <Field label="Notice requirement">
            <Input value={mNotice} onChange={setMNotice} placeholder="e.g. Notice due May 30 · 144-hour window" />
          </Field>
          {mError ? <ErrorLine>{mError}</ErrorLine> : null}
          <Primary onClick={saveMeeting} style={{ justifySelf: "start" }}>Add to calendar</Primary>
        </AddDrawer>

        {s.meetings.map((m) => {
          const menu = buildActionMenu(MEETING_STEPS, m.status, m.id, `${m.title} · ${m.date}`, pending, setPending);
          const draft = drafts[m.id] ?? { attendance: m.minutes?.attendance ?? "", body: m.minutes?.body ?? "", motions: m.minutes?.motions ?? "" };
          return (
            <React.Fragment key={m.id}>
              <Row>
                <Mono size={13} style={{ color: color.neutral }}>{m.date}</Mono>
                <RowMain label={m.title} detail={m.detail} />
                <Mono size={12} style={{ color: m.noticeOk ? color.positive : color.attention }}>{m.notice}</Mono>
                <Status tone={m.status === "Minutes approved" ? "positive" : m.status === "Cancelled" ? "critical" : "neutral"}>{m.status}</Status>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ActionSelect options={menu.options} onChoose={menu.onChoose} />
                  <TextButton onClick={() => setMinutesOpen(minutesOpen === m.id ? "" : m.id)}>
                    {minutesOpen === m.id ? "Hide minutes" : m.minutes ? "Minutes" : "Add minutes"}
                  </TextButton>
                </span>
              </Row>

              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setMeetings((prev) => prev.map((x) => x.id === m.id ? {
                      ...x, status: next,
                      notice: next === "Agenda published" ? "Notice sent" : x.notice,
                      noticeOk: next === "Agenda published" ? true : x.noticeOk,
                    } : x));
                    setPending(null);
                    s.audit(`${m.title} (${m.date}) — ${next}`);
                  }} />
              ) : null}

              {minutesOpen === m.id ? (
                <div style={{ padding: `4px ${pad.card} 24px`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 14 }}>
                  <Eyebrow>Minutes · {m.title}, {m.date}</Eyebrow>
                  {m.minutes?.published ? (
                    <p style={{ fontSize: 13, color: color.positive }}>Approved and published — owners can read these in the portal.</p>
                  ) : null}
                  <Field label="Attendance & quorum">
                    <Input value={draft.attendance} onChange={(v) => setDrafts({ ...drafts, [m.id]: { ...draft, attendance: v } })}
                      placeholder="e.g. 4 of 5 directors present · quorum met · 12 owners attending" />
                  </Field>
                  <Field label="Minutes">
                    <Area value={draft.body} rows={5} onChange={(v) => setDrafts({ ...drafts, [m.id]: { ...draft, body: v } })}
                      placeholder="What was discussed, in the order it happened." />
                  </Field>
                  <Field label="Motions & votes">
                    <Area value={draft.motions} rows={3} onChange={(v) => setDrafts({ ...drafts, [m.id]: { ...draft, motions: v } })}
                      placeholder="e.g. Motion to approve the Q1 financials — passed 4-0." />
                  </Field>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Pill onClick={() => {
                      s.setMeetings((prev) => prev.map((x) => x.id === m.id
                        ? { ...x, minutes: { ...draft, published: x.minutes?.published ?? false } } : x));
                      s.audit(`Saved minutes draft for ${m.title} (${m.date})`);
                    }}>
                      Save draft
                    </Pill>
                    <span style={{ fontSize: 13, color: color.inkQuaternary, alignSelf: "center" }}>
                      Publishing happens through the action dropdown, so it gets a confirmation.
                    </span>
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
