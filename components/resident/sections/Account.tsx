"use client";

import React, { useEffect, useState } from "react";

import { requestResidentPasswordReset } from "@/app/portal/login/actions";
import {
  addHouseholdMember, getHousehold, removeHouseholdMember,
} from "@/lib/resident-portal/household-actions";
import { useResident } from "@/lib/resident-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { Address } from "@/lib/admin-portal/types";
import type { HouseholdMember, Lease, Pet } from "@/lib/resident-portal/types";
import { NOTIFY_TYPES } from "@/lib/resident-portal/types";
import {
  AddDrawer, Card, CardHead, Chip, Empty, ErrorLine, Field, FieldGrid, Input,
  MailingAddress, Mono, PageTitle, PhotoSlot, Primary, Row, RowMain, Select,
  Status, TextButton,
} from "@/components/admin/ui";

const EMPTY_ADDRESS: Address = { streetNo: "", street: "", unit: "", city: "", state: "Texas", zip: "" };

const RELATIONSHIPS = ["Spouse", "Adult child", "Household member", "Caretaker", "Property manager"];
const ACCESS_LEVELS = [
  { id: "full", label: "Full access — can pay and file requests" },
  { id: "view", label: "View only — can see, not act" },
  { id: "none", label: "No portal access" },
];
const PET_TYPES = ["Dog", "Cat", "Bird", "Other"];

