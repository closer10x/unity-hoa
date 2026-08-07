"use client";

import React, { useEffect, useState } from "react";
import { ONBOARD_STEPS } from "@/lib/admin-portal/actions";
import { emptyAddress, formatAddress } from "@/lib/admin-portal/address";
import {
  getCommunityPolicies, setCommunityPolicy, type CommunityPolicy,
} from "@/lib/admin-portal/policy-actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { Address, Community, PendingConfirm, Portfolio } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, AddressFields, Card, CardHead, Chip, ConfirmBar,
  ErrorLine, Field, FieldGrid, Input, Mono, PageTitle, Primary, Row, RowMain,
  Select, Status,
} from "../ui";

export default function Communities() {
  const s = useStore();

  /* portfolios — created and scoped, never deleted (product rule 8) */
  const [pOpen, setPOpen] = useState(false);
  const [pError, setPError] = useState("");
  const [pName, setPName] = useState("");
  const [pMembers, setPMembers] = useState<string[]>([]);

  /* communities */
  const [cOpen, setCOpen] = useState(false);
  const [cError, setCError] = useState("");
  const [cName, setCName] = useState("");
  const [cAddress, setCAddress] = useState<Address>(emptyAddress());
  const [cDoors, setCDoors] = useState("");
  const [cDues, setCDues] = useState("");
  const [cCadence, setCCadence] = useState("Quarterly");
  const [cPortfolio, setCPortfolio] = useState("");
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  /* per-community feature policy */
  const [policies, setPolicies] = useState<CommunityPolicy[]>([]);
  const [policyError, setPolicyError] = useState("");

  useEffect(() => {
    let alive = true;
    getCommunityPolicies(s.communities.map((c) => c.id)).then((res) => {
      if (!alive) return;
      if (res.ok) setPolicies(res.policies);
      else setPolicyError(res.error);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.communities.length]);

  async function togglePolicy(community: string, key: keyof Omit<CommunityPolicy, "community">) {
    const current = policies.find((p) => p.community === community);
    if (!current) return;
    const next = { ...current, [key]: !current[key] };
    setPolicies((prev) => prev.map((p) => (p.community === community ? next : p)));
    const res = await setCommunityPolicy(next);
    if (!res.ok) {
      setPolicies((prev) => prev.map((p) => (p.community === community ? current : p)));
      setPolicyError(res.error);
    } else {
      setPolicyError("");
    }
  }

  function savePortfolio() {
    if (!pName.trim()) return setPError("Name the portfolio.");
    if (pMembers.length === 0) return setPError("Assign at least one community.");
    const pf: Portfolio = { id: s.uid("pf"), name: pName.trim(), members: [...pMembers] };
    s.setPortfolios((prev) => [...prev, pf]);
    s.audit(`Created portfolio ${pf.name}`);
    setPOpen(false); setPError(""); setPName(""); setPMembers([]);
  }

  function saveCommunity() {
    if (!cName.trim()) return setCError("Name the community.");
    if (!cAddress.city.trim()) return setCError("Add the city.");
    if (!cDoors.trim()) return setCError("How many doors?");
    const doors = parseInt(cDoors.replace(/[^0-9]/g, ""), 10) || 0;
    const dues = parseFloat(cDues.replace(/[^0-9.]/g, "")) || 0;
    const c: Community = {
      id: s.uid("c"), name: cName.trim(),
      location: formatAddress(cAddress) || cAddress.city.trim(),
      doors: `${doors} homes`,
      dues: `$${dues.toFixed(2)}`,
      cadence: cCadence, stage: "Onboarding",
      portfolio: cPortfolio,
    };
    s.setCommunities((prev) => [...prev, c]);
    if (cPortfolio) {
      s.setPortfolios((prev) => prev.map((p) => p.id === cPortfolio ? { ...p, members: [...p.members, c.id] } : p));
    }
    s.audit(`Onboarded community ${c.name}`);
    setCOpen(false); setCError(""); setCName(""); setCAddress(emptyAddress()); setCDoors(""); setCDues(""); setCPortfolio("");
  }

  return (
    <>
      <PageTitle title="Communities" lede="Portfolios, the communities in each, and where new ones are in onboarding." />

      <Card>
        <CardHead title="Portfolios" meta="Portfolios are created and scoped — never removed" />
        <AddDrawer open={pOpen} onOpen={() => { setPOpen(true); setPError(""); }} onCancel={() => { setPOpen(false); setPError(""); }}
          openLabel="Create a portfolio" title="Create a portfolio">
          <Field label="Portfolio name"><Input value={pName} onChange={setPName} placeholder="e.g. West Houston" /></Field>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Communities in this portfolio</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {s.communities.map((c) => (
                <Chip key={c.id} on={pMembers.includes(c.id)}
                  onClick={() => setPMembers((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>
          {pError ? <ErrorLine>{pError}</ErrorLine> : null}
          <Primary onClick={savePortfolio} style={{ justifySelf: "start" }}>Create portfolio</Primary>
        </AddDrawer>
        {s.portfolios.map((p) => (
          <Row key={p.id}>
            <RowMain label={p.name}
              detail={p.members.map((m) => s.communities.find((c) => c.id === m)?.name).filter(Boolean).join(", ") || "No communities yet"} />
            <Mono size={13} style={{ color: color.neutral }}>{p.members.length} communities</Mono>
            <Mono size={13} style={{ color: color.inkQuaternary }}>
              {p.members.reduce((t, m) => t + (parseInt(s.communities.find((c) => c.id === m)?.doors ?? "0", 10) || 0), 0)} doors
            </Mono>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="Communities" meta={`${s.communities.length} under management`} />
        <AddDrawer open={cOpen} onOpen={() => { setCOpen(true); setCError(""); }} onCancel={() => { setCOpen(false); setCError(""); }}
          openLabel="Add a community" title="Onboard a community">
          <FieldGrid>
            <Field label="Community name"><Input value={cName} onChange={setCName} placeholder="e.g. Harbor Point" /></Field>
            <Field label="Doors"><Input value={cDoors} onChange={setCDoors} placeholder="e.g. 240" /></Field>
          </FieldGrid>
          <AddressFields value={cAddress} onChange={setCAddress} unitLabel="Suite (optional)" />
          <FieldGrid>
            <Field label="HOA fee"><Input value={cDues} onChange={setCDues} placeholder="e.g. $265.00" /></Field>
            <Field label="Billing cadence">
              <Select value={cCadence} onChange={setCCadence} options={[
                { id: "Monthly", label: "Monthly" },
                { id: "Quarterly", label: "Quarterly" },
                { id: "Semi-annual", label: "Semi-annual" },
                { id: "Annual", label: "Annual" },
              ]} />
            </Field>
            <Field label="Portfolio">
              <Select value={cPortfolio} onChange={setCPortfolio} placeholder="Unassigned"
                options={s.portfolios.map((p) => ({ id: p.id, label: p.name }))} />
            </Field>
          </FieldGrid>
          {cError ? <ErrorLine>{cError}</ErrorLine> : null}
          <Primary onClick={saveCommunity} style={{ justifySelf: "start" }}>Add community</Primary>
        </AddDrawer>

        {s.communities.map((c) => {
          const menu = buildActionMenu(ONBOARD_STEPS, c.stage, c.id, c.name, pending, setPending);
          return (
            <React.Fragment key={c.id}>
              <Row>
                <RowMain label={c.name} detail={c.location} />
                <Mono size={13} style={{ color: color.inkTertiary }}>{c.doors}</Mono>
                <Mono size={14}>{c.dues} {c.cadence.toLowerCase()}</Mono>
                <Status tone={c.stage === "Active" ? "positive" : c.stage === "Offboarding" ? "critical" : "attention"}>{c.stage}</Status>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setCommunities((prev) => prev.map((x) => x.id === c.id ? { ...x, stage: next } : x));
                    setPending(null);
                    s.audit(`${c.name} moved to ${next}`);
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>

      <Card>
        <CardHead
          title="What each community offers"
          meta="Hidden features disappear from that community's resident portal"
        />
        {policyError ? (
          <div style={{ padding: "14px 24px" }}>
            <ErrorLine>{policyError}</ErrorLine>
          </div>
        ) : null}
        {s.communities.map((c) => {
          const p = policies.find((x) => x.community === c.id);
          if (!p) return null;
          return (
            <Row key={c.id}>
              <RowMain label={c.name} detail="Leasing, gates and guest passes" />
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip on={p.allowLeases} onClick={() => togglePolicy(c.id, "allowLeases")}>
                  Leasing {p.allowLeases ? "allowed" : "not permitted"}
                </Chip>
                <Chip on={p.allowGateCodes} onClick={() => togglePolicy(c.id, "allowGateCodes")}>
                  Gate codes {p.allowGateCodes ? "offered" : "off"}
                </Chip>
                <Chip on={p.allowGuestPasses} onClick={() => togglePolicy(c.id, "allowGuestPasses")}>
                  Guest passes {p.allowGuestPasses ? "offered" : "off"}
                </Chip>
              </span>
            </Row>
          );
        })}
      </Card>
    </>
  );
}
