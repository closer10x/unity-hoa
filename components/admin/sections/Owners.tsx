"use client";

import React, { useEffect, useMemo, useState } from "react";
import { emptyAddress, formatAddress, isAddressComplete } from "@/lib/admin-portal/address";
import {
  addHouseholdOwner, getOwnerEditData, listHouseholdOwners, resendWelcomeEmail,
  unlinkOwner, updateOwner, type HouseholdOwner,
} from "@/lib/admin-portal/owner-actions";
import { addHomeowner } from "@/lib/admin-portal/roster-actions";
import { transferLot, type TransferKind } from "@/lib/admin-portal/transfer-actions";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, radius } from "@/lib/admin-portal/tokens";
import type { Address, Owner } from "@/lib/admin-portal/types";
import {
  AddDrawer, AddressFields, Card, Chip, ConfirmBar, DateInput, Empty, ErrorLine,
  Field, FieldGrid, FilterBar, Input, MailingAddress, Mono, PageTitle, Primary,
  Row, RowMain, Select, Status, TextButton,
} from "../ui";

/* These match the statuses the roster actually produces — a filter naming a
   status no lot can hold would always come back empty. */
const FILTERS = ["All", "Owner on file", "No owner linked"];

/** Circular arrow — the resend mark, drawn in the same line style as the nav. */
function ResendMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ flex: "0 0 auto" }}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

