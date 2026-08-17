"use client";

import React, { useState } from "react";

import { createBooking } from "@/lib/resident-portal/request-actions";
import { useResident } from "@/lib/resident-portal/store";
import {
  AddDrawer, Area, Card, CardHeadMeta as CardHead, Chip, DateInput, Empty, ErrorLine, Field,
  FieldGrid, Mono, Primary, Row, RowMain, Select, Status,
} from "../ui";
import { color, pad } from "../ui";

/** The community's reservable spaces — the same catalogue the office books from. */
const AMENITIES = ["Great Hall", "Pool cabana 1", "Pool cabana 2", "Clubhouse Annex", "Tennis court"];

const EVENTS = [
  "Private party", "Birthday", "Wedding or reception", "Memorial",
  "Community meeting", "Committee meeting", "Other",
];

/** Half-hour steps across amenity hours, 6:00 AM – 11:00 PM. */
const TIMES: string[] = Array.from({ length: (23 - 6) * 2 + 1 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
});

export default function Amenities() {
  const s = useResident();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [amenity, setAmenity] = useState(AMENITIES[0]);
  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [guests, setGuests] = useState("");
  const [eventType, setEventType] = useState(EVENTS[0]);
  const [note, setNote] = useState("");
  const [flags, setFlags] = useState({ alcohol: false, insurance: false, vendors: false, afterHours: false });
  const [sending, setSending] = useState(false);

  /* Was a Reservation built here and pushed into React state: the office had
     no idea the clubhouse was spoken for, and a reload lost the booking. It
     now writes the bookings row the office reads. */
  async function submit() {
    if (sending) return;
    if (!date.trim()) return setError("Pick a date.");
    if (!timeFrom || !timeTo) return setError("Pick the start and end times.");
    if (TIMES.indexOf(timeTo) <= TIMES.indexOf(timeFrom))
      return setError("The end time needs to be after the start.");
    const time = `${timeFrom}–${timeTo}`;
    if (flags.alcohol && !flags.insurance)
      return setError("Serving alcohol requires a certificate of insurance naming the association — mark it once you have one, or drop the alcohol flag.");

    setSending(true);
    setError("");
    const res = await createBooking({
      amenity, date, timeFrom, timeTo, guests, eventType, note,
      alcohol: flags.alcohol, insurance: flags.insurance,
    });
    setSending(false);
    if (!res.ok) return setError(res.error);

    s.setReservations((prev) => [res.reservation, ...prev]);
    setConfirmed(`${amenity} is requested for ${date}, ${time}. The office confirms bookings and sends any deposit instructions.`);
    setOpen(false);
    setDate(""); setTimeFrom(""); setTimeTo(""); setGuests(""); setNote("");
    setFlags({ alcohol: false, insurance: false, vendors: false, afterHours: false });
  }

  return (
    <>

      {confirmed ? (
        <Card>
          <div style={{ padding: 24, display: "grid", gap: 8 }}>
            <Mono size={13} style={{ color: color.positive }}>Reservation requested</Mono>
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>{confirmed}</span>
          </div>
        </Card>
      ) : null}

      <Card>
        <AddDrawer
          open={open}
          onOpen={() => { setOpen(true); setError(""); setConfirmed(""); }}
          onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Reserve a space"
          title="Reserve a space"
          count={s.reservations.length ? `${s.reservations.length} reservation${s.reservations.length === 1 ? "" : "s"}` : undefined}
        >
          <FieldGrid>
            <Field label="Amenity">
              <Select value={amenity} onChange={setAmenity}
                options={AMENITIES.map((a) => ({ id: a, label: a }))} />
            </Field>
            <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
            <Field label="From">
              <Select value={timeFrom} onChange={(v) => {
                setTimeFrom(v);
                // Keep the end after the start as the start moves.
                if (timeTo && TIMES.indexOf(timeTo) <= TIMES.indexOf(v)) setTimeTo("");
              }} placeholder="Start time…"
                options={TIMES.slice(0, -1).map((t) => ({ id: t, label: t }))} />
            </Field>
            <Field label="To">
              <Select value={timeTo} onChange={setTimeTo} placeholder="End time…"
                options={TIMES.filter((t) => !timeFrom || TIMES.indexOf(t) > TIMES.indexOf(timeFrom))
                  .map((t) => ({ id: t, label: t }))} />
            </Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Guests">
              <Select value={guests} onChange={setGuests} placeholder="How many people?"
                options={Array.from({ length: 10 }, (_, i) => ({
                  id: String(i + 1),
                  label: `${i + 1} ${i === 0 ? "person" : "people"}`,
                }))} />
            </Field>
            <Field label="Event type">
              <Select value={eventType} onChange={setEventType}
                options={EVENTS.map((e) => ({ id: e, label: e }))} />
            </Field>
          </FieldGrid>
          <Field label="Anything the office should know?">
            <Area value={note} onChange={setNote} rows={2}
              placeholder="Vendors coming in, setup help, gate access for guests." />
          </Field>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Requirements</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip on={flags.alcohol} onClick={() => setFlags({ ...flags, alcohol: !flags.alcohol })}>Alcohol served</Chip>
              <Chip on={flags.insurance} onClick={() => setFlags({ ...flags, insurance: !flags.insurance })}>Certificate of insurance</Chip>
              <Chip on={flags.vendors} onClick={() => setFlags({ ...flags, vendors: !flags.vendors })}>Outside vendors</Chip>
              <Chip on={flags.afterHours} onClick={() => setFlags({ ...flags, afterHours: !flags.afterHours })}>After-hours access</Chip>
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.55, color: color.inkQuaternary }}>
              {flags.alcohol
                ? "Alcohol requires a signed waiver and a certificate of insurance naming the association."
                : "Deposits are released within 5 business days of a clean walk-through."}
            </span>
          </div>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={submit} style={{ justifySelf: "start" }}>Request reservation</Primary>
        </AddDrawer>

        <CardHead title="Your reservations" />
        {s.reservations.length === 0 ? (
          <Empty>No reservations yet. Pick a space above when you’re planning something.</Empty>
        ) : (
          s.reservations.map((r) => (
            <Row key={r.id}>
              <Mono size={13} style={{ color: color.neutral }}>{r.date}</Mono>
              <RowMain label={r.label} detail={r.deposit} />
              <Status tone={r.status === "Approved" ? "positive" : r.status === "Cancelled" ? "critical" : "attention"}>
                {r.status}
              </Status>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <CardHead title="House rules" />
        <div style={{ padding: pad.card, display: "grid", gap: 10, fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>
          <span>Reservations hold the space; they’re confirmed once any fee and deposit are received.</span>
          <span>Alcohol requires a certificate of insurance naming the association, and a signed waiver.</span>
          <span>Music ends at 10PM Sunday–Thursday and 11PM Friday–Saturday.</span>
          <span>The reserving owner is responsible for guests, setup and a clean walk-through.</span>
        </div>
      </Card>
    </>
  );
}
