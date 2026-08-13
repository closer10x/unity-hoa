"use client";

import React, { useState } from "react";
import { emptyAddress } from "@/lib/admin-portal/address";
import { createVendor, setVendorActive } from "@/lib/admin-portal/operations-actions";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { Address } from "@/lib/admin-portal/types";
import { usePrimaryAction } from "../SectionHead";
import {
  ActionSelect, AddDrawer, AddressFields, Card, ConfirmBar, DateInput, DropZone,
  Empty, ErrorLine, Field, FieldGrid, FilterBar, Input, Mono, Primary,
  Row, RowMain, Select, Status,
} from "../ui";

const FILTERS = ["All", "Insurance current", "Insurance expired"];
const TRADES = [
  "Landscaping & irrigation", "Pool & spa", "Gates & entry", "Lighting & electrical",
  "Plumbing", "Tree work", "Janitorial", "Roofing & structures",
  "Legal counsel", "Accounting & audit", "Insurance", "Other",
];

const DEACTIVATE = [{ id: "deactivate", label: "Deactivate vendor" }];

export default function Vendors() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [open, setOpen] = useState(false);
  /* The header's primary button opens this screen's add-form. */
  usePrimaryAction(() => setOpen(true));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [insurance, setInsurance] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress());

  const [pending, setPending] = useState("");
  const [flowError, setFlowError] = useState("");
  /* Deactivation is recorded on the vendor row; the loader doesn't read the
     flag back yet, so the marker is session-local until it does. */
  const [deactivated, setDeactivated] = useState<string[]>([]);

  const visible = useSearchFilter(
    s.vendors, query, ["name", "trade", "contract", "insurance"],
    (v) => filter === "All" ? true : filter === "Insurance current" ? v.ok : !v.ok,
  );

  async function save() {
    if (!name.trim()) return setError("Add the company name.");
    if (!contactName.trim() && !contactPhone.trim() && !contactEmail.trim())
      return setError("Add a contact — a name, phone or email.");
    setSaving(true);
    const res = await createVendor({
      name, trade, contactName, contactPhone, contactEmail, address,
      contractStart, contractEnd, insuranceExpiresOn: insurance,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setVendors((prev) => [...prev, res.vendor]);
    setOpen(false); setError(""); setName(""); setContactName(""); setContactPhone("");
    setContactEmail(""); setContractStart(""); setContractEnd(""); setInsurance("");
    setAddress(emptyAddress());
  }

  return (
    <>
      <Card>
        <AddDrawer open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Add a vendor" title="Add a vendor">
          <FieldGrid>
            <Field label="Company"><Input value={name} onChange={setName} placeholder="Legal business name" /></Field>
            <Field label="Trade"><Select value={trade} onChange={setTrade} options={TRADES.map((t) => ({ id: t, label: t }))} /></Field>
            <Field label="Contact name"><Input value={contactName} onChange={setContactName} placeholder="Who to ask for" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Contact phone"><Input value={contactPhone} onChange={setContactPhone} placeholder="(713) 555-0100" /></Field>
            <Field label="Contact email"><Input value={contactEmail} onChange={setContactEmail} placeholder="office@company.com" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Contract start"><DateInput value={contractStart} onChange={setContractStart} /></Field>
            <Field label="Contract end"><DateInput value={contractEnd} onChange={setContractEnd} /></Field>
            <Field label="Insurance expires" hint="The certificate's expiry date — what decides whether coverage reads current.">
              <DateInput value={insurance} onChange={setInsurance} />
            </Field>
          </FieldGrid>
          <AddressFields value={address} onChange={setAddress} stateLocked={false} unitLabel="Suite or unit" />
          <DropZone>W-9, certificate of insurance and signed contract — drag files here</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start" }}>{saving ? "Saving…" : "Add vendor"}</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search vendor or trade…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {visible.length === 0 ? <Empty>No vendors match that.</Empty> : visible.map((v) => {
          const off = deactivated.includes(v.id);
          return (
            <React.Fragment key={v.id}>
              <Row>
                <RowMain label={v.name} detail={v.trade} />
                <span style={{ fontSize: 14, color: color.inkTertiary }}>{v.contract}</span>
                <Mono size={14}>{v.spend}</Mono>
                <Status tone={v.ok ? "positive" : "critical"}>{v.insurance}</Status>
                {off
                  ? <Status tone="critical">Deactivated</Status>
                  : <ActionSelect options={DEACTIVATE} onChoose={(id) => { if (id) setPending(v.id); }} />}
              </Row>
              {pending === v.id ? (
                <ConfirmBar
                  text={`Deactivate ${v.name}? They stop counting as an approved vendor and can't be given new work. The record, its contract dates and its spend history all stay.`}
                  confirmLabel="Deactivate vendor"
                  onCancel={() => setPending("")}
                  onConfirm={async () => {
                    setPending("");
                    setFlowError("");
                    const res = await setVendorActive({ id: v.id, active: false });
                    if (!res.ok) return setFlowError(res.error);
                    setDeactivated((prev) => [...prev, v.id]);
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
}