export default function Account() {
  const s = useResident();

  // Contact information
  const [email, setEmail] = useState(s.residentEmail);
  const [phone, setPhone] = useState(s.residentPhone);
  const [mailingSame, setMailingSame] = useState(true);
  const [mailing, setMailing] = useState<Address>(EMPTY_ADDRESS);
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState("");

  // Household
  const [personOpen, setPersonOpen] = useState(false);
  const [personError, setPersonError] = useState("");
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState(RELATIONSHIPS[0]);
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [personAccess, setPersonAccess] = useState("view");
  /* Per-member invite state, keyed by member id. Household lives in client
     state (no persistence layer yet), so this rides alongside it. */
  type Invite = { email: string; access: string; status: "sending" | "sent" | "failed"; error?: string };
  const [invites, setInvites] = useState<Record<string, Invite>>({});

  async function sendInvite(memberId: string, name: string, email: string, access: string) {
    setInvites((prev) => ({ ...prev, [memberId]: { email, access, status: "sending" } }));
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          access,
          property: s.property.mailingAddress || s.property.address,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setInvites((prev) => ({
        ...prev,
        [memberId]: res.ok && data.ok
          ? { email, access, status: "sent" }
          : { email, access, status: "failed", error: data.error ?? "Send failed" },
      }));
    } catch {
      setInvites((prev) => ({ ...prev, [memberId]: { email, access, status: "failed", error: "Network error" } }));
    }
  }

  // Pets
  const [petOpen, setPetOpen] = useState(false);
  const [petError, setPetError] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState(PET_TYPES[0]);
  const [petBreed, setPetBreed] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petColor, setPetColor] = useState("");
  const [petTag, setPetTag] = useState("");
  const [petVet, setPetVet] = useState("");

  // Leases
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [leaseError, setLeaseError] = useState("");
  const [leaseTenant, setLeaseTenant] = useState("");
  const [leaseContact, setLeaseContact] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("");
  const [leaseOccupants, setLeaseOccupants] = useState("");

  function saveContact() {
    if (!email.trim() && !phone.trim())
      return setContactError("Keep at least an email or a mobile on file — notices need somewhere to go.");
    if (!mailingSame && (!mailing.streetNo.trim() || !mailing.street.trim() || !mailing.city.trim() || !mailing.zip.trim()))
      return setContactError("Finish the mailing address — street, city and ZIP.");
    setContactError("");
    setContactSaved(true);
  }

  // Load the persisted household on mount, keeping the locked owner-of-record
  // row the store seeds. Members survive a refresh now — they live in the
  // household_members table, not just this session.
  useEffect(() => {
    let live = true;
    getHousehold().then((rows) => {
      if (!live || rows.length === 0) return;
      s.setHousehold((prev) => [...prev.filter((m) => m.locked), ...rows]);
    });
    return () => { live = false; };
    // Once on mount; the store setter is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePerson() {
    if (!personName.trim()) return setPersonError("Add a name.");
    if (!personEmail.trim() && !personPhone.trim())
      return setPersonError("Add an email or a mobile — the portal invite needs one.");
    const accessLabel = ACCESS_LEVELS.find((a) => a.id === personAccess)?.label ?? "";
    const accessShort = accessLabel.split(" — ")[0];
    setPersonError("");
    // Persist first so the member survives a refresh; the DB id is what the
    // row and any invite are keyed on.
    const res = await addHouseholdMember({
      name: personName.trim(),
      relationship: personRole,
      accessLevel: personAccess,
      email: personEmail.trim(),
      phone: personPhone.trim(),
    });
    if ("error" in res) return setPersonError(res.error);
    const person = res.member;
    s.setHousehold((prev) => [...prev, person]);
    // Email the new member their access instructions, when we have an address.
    const inviteEmail = personEmail.trim();
    if (inviteEmail && personAccess !== "none") {
      void sendInvite(person.id, person.name, inviteEmail, accessShort);
    }
    setPersonOpen(false);
    setPersonError(""); setPersonName(""); setPersonEmail(""); setPersonPhone("");
    setPersonAccess("view"); setPersonRole(RELATIONSHIPS[0]);
  }

  async function removePerson(id: string) {
    // Optimistic remove; restore the row if the server rejects it.
    const snapshot = s.household;
    s.setHousehold((prev) => prev.filter((x) => x.id !== id));
    const res = await removeHouseholdMember(id);
    if ("error" in res) s.setHousehold(snapshot);
  }

  function savePet() {
    if (!petName.trim()) return setPetError("Add the pet's name.");
    if (!petTag.trim()) return setPetError("A current rabies tag number is required.");
    const detail = [
      petType,
      petBreed.trim(),
      petWeight.trim() ? `${petWeight.trim()} lb` : "",
      petColor.trim(),
      `rabies tag ${petTag.trim()}`,
      petVet.trim() ? `vet: ${petVet.trim()}` : "",
    ].filter(Boolean).join(" · ");
    const pet: Pet = { id: s.uid("pt"), name: petName.trim(), detail, status: "Registered", ok: true };
    s.setPets((prev) => [...prev, pet]);
    setPetOpen(false);
    setPetError(""); setPetName(""); setPetBreed(""); setPetWeight(""); setPetColor(""); setPetTag(""); setPetVet("");
  }

  function saveLease() {
    if (!leaseTenant.trim() || !leaseContact.trim())
      return setLeaseError("Add the tenant's name and a way to reach them.");
    if (!leaseTerm.trim()) return setLeaseError("Add the lease term.");
    const detail = [
      leaseTerm.trim(),
      leaseContact.trim(),
      leaseOccupants.trim() ? `${leaseOccupants.trim()} occupants` : "",
    ].filter(Boolean).join(" · ");
    const lease: Lease = { id: s.uid("ls"), tenant: leaseTenant.trim(), detail, status: "Active", ok: true };
    s.setLeases((prev) => [...prev.filter((l) => !l.locked), lease]);
    setLeaseOpen(false);
    setLeaseError(""); setLeaseTenant(""); setLeaseContact(""); setLeaseTerm(""); setLeaseOccupants("");
  }

  return (
    <>
      <PageTitle title="Account" lede="Contact details, notifications, your household, pets and leases." />

      {/* ─── Contact information ─────────────────────────────────────── */}
      <Card>
        <CardHead title="Contact information" />
        <div style={{ padding: pad.card, display: "grid", gap: 18 }}>
          <FieldGrid>
            <Field label="Email"><Input value={email} onChange={setEmail} placeholder="you@example.com" /></Field>
            <Field label="Mobile"><Input value={phone} onChange={setPhone} placeholder="(713) 555-0100" /></Field>
            <Field
              label="Text messages"
              hint={s.smsOptIn
                ? "Carrier message and data rates may apply. Reply STOP any time."
                : "Without permission we only email you. Emergency notices still go by email."}
            >
              <Chip on={s.smsOptIn} onClick={() => s.setSmsOptIn(!s.smsOptIn)}>
                {s.smsOptIn ? "Permission granted" : "Permit text messages"}
              </Chip>
            </Field>
          </FieldGrid>
          <MailingAddress
            same={mailingSame}
            onToggle={() => setMailingSame(!mailingSame)}
            value={mailing}
            onChange={setMailing}
            propertyPreview={s.property.mailingAddress || s.property.address}
          />
          {contactError ? <ErrorLine>{contactError}</ErrorLine> : null}
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Primary onClick={saveContact}>Save contact details</Primary>
            {contactSaved ? <Mono size={13} style={{ color: color.positive }}>Saved</Mono> : null}
          </div>
        </div>
      </Card>

      {/* ─── Notifications ───────────────────────────────────────────── */}
      <Card>
        <CardHead title="Notifications" meta="Choose how each kind of notice reaches you" />
        <div style={{ padding: pad.card, display: "grid", gap: 12 }}>
          {NOTIFY_TYPES.map((n) => {
            const pref = s.notify[n.id] ?? { email: false, text: false };
            return (
              <div key={n.id} style={{ display: "flex", gap: "8px 16px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, flex: "1 1 220px", minWidth: 0 }}>{n.label}</span>
                <span style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                  <Chip size="sm" on={pref.email}
                    onClick={() => s.setNotify((prev) => ({ ...prev, [n.id]: { ...pref, email: !pref.email } }))}>
                    Email {pref.email ? "on" : "off"}
                  </Chip>
                  <Chip size="sm" on={pref.text && s.smsOptIn}
                    onClick={() => {
                      if (!s.smsOptIn) return;
                      s.setNotify((prev) => ({ ...prev, [n.id]: { ...pref, text: !pref.text } }));
                    }}>
                    Text {pref.text && s.smsOptIn ? "on" : "off"}
                  </Chip>
                </span>
              </div>
            );
          })}
          {!s.smsOptIn ? (
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Text toggles unlock once you permit text messages next to your
              mobile number, under Contact information.
            </span>
          ) : null}
        </div>
      </Card>

      {/* ─── Household ───────────────────────────────────────────────── */}
      <Card>
        <AddDrawer
          open={personOpen}
          onOpen={() => { setPersonOpen(true); setPersonError(""); }}
          onCancel={() => { setPersonOpen(false); setPersonError(""); }}
          openLabel="Add a household member"
          title="Add a household member"
          count={`${s.household.length} ${s.household.length === 1 ? "person" : "people"}`}
        >
          <FieldGrid>
            <Field label="Name"><Input value={personName} onChange={setPersonName} placeholder="Full name" /></Field>
            <Field label="Relationship">
              <Select value={personRole} onChange={setPersonRole} options={RELATIONSHIPS.map((r) => ({ id: r, label: r }))} />
            </Field>
            <Field label="Portal access">
              <Select value={personAccess} onChange={setPersonAccess} options={ACCESS_LEVELS} />
            </Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Email"><Input value={personEmail} onChange={setPersonEmail} placeholder="them@example.com" /></Field>
            <Field label="Mobile"><Input value={personPhone} onChange={setPersonPhone} placeholder="(713) 555-0100" /></Field>
          </FieldGrid>
          {personError ? <ErrorLine>{personError}</ErrorLine> : null}
          <Primary onClick={savePerson} style={{ justifySelf: "start" }}>Add person</Primary>
        </AddDrawer>

        <CardHead title="Household members" />
        {s.household.map((h) => {
          const inv = invites[h.id];
          const emailFromContact = h.contact.split("·")[0].trim();
          const canInvite = !h.locked && /@/.test(emailFromContact);
          return (
            <Row key={h.id}>
              <RowMain label={h.name} detail={h.role} />
              <Mono size={13} style={{ color: color.neutral }}>{h.contact || "No contact details on file"}</Mono>
              {inv ? (
                <Status tone={inv.status === "sent" ? "positive" : inv.status === "failed" ? "critical" : "neutral"}>
                  {inv.status === "sending" ? "Sending invite…" : inv.status === "sent" ? "Invite sent" : "Invite failed"}
                </Status>
              ) : h.locked ? (
                <Mono size={12} style={{ color: color.inkQuaternary }}>Owner of record</Mono>
              ) : (
                <span />
              )}
              {h.locked ? (
                <span />
              ) : (
                <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {canInvite && inv?.status !== "sending" ? (
                    <TextButton
                      onClick={() => sendInvite(h.id, h.name, emailFromContact, (inv?.access ?? h.role.split("·")[1]?.trim() ?? "Portal access"))}>
                      {inv ? "Resend invite" : "Send invite"}
                    </TextButton>
                  ) : null}
                  <TextButton tone="destructive"
                    onClick={() => removePerson(h.id)}>
                    Remove
                  </TextButton>
                </span>
              )}
            </Row>
          );
        })}
        {Object.values(invites).some((i) => i.status === "failed") ? (
          <div style={{ padding: `10px ${pad.card}` }}>
            <ErrorLine>
              An invite couldn&apos;t be emailed. Check the address and use Resend,
              or ask the office to add them.
            </ErrorLine>
          </div>
        ) : null}
      </Card>

      {/* ─── Pets ────────────────────────────────────────────────────── */}
      <Card>
        <AddDrawer
          open={petOpen}
          onOpen={() => { setPetOpen(true); setPetError(""); }}
          onCancel={() => { setPetOpen(false); setPetError(""); }}
          openLabel="Register a pet"
          title="Register a pet"
          count={s.pets.length ? `${s.pets.length} registered` : undefined}
        >
          <FieldGrid>
            <Field label="Name"><Input value={petName} onChange={setPetName} placeholder="e.g. Juniper" /></Field>
            <Field label="Type">
              <Select value={petType} onChange={setPetType} options={PET_TYPES.map((t) => ({ id: t, label: t }))} />
            </Field>
            <Field label="Breed"><Input value={petBreed} onChange={setPetBreed} placeholder="e.g. Beagle mix" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Weight (lb)"><Input value={petWeight} onChange={setPetWeight} placeholder="e.g. 24" mono /></Field>
            <Field label="Color"><Input value={petColor} onChange={setPetColor} placeholder="e.g. Tricolor" /></Field>
            <Field label="Rabies tag no."><Input value={petTag} onChange={setPetTag} placeholder="e.g. TX-88142" mono /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Veterinarian" hint="Optional"><Input value={petVet} onChange={setPetVet} placeholder="Clinic or vet name" /></Field>
          </FieldGrid>
          <div style={{ maxWidth: 112 }}>
            <PhotoSlot label="Pet photo" size={112} />
          </div>
          {petError ? <ErrorLine>{petError}</ErrorLine> : null}
          <Primary onClick={savePet} style={{ justifySelf: "start" }}>Register pet</Primary>
        </AddDrawer>

        <CardHead title="Pets" />
        {s.pets.length === 0 ? (
          <Empty>No pets registered. The association asks that dogs and cats carry a current rabies tag.</Empty>
        ) : (
          s.pets.map((p) => (
            <Row key={p.id}>
              <RowMain label={p.name} detail={p.detail} />
              <Status tone={p.ok ? "positive" : "attention"}>{p.status}</Status>
              <TextButton tone="destructive" onClick={() => s.setPets((prev) => prev.filter((x) => x.id !== p.id))}>
                Remove
              </TextButton>
            </Row>
          ))
        )}
      </Card>

      {/* ─── Tenants & leases ────────────────────────────────────────── */}
      {!s.leasesAllowed ? (
        <Card>
          <CardHead title="Tenants & leases" />
          <Empty>
            {s.property.name} doesn&rsquo;t permit leasing — homes are
            owner-occupied under the governing documents. Questions? Message
            the office.
          </Empty>
        </Card>
      ) : (
      <Card>
        <AddDrawer
          open={leaseOpen}
          onOpen={() => { setLeaseOpen(true); setLeaseError(""); }}
          onCancel={() => { setLeaseOpen(false); setLeaseError(""); }}
          openLabel="Register a lease"
          title="Register a lease"
          note="Registering a lease sets the property's occupancy to Leased."
        >
          <FieldGrid>
            <Field label="Tenant name(s)"><Input value={leaseTenant} onChange={setLeaseTenant} placeholder="Everyone on the lease" /></Field>
            <Field label="Tenant contact"><Input value={leaseContact} onChange={setLeaseContact} placeholder="Email or mobile" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Lease term"><Input value={leaseTerm} onChange={setLeaseTerm} placeholder="e.g. Jun 2026 – May 2027" /></Field>
            <Field label="Occupants"><Input value={leaseOccupants} onChange={setLeaseOccupants} placeholder="How many people" mono /></Field>
          </FieldGrid>
          {leaseError ? <ErrorLine>{leaseError}</ErrorLine> : null}
          <Primary onClick={saveLease} style={{ justifySelf: "start" }}>Register lease</Primary>
        </AddDrawer>

        <CardHead title="Tenants & leases" />
        {s.leases.length === 0 ? (
          <Empty>No active lease on file — the property is recorded as owner-occupied.</Empty>
        ) : (
          s.leases.map((l) => (
            <Row key={l.id}>
              <RowMain label={l.tenant} detail={l.detail} />
              <Status tone={l.ok ? "positive" : "attention"}>{l.status}</Status>
              <TextButton tone="destructive" onClick={() => s.setLeases((prev) => prev.filter((x) => x.id !== l.id))}>
                End lease
              </TextButton>
            </Row>
          ))
        )}
      </Card>
      )}

      {/* ─── Security ────────────────────────────────────────────────── */}
      <Card>
        <CardHead title="Security" />
        <form
          action={requestResidentPasswordReset}
          style={{ padding: pad.card, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}
        >
          <input type="hidden" name="email" value={s.residentEmail} />
          <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary, flex: "1 1 320px" }}>
            Change your password by email link — we never ask for your current
            one here. The link goes to {s.residentEmail || "your email on file"}.
          </span>
          <button
            type="submit"
            style={{
              background: "none", border: "none", padding: "10px 2px", font: "inherit",
              minHeight: 44, display: "inline-flex", alignItems: "center",
              fontSize: 14, color: "oklch(0.44 0.045 155)", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Send password reset link
          </button>
        </form>
      </Card>
    </>
  );
}