export default function Owners() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [community, setCommunity] = useState("all");

  /* Arriving from a link elsewhere (e.g. a ledger entry's owner): open with
     that owner already found, then clear the request. */
  useEffect(() => {
    if (!s.focusOwnerId) return;
    const o = s.owners.find((x) => x.id === s.focusOwnerId);
    if (o) {
      setQuery(o.name !== "Unassigned lot" ? o.name : o.account);
      setFilter("All");
      setCommunity("all");
    }
    s.setFocusOwnerId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focusOwnerId]);

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [coOwner, setCoOwner] = useState("");
  const [comm, setComm] = useState(s.communities[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [addNote, setAddNote] = useState("");
  const [property, setProperty] = useState<Address>(emptyAddress());
  const [mailSame, setMailSame] = useState(true);
  const [mailing, setMailing] = useState<Address>(emptyAddress());
  const [accountNo, setAccountNo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [occupancy, setOccupancy] = useState("Owner-occupied");
  const [balance, setBalance] = useState("");
  const [flags, setFlags] = useState({ invite: true, welcome: true, autopay: false });
  const [sort, setSort] = useState("account");

  /* ----- per-row edit drawer ----- */
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLinked, setEditLinked] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurrentEmail, setEditCurrentEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [unlinkPending, setUnlinkPending] = useState(false);

  /* ----- second owners on the household, and re-sending sign-in details ----- */
  const [household, setHousehold] = useState<HouseholdOwner[]>([]);
  const [coOpen, setCoOpen] = useState(false);
  const [coName, setCoName] = useState("");
  const [coEmail, setCoEmail] = useState("");
  const [coPhone, setCoPhone] = useState("");
  const [coRelation, setCoRelation] = useState("Co-owner");
  const [coSaving, setCoSaving] = useState(false);
  const [coNote, setCoNote] = useState("");
  const [resendFor, setResendFor] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState("");

  /* ----- ownership change: sale, transfer, or first link ----- */
  const [xferOpen, setXferOpen] = useState(false);
  const [xferKind, setXferKind] = useState<TransferKind>("sale");
  const [xfer, setXfer] = useState({ name: "", email: "", phone: "" });
  const [xferDate, setXferDate] = useState("");
  const [xferFees, setXferFees] = useState<string[]>([]);
  const [xferWelcome, setXferWelcome] = useState(true);
  const [xferConfirm, setXferConfirm] = useState(false);
  const [xferSaving, setXferSaving] = useState(false);
  const [xferNote, setXferNote] = useState("");

  function resetTransfer(kind: TransferKind) {
    setXferKind(kind);
    setXfer({ name: "", email: "", phone: "" });
    setXferDate("");
    setXferFees([]);
    setXferWelcome(true);
    setXferConfirm(false);
  }

  async function runTransfer(o: Owner) {
    if (xferSaving) return;
    setXferSaving(true);
    setEditError("");
    const res = await transferLot({
      lotId: o.id,
      kind: xferKind,
      newOwner: xfer,
      feeIds: xferFees,
      sendWelcome: xferWelcome,
      closingDate: xferDate || undefined,
    });
    setXferSaving(false);
    setXferConfirm(false);
    if (!res.ok) return setEditError(res.error);
    s.setOwners((prev) => prev.map((x) => (x.id === o.id ? res.owner : x)));
    s.audit(`Owners: ${res.summary}`);
    setXferNote(res.warning ? `${res.summary}. ${res.warning}` : `${res.summary}.`);
    setXferOpen(false);
  }

  async function openEdit(o: Owner) {
    if (editId === o.id) return closeEdit();
    setEditId(o.id);
    setEditLoading(true);
    setEditError("");
    setUnlinkPending(false);
    const res = await getOwnerEditData(o.id);
    setEditLoading(false);
    if (!res.ok) return setEditError(res.error);
    setEditLinked(res.linked);
    setEditName(res.name);
    setEditEmail(res.email);
    setEditCurrentEmail(res.email);
    setEditPhone(res.phone);
    setCoOpen(false); setCoNote(""); setResendFor(null); setResendNote("");
    const members = await listHouseholdOwners(o.id);
    setHousehold(members.ok ? members.members : []);
  }

  function closeEdit() {
    setEditId(null);
    setEditError("");
    setUnlinkPending(false);
    setCoOpen(false);
    setResendFor(null);
  }

  async function saveCoOwner(o: Owner) {
    if (coSaving) return;
    setCoSaving(true);
    setEditError("");
    setCoNote("");
    const res = await addHouseholdOwner({
      lotId: o.id, name: coName, email: coEmail, phone: coPhone,
      relationship: coRelation, sendWelcome: true,
    });
    setCoSaving(false);
    if (!res.ok) return setEditError(res.error);
    setHousehold((prev) => [...prev, res.member]);
    s.audit(`Added ${res.member.name} as a second owner at ${o.address}`);
    setCoNote(res.note);
    setCoName(""); setCoEmail(""); setCoPhone("");
  }

  async function runResend(o: Owner, memberEmail?: string) {
    if (resending) return;
    setResending(true);
    setEditError("");
    setResendNote("");
    const res = await resendWelcomeEmail({ lotId: o.id, memberEmail });
    setResending(false);
    setResendFor(null);
    if (!res.ok) return setEditError(res.error);
    s.audit(`Re-sent the welcome email for ${o.address}`);
    setResendNote(res.note);
  }

  async function saveEdit(o: Owner) {
    setEditSaving(true);
    setEditError("");
    const res = await updateOwner({
      lotId: o.id,
      name: editName,
      email: editEmail,
      phone: editPhone,
      currentEmail: editCurrentEmail,
    });
    setEditSaving(false);
    if (!res.ok) return setEditError(res.error);
    s.setOwners((prev) => prev.map((x) => (x.id === o.id ? res.owner : x)));
    closeEdit();
  }

  async function confirmUnlink(o: Owner) {
    setEditSaving(true);
    setEditError("");
    const res = await unlinkOwner({ lotId: o.id });
    setEditSaving(false);
    setUnlinkPending(false);
    if (!res.ok) return setEditError(res.error);
    s.setOwners((prev) => prev.map((x) => (x.id === o.id ? res.owner : x)));
    closeEdit();
  }

  const SORTS = [
    { id: "account", label: "Lot number" },
    { id: "name", label: "Owner name" },
    { id: "address", label: "Street address" },
    { id: "status", label: "Status" },
  ];

  const filtered = useSearchFilter(
    s.owners, query, ["name", "address", "contact", "account"],
    (o) => {
      if (community !== "all" && o.scope !== community) return false;
      if (!s.scopeCommunityIds.includes(o.scope)) return false;
      if (filter === "All") return true;
      return o.status === filter;
    },
  );

  /* Lot numbers are strings, so "Lot 10" would sort before "Lot 2" with a
     plain compare. numeric collation keeps them in human order. */
  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  const visible = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        collator.compare(
          String(a[sort as keyof typeof a] ?? ""),
          String(b[sort as keyof typeof b] ?? ""),
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, sort],
  );

  async function save() {
    if (saving) return;
    if (!name.trim()) return setError("Add the name on the deed.");
    if (!comm) return setError("Pick the community this home belongs to.");
    if (!property.streetNo.trim() || !property.street.trim()) return setError("Add the street number and street name.");
    if (!property.city.trim() || !property.zip.trim()) return setError("Add the city and ZIP code.");
    if (!mailSame && !isAddressComplete(mailing)) return setError("Complete the mailing address, or mark it the same as the property.");

    setSaving(true);
    setError("");
    setAddNote("");
    const res = await addHomeowner({
      name, coOwner, community: comm,
      lotNumber: accountNo,
      streetNumber: property.streetNo,
      streetName: property.street,
      unit: property.unit,
      city: property.city,
      state: property.state,
      zip: property.zip,
      email, phone,
      sendWelcome: flags.invite,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.addOwner(res.owner);
    s.audit(`Added homeowner ${res.owner.name} \u00B7 ${res.owner.address}`);
    setAddNote(res.note);
    setQuery("");
    setName(""); setCoOwner(""); setProperty(emptyAddress()); setMailing(emptyAddress());
    setAccountNo(""); setEmail(""); setPhone(""); setMoveIn(""); setBalance("");
  }

  return (
    <>
      <PageTitle title="Owners" lede="Every homeowner of record, their balance and how to reach them." />
      <Card>
        <AddDrawer
          open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Add a homeowner" title="Add a homeowner"
          note="An email address gets the household portal access straight away, with a temporary password."
          count={`${s.owners.length} ${s.owners.length === 1 ? "home" : "homes"} · ${s.owners.filter((o) => o.flag === "current").length} with an owner`}>
          <FieldGrid>
            <Field label="Owner name"><Input value={name} onChange={setName} placeholder="Name on the deed" /></Field>
            <Field label="Co-owner"><Input value={coOwner} onChange={setCoOwner} placeholder="Optional" /></Field>
            <Field label="Community">
              <Select value={comm} onChange={setComm} options={s.communities.map((c) => ({ id: c.id, label: c.name }))} />
            </Field>
          </FieldGrid>

          <AddressFields value={property} onChange={setProperty} suggestions={s.addressBook} />

          <FieldGrid>
            <Field label="Lot number" hint="The account number on every notice — leave blank if the lot has none">
              <Input value={accountNo} onChange={setAccountNo} mono placeholder="e.g. 42" />
            </Field>
            <Field label="Email"><Input value={email} onChange={setEmail} placeholder="owner@example.com" /></Field>
            <Field label="Mobile"><Input value={phone} onChange={setPhone} placeholder="(713) 555-0100" /></Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Closing / move-in date"><Input value={moveIn} onChange={setMoveIn} placeholder="e.g. Jun 01, 2026" /></Field>
            <Field label="Occupancy">
              <Select value={occupancy} onChange={setOccupancy} options={[
                { id: "Owner-occupied", label: "Owner-occupied" },
                { id: "Leased", label: "Leased to a tenant" },
                { id: "Vacant", label: "Vacant" },
                { id: "Builder-owned", label: "Builder-owned" },
              ]} />
            </Field>
            <Field label="Opening balance"><Input value={balance} onChange={setBalance} placeholder="$0.00" /></Field>
          </FieldGrid>

          <MailingAddress
            same={mailSame} onToggle={() => setMailSame(!mailSame)}
            value={mailing} onChange={setMailing}
            propertyPreview={formatAddress(property)} />

          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>On save</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip on={flags.invite} onClick={() => setFlags({ ...flags, invite: !flags.invite })}>Send portal invite</Chip>
              <Chip on={flags.welcome} onClick={() => setFlags({ ...flags, welcome: !flags.welcome })}>Mail welcome packet</Chip>
              <Chip on={flags.autopay} onClick={() => setFlags({ ...flags, autopay: !flags.autopay })}>Offer autopay enrollment</Chip>
            </div>
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}
          {addNote ? <span style={{ fontSize: 14, color: color.accent }}>{addNote}</span> : null}
          <Primary onClick={save} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Adding\u2026" : "Add homeowner"}
          </Primary>
        </AddDrawer>

        <FilterBar
          query={query} onQuery={setQuery} placeholder="Search name, address or account no.…"
          filters={FILTERS} active={filter} onFilter={setFilter}
          sortOptions={SORTS} sort={sort} onSort={setSort}
          extra={
            <select value={community} onChange={(e) => setCommunity(e.target.value)}
              style={{ appearance: "none", font: "inherit", fontSize: 14, background: color.surfaceSunken, border: `1px solid ${color.borderInput}`, borderRadius: 999, padding: "11px 30px 11px 14px", cursor: "pointer", color: color.ink }}>
              <option value="all">Every community</option>
              {s.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          } />

        {visible.length === 0 ? <Empty>No owners match that search.</Empty> : visible.map((o) => (
          <React.Fragment key={o.id}>
            <Row>
              <RowMain label={o.name} detail={o.address} />
              <span style={{ fontSize: 14, color: color.inkTertiary }}>{o.contact}</span>
              <Mono size={15}>{o.balance}</Mono>
              <Status tone={o.flag === "delinquent" ? "critical" : o.flag === "tenant" ? "attention" : "positive"}>{o.status}</Status>
              <Mono size={12} style={{ color: color.inkQuaternary }}>#{o.account}</Mono>
              <TextButton onClick={() => openEdit(o)}>{editId === o.id ? "Close" : "Edit"}</TextButton>
            </Row>

            {editId === o.id ? (
              <div style={{ padding: `0 24px 20px`, borderBottom: `1px solid ${color.hairlineSoft}` }}>
                <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 22, display: "grid", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                      {editLinked || editLoading ? `Edit resident · ${o.account}` : `No owner linked · ${o.account}`}
                    </span>
                    <TextButton tone="muted" onClick={closeEdit}>Cancel</TextButton>
                  </div>

                  {editLoading ? (
                    <span style={{ fontSize: 14, color: color.inkTertiary }}>Loading…</span>
                  ) : !editLinked ? (
                    <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>
                      This lot has no resident linked. Use “Add a homeowner” at the
                      top of the list to link one — the address will autofill from
                      the roster.
                    </span>
                  ) : (
                    <>
                      <FieldGrid>
                        <Field label="Owner name"><Input value={editName} onChange={setEditName} placeholder="Name on the deed" /></Field>
                        <Field label="Sign-in email" hint="Changing it changes how they sign in to the portal">
                          <Input value={editEmail} onChange={setEditEmail} placeholder="owner@example.com" />
                        </Field>
                        <Field label="Mobile"><Input value={editPhone} onChange={setEditPhone} placeholder="(713) 555-0100" /></Field>
                      </FieldGrid>
                      {editError ? <ErrorLine>{editError}</ErrorLine> : null}
                      {resendNote ? (
                        <span style={{ fontSize: 14, color: color.accent }}>{resendNote}</span>
                      ) : null}
                      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        <Primary onClick={() => saveEdit(o)} style={{ justifySelf: "start" }}>
                          {editSaving ? "Saving…" : "Save changes"}
                        </Primary>
                        <TextButton onClick={() => { setResendFor("owner"); setResendNote(""); }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                            <ResendMark />
                            Resend welcome email
                          </span>
                        </TextButton>
                        {s.isAdministrator ? (
                          <TextButton tone="destructive" onClick={() => setUnlinkPending(true)}>
                            Unlink owner from this lot
                          </TextButton>
                        ) : null}
                      </div>

                      {resendFor === "owner" ? (
                        <ConfirmBar
                          text={`Are you sure you want to resend the welcome email to ${editEmail || "this owner"}? They get a brand-new temporary password, so any password they have already set will stop working.`}
                          confirmLabel="Yes, resend the email"
                          onCancel={() => setResendFor(null)}
                          onConfirm={() => runResend(o)} />
                      ) : null}

                      <div style={{ borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 16, display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>Other owners on this home</span>
                          <TextButton onClick={() => { setCoOpen(!coOpen); setCoNote(""); }}>
                            {coOpen ? "Close" : "Add another owner…"}
                          </TextButton>
                        </div>

                        {household.length === 0 ? (
                          <span style={{ fontSize: 14, color: color.inkTertiary }}>
                            No one else is on the deed for this home.
                          </span>
                        ) : household.map((m) => (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ display: "grid", gap: 2 }}>
                              <span style={{ fontSize: 15 }}>{m.name}</span>
                              <Mono size={12} style={{ color: color.inkTertiary }}>
                                {m.email} · {m.relationship}
                              </Mono>
                            </span>
                            <TextButton onClick={() => { setResendFor(m.id); setResendNote(""); }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                                <ResendMark />
                                Resend
                              </span>
                            </TextButton>
                          </div>
                        ))}

                        {household.map((m) => resendFor === m.id ? (
                          <ConfirmBar
                            key={`resend-${m.id}`}
                            text={`Are you sure you want to resend the welcome email to ${m.email}? They get a brand-new temporary password, so any password they have already set will stop working.`}
                            confirmLabel="Yes, resend the email"
                            onCancel={() => setResendFor(null)}
                            onConfirm={() => runResend(o, m.email)} />
                        ) : null)}

                        {coOpen ? (
                          <div style={{ display: "grid", gap: 12, paddingTop: 4 }}>
                            <FieldGrid>
                              <Field label="Owner name"><Input value={coName} onChange={setCoName} placeholder="Name on the deed" /></Field>
                              <Field label="Sign-in email" hint="They get their own sign-in for this home">
                                <Input value={coEmail} onChange={setCoEmail} placeholder="owner@example.com" />
                              </Field>
                              <Field label="Mobile"><Input value={coPhone} onChange={setCoPhone} placeholder="(713) 555-0100" /></Field>
                              <Field label="Relationship">
                                <Select value={coRelation} onChange={setCoRelation} options={[
                                  { id: "Co-owner", label: "Co-owner" },
                                  { id: "Spouse", label: "Spouse" },
                                  { id: "Trustee", label: "Trustee" },
                                  { id: "Family", label: "Family" },
                                ]} />
                              </Field>
                            </FieldGrid>
                            {coNote ? <span style={{ fontSize: 14, color: color.accent }}>{coNote}</span> : null}
                            <Primary onClick={() => saveCoOwner(o)} style={{ justifySelf: "start", opacity: coSaving ? 0.6 : 1 }}>
                              {coSaving ? "Adding…" : "Add owner and send the welcome email"}
                            </Primary>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                  {!editLoading && editError && !editLinked ? <ErrorLine>{editError}</ErrorLine> : null}

                  {/* ── Ownership change: sale, transfer, or first link ── */}
                  {!editLoading ? (
                    <div style={{ borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 16, display: "grid", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>Ownership change</span>
                        <TextButton onClick={() => {
                          if (xferOpen) { setXferOpen(false); return; }
                          resetTransfer(editLinked ? "sale" : "add");
                          setXferNote("");
                          setXferOpen(true);
                        }}>
                          {xferOpen ? "Close" : editLinked ? "Record a sale or transfer…" : "Link a new owner…"}
                        </TextButton>
                      </div>
                      {xferNote && !xferOpen ? (
                        <span style={{ fontSize: 14, color: color.accent }}>{xferNote}</span>
                      ) : null}
                      {xferOpen ? (
                        <>
                          {editLinked ? (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <Chip on={xferKind === "sale"} onClick={() => setXferKind("sale")}>Sold — new owner</Chip>
                              <Chip on={xferKind === "transfer"} onClick={() => setXferKind("transfer")}>Transferred — family, trust or LLC</Chip>
                            </div>
                          ) : null}
                          <FieldGrid>
                            <Field label="New owner's name"><Input value={xfer.name} onChange={(v) => setXfer({ ...xfer, name: v })} placeholder="Name on the deed" /></Field>
                            <Field label="Sign-in email"><Input value={xfer.email} onChange={(v) => setXfer({ ...xfer, email: v })} placeholder="owner@example.com" /></Field>
                            <Field label="Mobile"><Input value={xfer.phone} onChange={(v) => setXfer({ ...xfer, phone: v })} placeholder="(713) 555-0100" /></Field>
                            <Field label="Closing / effective date"><DateInput value={xferDate} onChange={setXferDate} /></Field>
                          </FieldGrid>
                          <div style={{ display: "grid", gap: 10 }}>
                            <span style={{ fontSize: 14, color: color.inkSecondary }}>
                              Fees to post to the new owner&rsquo;s ledger
                              <span style={{ color: color.inkQuaternary }}> · from Accounting → Fee schedule</span>
                            </span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {s.fees.filter((f) => f.active).map((f) => {
                                const on = xferFees.includes(f.id);
                                return (
                                  <Chip key={f.id} size="sm" on={on}
                                    onClick={() => setXferFees((prev) =>
                                      on ? prev.filter((x) => x !== f.id) : [...prev, f.id])}>
                                    {on ? `✓ ${f.name} · ${f.amount}` : `${f.name} · ${f.amount}`}
                                  </Chip>
                                );
                              })}
                              {!s.fees.some((f) => f.active) ? (
                                <span style={{ fontSize: 14, color: color.inkQuaternary }}>
                                  No fees on the schedule yet — add them in Accounting.
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <Chip on={xferWelcome} onClick={() => setXferWelcome(!xferWelcome)}>
                              Email sign-in details to the new owner
                            </Chip>
                            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                              New accounts get a temporary password; an existing account is reused as-is.
                            </span>
                          </div>
                          <Primary
                            onClick={() => {
                              if (!xfer.name.trim() || !xfer.email.trim()) return setEditError("Add the new owner's name and email.");
                              setEditError("");
                              setXferConfirm(true);
                            }}
                            style={{ justifySelf: "start", ...(xferSaving ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
                            {xferSaving ? "Recording…" : xferKind === "sale" ? "Record sale…" : xferKind === "transfer" ? "Record transfer…" : "Link owner…"}
                          </Primary>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {editId === o.id && unlinkPending ? (
              <ConfirmBar
                text={`Are you sure? Unlinking removes ${o.name}'s portal access to ${o.address}. The lot stays in the roster and their sign-in account is kept.`}
                confirmLabel="Yes, unlink them"
                onCancel={() => setUnlinkPending(false)}
                onConfirm={() => confirmUnlink(o)}
              />
            ) : null}

            {editId === o.id && xferConfirm ? (
              <ConfirmBar
                text={`Record the ${xferKind === "sale" ? "sale" : xferKind === "transfer" ? "transfer" : "new owner"} of ${o.address} to ${xfer.name.trim()}? ${editLinked ? `${o.name} loses portal access to this lot (their account is kept). ` : ""}${xferFees.length ? `${xferFees.length} fee${xferFees.length === 1 ? "" : "s"} post to the new owner's ledger. ` : "No fees will be posted. "}${xferWelcome ? "Their sign-in details are emailed to them." : "No email is sent."} Everything is stamped in the audit trail.`}
                confirmLabel={xferKind === "sale" ? "Record sale" : xferKind === "transfer" ? "Record transfer" : "Link owner"}
                onCancel={() => setXferConfirm(false)}
                onConfirm={() => runTransfer(o)}
              />
            ) : null}
          </React.Fragment>
        ))}
      </Card>
    </>
  );
}
