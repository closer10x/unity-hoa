"use client";

import React, { useState } from "react";
import { MEETING_STEPS } from "@/lib/admin-portal/actions";
import { emptyAddress } from "@/lib/admin-portal/address";
import {
  createMeeting, endDirectorTerm, saveMinutes, seatDirector, setMeetingStatus, updateDirector,
} from "@/lib/admin-portal/board-actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { Address, MeetingStatus, PendingConfirm } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, AddressFields, Area, Card, CardHead, Chip, ConfirmBar,
  DateInput, Empty, ErrorLine, Eyebrow, Field, FieldGrid, Input, Mono, Pill, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const ROLES = ["President", "Vice president", "Treasurer", "Secretary", "Director at large"];
const TYPES = ["Regular board meeting", "Annual meeting", "Special meeting", "Budget workshop", "Architectural committee", "Executive session"];

/**
 * The roster is history — a closed-out term keeps its row. A term whose end
 * date has arrived is no longer seated.
 */
function termEnded(term: string): boolean {
  const end = term.split("–").pop()?.trim();
  if (!end || end === term.trim()) return false;
  const parsed = new Date(`${end} 12:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const noonToday = new Date();
  noonToday.setHours(12, 0, 0, 0);
  return parsed.getTime() <= noonToday.getTime();
}

export default function Board() {
  const s = useStore();

  /* directors */
  const [dOpen, setDOpen] = useState(false);
  const [dError, setDError] = useState("");
  const [dName, setDName] = useState("");
  const [dRole, setDRole] = useState(ROLES[0]);
  const [dComm, setDComm] = useState(s.communities[0]?.name ?? "");
  const [dAddress, setDAddress] = useState<Address>(emptyAddress());
  const [dStart, setDStart] = useState("");
  const [dEnd, setDEnd] = useState("");
  const [dSaving, setDSaving] = useState(false);
  const [dFlowError, setDFlowError] = useState("");
  const [ending, setEnding] = useState("");
  /* Filter the roster to one community's board when there is more than one. */
  const [dFilter, setDFilter] = useState("all");
  const dVisible = dFilter === "all"
    ? s.directors
    : s.directors.filter((d) => d.community === dFilter);

  /* inline edit of a seated director */
  const [editing, setEditing] = useState("");
  const [ef, setEf] = useState({ name: "", role: ROLES[0], community: "", address: emptyAddress(), start: "", end: "" });
  const [eError, setEError] = useState("");
  const [eSaving, setESaving] = useState(false);

  // The Director carries composed strings; parse them back so the edit form
  // opens pre-filled. Both the address and the "start – end" term follow a
  // known format, so this round-trips the standard cases.
  function openEdit(d: (typeof s.directors)[number]) {
    setEnding("");
    setEError("");
    const years = (d.term.match(/\b(\d{4})\b/g) ?? []);
    const parts = d.address === "No address recorded" ? [] : d.address.split(", ");
    const streetParts = (parts[0] ?? "").split(" ");
    const streetNo = /^\d/.test(streetParts[0] ?? "") ? streetParts[0] : "";
    const street = streetNo ? streetParts.slice(1).join(" ") : (parts[0] ?? "");
    const cityStateZip = parts.slice(1);
    const city = cityStateZip[0] ?? "";
    const stateZip = (cityStateZip[cityStateZip.length - 1] ?? "").split(" ");
    const zip = /^\d{5}/.test(stateZip[stateZip.length - 1] ?? "") ? stateZip[stateZip.length - 1] : "";
    const state = zip ? stateZip.slice(0, -1).join(" ") : cityStateZip.slice(1).join(", ");
    setEf({
      name: d.name,
      role: ROLES.includes(d.role) ? d.role : ROLES[0],
      community: d.community || (s.communities[0]?.name ?? ""),
      address: { ...emptyAddress(), streetNo, street, city, state: state || "Texas", zip },
      start: years[0] ?? "",
      end: years[1] ?? "",
    });
    setEditing(d.id);
  }

  async function saveEdit(id: string) {
    if (!ef.name.trim()) return setEError("Add the director's name.");
    if (!ef.start.trim() || !ef.end.trim()) return setEError("Add the term start and end years.");
    setESaving(true);
    const res = await updateDirector({
      id, name: ef.name, role: ef.role, community: ef.community,
      streetNumber: ef.address.streetNo, streetName: ef.address.street, unit: ef.address.unit,
      city: ef.address.city, state: ef.address.state, zip: ef.address.zip,
      termStart: ef.start, termEnd: ef.end,
    });
    setESaving(false);
    if (!res.ok) return setEError(res.error);
    s.setDirectors((prev) => prev.map((x) => (x.id === id ? res.director : x)));
    setEditing("");
  }

  /* meetings */
  const [mOpen, setMOpen] = useState(false);
  const [mError, setMError] = useState("");
  const [mComm, setMComm] = useState(s.communities[0]?.name ?? "");
  const [mType, setMType] = useState(TYPES[0]);
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("");
  const [mPlace, setMPlace] = useState("");
  const [mAddress, setMAddress] = useState("");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [flowError, setFlowError] = useState("");
  const [saving, setSaving] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState("");
  const [minutesSaved, setMinutesSaved] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { attendance: string; body: string; motions: string }>>({});

  async function saveDirector() {
    if (!dName.trim()) return setDError("Add the director's name.");
    if (!dComm.trim()) return setDError("Pick the community this board serves.");
    if (!dStart.trim() || !dEnd.trim()) return setDError("Add the term start and end years.");
    setDSaving(true);
    const res = await seatDirector({
      name: dName, role: dRole, community: dComm,
      streetNumber: dAddress.streetNo, streetName: dAddress.street, unit: dAddress.unit,
      city: dAddress.city, state: dAddress.state, zip: dAddress.zip,
      termStart: dStart, termEnd: dEnd,
    });
    setDSaving(false);
    if (!res.ok) return setDError(res.error);
    s.setDirectors((prev) => [...prev, res.director]);
    setDOpen(false); setDError(""); setDName("");
    setDComm(s.communities[0]?.name ?? ""); setDAddress(emptyAddress()); setDStart(""); setDEnd("");
  }

  async function saveMeeting() {
    if (!mComm.trim()) return setMError("Pick the community this meeting belongs to.");
    if (!mDate.trim()) return setMError("Add the meeting date.");
    if (!mTime.trim()) return setMError("Add a start time.");
    if (!mPlace.trim()) return setMError("Add a location.");
    setSaving(true);
    const res = await createMeeting({
      community: mComm, meetingType: mType, dateISO: mDate,
      time: mTime, location: mPlace, address: mAddress,
    });
    setSaving(false);
    if (!res.ok) return setMError(res.error);
    s.setMeetings((prev) => [res.meeting, ...prev]);
    setMOpen(false); setMError(""); setMDate(""); setMTime(""); setMPlace(""); setMAddress("");
  }

  return (
    <>

      <Card>
        <CardHead title="Directors" meta={`${s.directors.filter((d) => !termEnded(d.term)).length} seated`} />
        <AddDrawer open={dOpen} onOpen={() => { setDOpen(true); setDError(""); }} onCancel={() => { setDOpen(false); setDError(""); }}
          openLabel="Seat a director" title="Seat a director">
          <FieldGrid>
            <Field label="Name"><Input value={dName} onChange={setDName} placeholder="First and last" /></Field>
            <Field label="Role"><Select value={dRole} onChange={setDRole} options={ROLES.map((r) => ({ id: r, label: r }))} /></Field>
            <Field label="Community" hint="Which community's board this seat is on.">
              <Select value={dComm} onChange={setDComm} placeholder="Pick a community"
                options={s.communities.map((c) => ({ id: c.name, label: c.name }))} />
            </Field>
          </FieldGrid>
          <AddressFields value={dAddress} onChange={setDAddress} />
          <FieldGrid>
            <Field label="Term start" hint="A year starts the term on January 1.">
              <Input value={dStart} onChange={setDStart} placeholder="e.g. 2026" />
            </Field>
            <Field label="Term end" hint="A year runs the term through December 31.">
              <Input value={dEnd} onChange={setDEnd} placeholder="e.g. 2029" />
            </Field>
          </FieldGrid>
          {dError ? <ErrorLine>{dError}</ErrorLine> : null}
          <Primary onClick={saveDirector} style={{ justifySelf: "start" }}>{dSaving ? "Saving…" : "Seat director"}</Primary>
        </AddDrawer>

        {dFlowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{dFlowError}</ErrorLine></div> : null}

        {s.communities.length > 1 ? (
          <div style={{ padding: `14px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip size="sm" on={dFilter === "all"} onClick={() => setDFilter("all")}>All boards</Chip>
            {s.communities.map((c) => (
              <Chip key={c.id} size="sm" on={dFilter === c.name} onClick={() => setDFilter(c.name)}>{c.name}</Chip>
            ))}
          </div>
        ) : null}

        {s.directors.length === 0 ? (
          <Empty>No directors on the roster. Seat the board here — each seat carries a role and a term, and the roster keeps past terms.</Empty>
        ) : dVisible.length === 0 ? (
          <Empty>No directors on the {dFilter} board yet.</Empty>
        ) : null}

        {dVisible.map((d) => {
          const ended = termEnded(d.term);
          return (
            <React.Fragment key={d.id}>
              <Row>
                <RowMain label={d.name} detail={d.address} />
                {/* Role and community pair in one cell — the board a seat is on
                    reads under the role, keeping the row inside its cell budget. */}
                <span style={{ display: "grid", gap: 2 }}>
                  <Mono size={12} style={{ color: color.neutral }}>{d.role}</Mono>
                  {d.community ? <Mono size={11} style={{ color: color.inkQuaternary }}>{d.community}</Mono> : null}
                </span>
                <span style={{ fontSize: 14, color: color.inkTertiary }}>{d.term}</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <TextButton onClick={() => (editing === d.id ? setEditing("") : openEdit(d))}>
                    {editing === d.id ? "Close" : "Edit"}
                  </TextButton>
                  {ended ? (
                    <Status tone="neutral">Term ended</Status>
                  ) : (
                    <TextButton tone="destructive"
                      onClick={() => { setDFlowError(""); setEnding(ending === d.id ? "" : d.id); }}>
                      End term
                    </TextButton>
                  )}
                </span>
              </Row>
              {editing === d.id ? (
                <div style={{ padding: `18px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, background: color.surfaceSunken, display: "grid", gap: 16 }}>
                  <FieldGrid>
                    <Field label="Name"><Input value={ef.name} onChange={(v) => setEf((p) => ({ ...p, name: v }))} placeholder="First and last" /></Field>
                    <Field label="Role"><Select value={ef.role} onChange={(v) => setEf((p) => ({ ...p, role: v }))} options={ROLES.map((r) => ({ id: r, label: r }))} /></Field>
                    <Field label="Community" hint="Which community's board this seat is on.">
                      <Select value={ef.community} onChange={(v) => setEf((p) => ({ ...p, community: v }))} placeholder="Pick a community"
                        options={s.communities.map((c) => ({ id: c.name, label: c.name }))} />
                    </Field>
                  </FieldGrid>
                  <AddressFields value={ef.address} onChange={(a) => setEf((p) => ({ ...p, address: a }))} />
                  <FieldGrid>
                    <Field label="Term start" hint="A year starts the term on January 1.">
                      <Input value={ef.start} onChange={(v) => setEf((p) => ({ ...p, start: v }))} placeholder="e.g. 2026" />
                    </Field>
                    <Field label="Term end" hint="A year runs the term through December 31.">
                      <Input value={ef.end} onChange={(v) => setEf((p) => ({ ...p, end: v }))} placeholder="e.g. 2029" />
                    </Field>
                  </FieldGrid>
                  {eError ? <ErrorLine>{eError}</ErrorLine> : null}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Primary onClick={() => saveEdit(d.id)} style={{ justifySelf: "start" }}>{eSaving ? "Saving…" : "Save changes"}</Primary>
                    <TextButton tone="muted" onClick={() => setEditing("")}>Cancel</TextButton>
                  </div>
                </div>
              ) : null}
              {ending === d.id ? (
                <ConfirmBar
                  text={`End ${d.name}'s term as ${d.role}? The seat closes out as of today and they come off the seated count. The term stays on the roster with its end date, and the change is written to the audit trail.`}
                  confirmLabel="Yes, end the term"
                  onCancel={() => setEnding("")}
                  onConfirm={async () => {
                    setEnding("");
                    setDFlowError("");
                    const res = await endDirectorTerm({ id: d.id, name: d.name });
                    if (!res.ok) return setDFlowError(res.error);
                    s.setDirectors((prev) => prev.map((x) => (x.id === d.id ? res.director : x)));
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>

      <Card>
        <CardHead title="Meetings" meta="Notice windows follow Texas Property Code" />
        <AddDrawer open={mOpen} onOpen={() => { setMOpen(true); setMError(""); }} onCancel={() => { setMOpen(false); setMError(""); }}
          openLabel="Schedule a meeting" title="Schedule a meeting">
          <FieldGrid>
            <Field label="Community">
              <Select value={mComm} onChange={setMComm} placeholder="Pick a community"
                options={s.communities.map((c) => ({ id: c.name, label: c.name }))} />
            </Field>
            <Field label="Meeting type" hint="The annual meeting carries a 10-day notice window; everything else 144 hours.">
              <Select value={mType} onChange={setMType} options={TYPES.map((t) => ({ id: t, label: t }))} />
            </Field>
            <Field label="Date"><DateInput value={mDate} onChange={setMDate} /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Start time"><Input value={mTime} onChange={setMTime} placeholder="e.g. 6:30 PM" /></Field>
            <Field label="Location"><Input value={mPlace} onChange={setMPlace} placeholder="e.g. Clubhouse Annex" /></Field>
            <Field label="Address"><Input value={mAddress} onChange={setMAddress} placeholder="e.g. 7880 Morrison Rd, Katy" /></Field>
          </FieldGrid>
          {mError ? <ErrorLine>{mError}</ErrorLine> : null}
          <Primary onClick={saveMeeting} style={{ justifySelf: "start" }}>{saving ? "Saving…" : "Add to calendar"}</Primary>
        </AddDrawer>

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {s.meetings.length === 0 ? (
          <Empty>No meetings on the calendar. Schedule one here — the notice window is set from the meeting type, and minutes attach to the meeting once it is held.</Empty>
        ) : null}

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
                  onConfirm={async () => {
                    const next = menu.nextValue! as MeetingStatus;
                    setPending(null);
                    setFlowError("");
                    const res = await setMeetingStatus({ meetingId: m.id, status: next });
                    if (!res.ok) return setFlowError(res.error);
                    s.setMeetings((prev) => prev.map((x) => (x.id === m.id ? res.meeting : x)));
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
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Pill onClick={async () => {
                      setFlowError("");
                      setMinutesSaved("");
                      const res = await saveMinutes({ meetingId: m.id, ...draft });
                      if (!res.ok) return setFlowError(res.error);
                      s.setMeetings((prev) => prev.map((x) => (x.id === m.id ? { ...x, minutes: res.minutes } : x)));
                      setMinutesSaved(m.id);
                    }}>
                      Save draft
                    </Pill>
                    {minutesSaved === m.id ? <Mono size={13} style={{ color: color.positive }}>Saved</Mono> : null}
                    <span style={{ fontSize: 13, color: color.inkQuaternary }}>
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
