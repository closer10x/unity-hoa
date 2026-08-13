"use client";

import React, { useState } from "react";
import { BOOKING_STEPS } from "@/lib/admin-portal/actions";
import { createBooking, setBookingStatus } from "@/lib/admin-portal/operations-actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { BookingStatus, PendingConfirm } from "@/lib/admin-portal/types";
import { usePrimaryAction } from "../SectionHead";
import {
  ActionSelect, AddDrawer, Area, Card, Chip, ConfirmBar, DateInput, Empty,
  ErrorLine, Field, FieldGrid, FilterBar, Input, Mono, Primary, Row,
  RowMain, Select, Status,
} from "../ui";

const FILTERS = ["All", "Requested", "Approved", "Completed", "Deposit unpaid"];
/* Placeholder inventory — awaiting the association's real amenity list. */
const AMENITIES = ["Great Hall", "Pool cabana 1", "Pool cabana 2", "Clubhouse Annex", "Tennis court"];
const EVENTS = ["Private party", "Birthday", "Wedding or reception", "Memorial", "Community meeting", "Committee meeting", "Other"];

export default function Bookings() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [flowError, setFlowError] = useState("");

  const [open, setOpen] = useState(false);
  /* The header's primary button opens this screen's add-form. */
  usePrimaryAction(() => setOpen(true));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resident, setResident] = useState("");
  const [amenity, setAmenity] = useState(AMENITIES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState(EVENTS[0]);
  const [setup, setSetup] = useState("");
  const [deposit, setDeposit] = useState("Deposit unpaid");
  const [notes, setNotes] = useState("");
  const [flags, setFlags] = useState({ alcohol: false, insurance: false, vendors: false, afterHours: false });

  const visible = useSearchFilter(
    s.bookings, query, ["amenity", "detail", "status", "deposit"],
    (b) => filter === "All" ? true : filter === "Deposit unpaid" ? /unpaid/i.test(b.deposit) : b.status === filter,
  );

  async function save() {
    if (!resident.trim()) return setError("Who is it for?");
    if (!date.trim() || !time.trim()) return setError("Add a date and a time.");
    if (flags.alcohol && !flags.insurance)
      return setError("Alcohol events need a certificate of insurance — mark it or drop the alcohol flag.");
    setSaving(true);
    const res = await createBooking({
      amenity, residentName: resident, phone, date, time,
      guestCount: guests, eventType, setupNotes: setup, officeNotes: notes,
      depositStatus: deposit, alcohol: flags.alcohol, insuranceOnFile: flags.insurance,
      outsideVendors: flags.vendors, afterHours: flags.afterHours,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setBookings((prev) => [res.booking, ...prev]);
    setOpen(false); setError(""); setResident(""); setDate(""); setTime(""); setGuests(""); setPhone(""); setSetup(""); setNotes("");
    setFlags({ alcohol: false, insurance: false, vendors: false, afterHours: false });
  }

  return (
    <>
      <Card>
        <AddDrawer
          open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Book for a resident" title="Book for a resident">
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary }}>
            Use this when someone calls or walks in. The reservation shows up in their portal with the deposit status.
          </p>
          <FieldGrid>
            <Field label="Resident"><Input value={resident} onChange={setResident} placeholder="Name or lot number" /></Field>
            <Field label="Amenity"><Select value={amenity} onChange={setAmenity} options={AMENITIES.map((a) => ({ id: a, label: a }))} /></Field>
            <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Time"><Input value={time} onChange={setTime} placeholder="e.g. 4–9PM" /></Field>
            <Field label="Guests"><Input value={guests} onChange={setGuests} placeholder="Approx. count" /></Field>
            <Field label="Phone"><Input value={phone} onChange={setPhone} placeholder="(713) 555-0100" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Event type"><Select value={eventType} onChange={setEventType} options={EVENTS.map((e) => ({ id: e, label: e }))} /></Field>
            <Field label="Setup & teardown"><Input value={setup} onChange={setSetup} placeholder="e.g. 1 hr before, 1 hr after" /></Field>
            <Field label="Deposit">
              <Select value={deposit} onChange={setDeposit} options={[
                { id: "Deposit unpaid", label: "Deposit unpaid — invoice them" },
                { id: "$200 held", label: "Deposit paid — $200 held" },
                { id: "$40 paid", label: "Fee paid — $40" },
                { id: "No fee", label: "No fee for this space" },
              ]} />
            </Field>
          </FieldGrid>
          <Field label="Notes for the office">
            <Area value={notes} onChange={setNotes} rows={2} placeholder="Vendors coming in, tables and chairs needed, gate access, anything staff should know." />
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
          <Primary onClick={save} style={{ justifySelf: "start" }}>{saving ? "Saving…" : "Create booking"}</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search resident or amenity…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {visible.length === 0 ? <Empty>No bookings match that.</Empty> : visible.map((b) => {
          const menu = buildActionMenu(BOOKING_STEPS, b.status, b.id, `${b.amenity} · ${b.date}`, pending, setPending);
          return (
            <React.Fragment key={b.id}>
              <Row>
                <Mono size={13} style={{ color: color.neutral }}>{b.date}</Mono>
                <RowMain label={b.amenity} detail={b.detail} />
                <Mono size={13} style={{ color: /unpaid/i.test(b.deposit) ? color.attention : color.inkTertiary }}>{b.deposit}</Mono>
                <Status tone={b.status === "Requested" ? "attention" : b.status === "Cancelled" ? "critical" : "positive"}>{b.status}</Status>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={async () => {
                    const next = menu.nextValue! as BookingStatus;
                    setPending(null);
                    setFlowError("");
                    const res = await setBookingStatus({ id: b.id, status: next });
                    if (!res.ok) return setFlowError(res.error);
                    s.setBookings((prev) => prev.map((x) => (x.id === b.id ? res.booking : x)));
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
}
