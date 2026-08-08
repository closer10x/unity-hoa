"use client";

import React, { useEffect, useState } from "react";
import { ONBOARD_STEPS } from "@/lib/admin-portal/actions";
import { emptyAddress, formatAddress } from "@/lib/admin-portal/address";
import {
  getCommunityBilling, updateCommunityBilling,
} from "@/lib/admin-portal/community-actions";
import {
  getCommunityPolicies, setCommunityPolicy, type CommunityPolicy,
} from "@/lib/admin-portal/policy-actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, radius } from "@/lib/admin-portal/tokens";
import type { Address, Community, PendingConfirm, Portfolio } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, AddressFields, Card, CardHead, Chip, ConfirmBar,
  ErrorLine, Field, FieldGrid, Input, Mono, PageTitle, Primary, Row, RowMain,
  Select, Status, TextButton,
} from "../ui";

const CADENCE_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual", custom: "Custom",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

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

  /* per-community edit drawer: billing + what the community offers */
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editCadence, setEditCadence] = useState("");
  const [editDueDay, setEditDueDay] = useState("");
  const [editDueMonth, setEditDueMonth] = useState("");

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

  async function openEdit(c: Community) {
    if (editId === c.id) { setEditId(null); return; }
    setEditId(c.id);
    setEditLoading(true);
    setEditError("");
    setEditNote("");
    const res = await getCommunityBilling();
    setEditLoading(false);
    if (!res.ok) return setEditError(res.error);
    setEditFee(res.billing.feeDollars);
    setEditCadence(res.billing.cadence);
    setEditDueDay(res.billing.dueDay);
    setEditDueMonth(res.billing.dueMonth);
  }

  async function saveEdit(c: Community) {
    setEditSaving(true);
    setEditError("");
    setEditNote("");
    const res = await updateCommunityBilling({
      communityName: c.name,
      feeDollars: editFee,
      cadence: editCadence,
      dueDay: editDueDay,
      // The due month only applies to annual billing; drop it otherwise.
      dueMonth: editCadence === "annual" ? editDueMonth : "",
    });
    setEditSaving(false);
    if (!res.ok) return setEditError(res.error);
    const cents = res.billing.feeDollars === "" ? null : Math.round(parseFloat(res.billing.feeDollars) * 100);
    s.setCommunities((prev) => prev.map((x) => x.id === c.id ? {
      ...x,
      dues: cents != null ? `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Not set",
      cadence: CADENCE_LABELS[res.billing.cadence] ?? "",
    } : x));
    s.audit(`Updated billing for ${c.name}`);
    setEditNote("Saved. The fee shows across both portals and the public dues lookup.");
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
          const p = policies.find((x) => x.community === c.id);
          return (
            <React.Fragment key={c.id}>
              <Row>
                <RowMain label={c.name} detail={c.location} />
                <Mono size={13} style={{ color: color.inkTertiary }}>{c.doors}</Mono>
                <Mono size={14}>{c.dues} {c.cadence.toLowerCase()}</Mono>
                <Status tone={c.stage === "Active" ? "positive" : c.stage === "Offboarding" ? "critical" : "attention"}>{c.stage}</Status>
                <TextButton onClick={() => openEdit(c)}>{editId === c.id ? "Close" : "Edit"}</TextButton>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>

              {editId === c.id ? (
                <div style={{ padding: "0 24px 20px", borderBottom: `1px solid ${color.hairlineSoft}` }}>
                  <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 22, display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>Edit {c.name}</span>
                      <TextButton tone="muted" onClick={() => setEditId(null)}>Cancel</TextButton>
                    </div>

                    {editLoading ? (
                      <span style={{ fontSize: 14, color: color.inkTertiary }}>Loading…</span>
                    ) : (
                      <>
                        <FieldGrid>
                          <Field label="HOA fee" hint="Shown to residents and on the public dues lookup">
                            <Input value={editFee} onChange={setEditFee} placeholder="e.g. 1350.00" />
                          </Field>
                          <Field label="Billing cadence">
                            <Select value={editCadence} onChange={setEditCadence} placeholder="Not set"
                              options={[
                                { id: "monthly", label: "Monthly" },
                                { id: "quarterly", label: "Quarterly" },
                                { id: "annual", label: "Annual" },
                              ]} />
                          </Field>
                          {editCadence === "annual" ? (
                            <Field label="Due month" hint="Annual billing needs the month it comes due">
                              <Select value={editDueMonth} onChange={setEditDueMonth} placeholder="Not set"
                                options={MONTHS.map((mo, i) => ({ id: String(i + 1), label: mo }))} />
                            </Field>
                          ) : null}
                          <Field label="Due day of the month">
                            <Select value={editDueDay} onChange={setEditDueDay} placeholder="Not set"
                              options={Array.from({ length: 28 }, (_, i) => ({
                                id: String(i + 1), label: `The ${ordinal(i + 1)}`,
                              }))} />
                          </Field>
                        </FieldGrid>

                        <div style={{ borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 16, display: "grid", gap: 12 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>What this community offers</span>
                          <span style={{ fontSize: 14, color: color.inkTertiary }}>
                            Toggles save on their own. Hidden features disappear from this community&rsquo;s resident portal.
                          </span>
                          {p ? (
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
                          ) : (
                            <span style={{ fontSize: 14, color: color.inkTertiary }}>Loading the policy…</span>
                          )}
                          {policyError ? <ErrorLine>{policyError}</ErrorLine> : null}
                        </div>

                        {editError ? <ErrorLine>{editError}</ErrorLine> : null}
                        {editNote ? <span style={{ fontSize: 14, color: color.accent }}>{editNote}</span> : null}
                        <Primary onClick={() => saveEdit(c)} style={{ justifySelf: "start" }}>
                          {editSaving ? "Saving…" : "Save billing"}
                        </Primary>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

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
    </>
  );
}
