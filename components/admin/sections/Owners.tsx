"use client";

import React, { useState } from "react";
import { emptyAddress, formatAddress, isAddressComplete } from "@/lib/admin-portal/address";
import { useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, font } from "@/lib/admin-portal/tokens";
import type { Address, Owner } from "@/lib/admin-portal/types";
import {
  AddDrawer, AddressFields, Card, CardHead, Chip, Empty, ErrorLine, Field,
  FieldGrid, FilterBar, Input, MailingAddress, Mono, PageTitle, Primary, Row,
  RowMain, Select, Status,
} from "../ui";

const FILTERS = ["All", "Current", "Balance due", "Tenant on file"];

export default function Owners() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [community, setCommunity] = useState("all");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [coOwner, setCoOwner] = useState("");
  const [comm, setComm] = useState(s.communities[0]?.id ?? "sofi");
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

  const visible = useSearchFilter(
    s.owners, query, ["name", "address", "contact", "account"],
    (o) => {
      if (community !== "all" && o.scope !== community) return false;
      if (!s.scopeCommunityIds.includes(o.scope)) return false;
      if (filter === "All") return true;
      return o.status === filter;
    },
  );

  function save() {
    if (!name.trim()) return setError("Add the name on the deed.");
    if (!property.streetNo.trim() || !property.street.trim()) return setError("Add the street number and street name.");
    if (!property.city.trim() || !property.zip.trim()) return setError("Add the city and ZIP code.");
    if (!email.trim() && !phone.trim()) return setError("Add an email or a mobile number — the portal invite needs one.");
    if (!mailSame && !isAddressComplete(mailing)) return setError("Complete the mailing address, or mark it the same as the property.");

    const bal = parseFloat(balance.replace(/[^0-9.]/g, "")) || 0;
    const owner: Owner = {
      id: s.uid("o"),
      name: name.trim() + (coOwner.trim() ? ` & ${coOwner.trim()}` : ""),
      address: formatAddress(property),
      contact: email.trim() || phone.trim(),
      balance: `$${bal.toFixed(2)}`,
      status: bal > 0 ? "Balance due" : occupancy === "Leased" ? "Tenant on file" : "Current",
      scope: comm,
      flag: bal > 0 ? "delinquent" : occupancy === "Leased" ? "tenant" : "current",
      account: accountNo.trim() || String(Math.floor(50000 + Math.random() * 40000)),
    };
    s.addOwner(owner);
    s.audit(`Added homeowner ${owner.name} · ${owner.address}`);
    setOpen(false); setError(""); setQuery("");
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
          note="New owners get portal access and a welcome packet the next business morning.">
          <FieldGrid>
            <Field label="Owner name"><Input value={name} onChange={setName} placeholder="Name on the deed" /></Field>
            <Field label="Co-owner"><Input value={coOwner} onChange={setCoOwner} placeholder="Optional" /></Field>
            <Field label="Community">
              <Select value={comm} onChange={setComm} options={s.communities.map((c) => ({ id: c.id, label: c.name }))} />
            </Field>
          </FieldGrid>

          <AddressFields value={property} onChange={setProperty} />

          <FieldGrid>
            <Field label="Account number"><Input value={accountNo} onChange={setAccountNo} placeholder="Leave blank to auto-assign" /></Field>
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
          <Primary onClick={save} style={{ justifySelf: "start" }}>Add homeowner</Primary>
        </AddDrawer>

        <FilterBar
          query={query} onQuery={setQuery} placeholder="Search name, address or account no.…"
          filters={FILTERS} active={filter} onFilter={setFilter}
          extra={
            <select value={community} onChange={(e) => setCommunity(e.target.value)}
              style={{ appearance: "none", font: "inherit", fontSize: 14, background: color.surfaceSunken, border: `1px solid ${color.borderInput}`, borderRadius: 999, padding: "11px 30px 11px 14px", cursor: "pointer", color: color.ink }}>
              <option value="all">Every community</option>
              {s.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          } />

        {visible.length === 0 ? <Empty>No owners match that search.</Empty> : visible.map((o) => (
          <Row key={o.id}>
            <RowMain label={o.name} detail={o.address} />
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{o.contact}</span>
            <Mono size={15}>{o.balance}</Mono>
            <Status tone={o.flag === "delinquent" ? "critical" : o.flag === "tenant" ? "attention" : "positive"}>{o.status}</Status>
            <Mono size={12} style={{ color: color.inkQuaternary }}>#{o.account}</Mono>
          </Row>
        ))}
      </Card>
    </>
  );
}
