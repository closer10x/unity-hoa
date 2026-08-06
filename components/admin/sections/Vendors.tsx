"use client";

import React, { useState } from "react";
import { emptyAddress, formatAddress } from "@/lib/admin-portal/address";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { Address, Vendor } from "@/lib/admin-portal/types";
import {
  AddDrawer, AddressFields, Card, CardHead, DropZone, Empty, ErrorLine, Field,
  FieldGrid, FilterBar, Input, Mono, PageTitle, Primary, Row, RowMain, Select, Status,
} from "../ui";

const FILTERS = ["All", "Insurance current", "Insurance expired"];
const TRADES = [
  "Landscaping & irrigation", "Pool & spa", "Gates & entry", "Lighting & electrical",
  "Plumbing", "Tree work", "Janitorial", "Roofing & structures",
  "Legal counsel", "Accounting & audit", "Insurance", "Other",
];

export default function Vendors() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]);
  const [contact, setContact] = useState("");
  const [contract, setContract] = useState("");
  const [insurance, setInsurance] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress());

  const visible = useSearchFilter(
    s.vendors, query, ["name", "trade", "contract", "insurance"],
    (v) => filter === "All" ? true : filter === "Insurance current" ? v.ok : !v.ok,
  );

  function save() {
    if (!name.trim()) return setError("Add the company name.");
    if (!contact.trim()) return setError("Add a contact — a name, phone or email.");
    const line = formatAddress(address);
    const v: Vendor = {
      id: s.uid("vn"), name: name.trim(),
      trade: `${trade} · ${contact.trim()}${line ? ` · ${line}` : ""}`,
      contract: contract.trim() || "Per job",
      spend: "$0 YTD",
      insurance: insurance.trim() || "Not on file",
      ok: Boolean(insurance.trim()),
    };
    s.setVendors((prev) => [...prev, v]);
    s.audit(`Added vendor ${v.name}`);
    setOpen(false); setError(""); setName(""); setContact(""); setContract(""); setInsurance(""); setAddress(emptyAddress());
  }

  return (
    <>
      <PageTitle title="Vendors" lede="Approved vendors, contract terms and insurance certificates on file." />
      <Card>
        <AddDrawer open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Add a vendor" title="Add a vendor">
          <FieldGrid>
            <Field label="Company"><Input value={name} onChange={setName} placeholder="Legal business name" /></Field>
            <Field label="Trade"><Select value={trade} onChange={setTrade} options={TRADES.map((t) => ({ id: t, label: t }))} /></Field>
            <Field label="Contact"><Input value={contact} onChange={setContact} placeholder="Name, phone or email" /></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Contract"><Input value={contract} onChange={setContract} placeholder="e.g. Thru Dec 2027" /></Field>
            <Field label="Insurance expires"><Input value={insurance} onChange={setInsurance} placeholder="e.g. Renews Mar 1" /></Field>
          </FieldGrid>
          <AddressFields value={address} onChange={setAddress} stateLocked={false} unitLabel="Suite or unit" />
          <DropZone>W-9, certificate of insurance and signed contract — drag files here</DropZone>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start" }}>Add vendor</Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search vendor or trade…"
          filters={FILTERS} active={filter} onFilter={setFilter} />

        {visible.length === 0 ? <Empty>No vendors match that.</Empty> : visible.map((v) => (
          <Row key={v.id}>
            <RowMain label={v.name} detail={v.trade} />
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{v.contract}</span>
            <Mono size={14}>{v.spend}</Mono>
            <Status tone={v.ok ? "positive" : "critical"}>{v.insurance}</Status>
          </Row>
        ))}
      </Card>
    </>
  );
}
