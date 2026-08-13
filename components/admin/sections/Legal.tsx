"use client";

import React, { useState } from "react";
import { LEGAL_STEPS } from "@/lib/admin-portal/actions";
import { emptyAddress, formatAddress } from "@/lib/admin-portal/address";
import { createLegalCase, setLegalStage } from "@/lib/admin-portal/legal-actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import type { Address, LegalStage, PendingConfirm } from "@/lib/admin-portal/types";
import { parseDollarsToCents } from "@/lib/format/money";
import {
  ActionSelect, AddDrawer, AddressFields, Card, CardHead, ConfirmBar, DateInput,
  Empty, ErrorLine, Field, FieldGrid, Input, Mono, Primary, Row,
  RowMain, Select, Status,
} from "../ui";

/** Stages a matter can be opened at — the rest are reached by taking action. */
const OPEN_STAGES: LegalStage[] = ["Referred to counsel", "Judgment", "Payment plan", "Closed"];

/** These stages only go through if the authorizing board vote is recorded. */
const VOTE_REQUIRED: LegalStage[] = ["Lien filed", "Suit filed", "Foreclosure scheduled"];

export default function Legal() {
  const s = useStore();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [flowError, setFlowError] = useState("");
  const [voteDate, setVoteDate] = useState("");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress());
  const [balance, setBalance] = useState("");
  const [stage, setStage] = useState<string>(OPEN_STAGES[0]);
  const [counsel, setCounsel] = useState("");

  const tone = (st: string) =>
    st === "Closed" || st === "Payment plan" ? "positive"
    : st === "Foreclosure scheduled" || st === "Suit filed" ? "critical" : "attention";

  async function save() {
    if (!owner.trim()) return setError("Whose matter is this? Add the owner's name.");
    const raw = balance.trim();
    const cents = raw ? parseDollarsToCents(raw) : 0;
    if (cents == null || cents < 0) return setError("Enter the balance as a dollar amount, or leave it blank.");
    setSaving(true);
    const res = await createLegalCase({
      ownerName: owner, address: formatAddress(address),
      balanceCents: cents, stage, counsel,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setLegalCases((prev) => [res.legalCase, ...prev]);
    setOpen(false); setError(""); setOwner(""); setAddress(emptyAddress());
    setBalance(""); setCounsel("");
  }

  return (
    <>

      <Card>
        <CardHead title="Open matters" meta="Consequential stages need a recorded board vote" />
        <AddDrawer open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Open a matter" title="Open a legal matter">
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary }}>
            Opening a matter records it against the owner&rsquo;s file. Liens, suits and foreclosure
            sales are reached from the action menu, where the board vote is recorded with the change.
          </p>
          <FieldGrid>
            <Field label="Owner"><Input value={owner} onChange={setOwner} placeholder="First and last" /></Field>
            <Field label="Balance" hint="Unpaid HOA fees, fines and fees to date.">
              <Input value={balance} onChange={setBalance} mono placeholder="e.g. 2,480.00" />
            </Field>
            <Field label="Opening stage">
              <Select value={stage} onChange={setStage} options={OPEN_STAGES.map((st) => ({ id: st, label: st }))} />
            </Field>
          </FieldGrid>
          <AddressFields value={address} onChange={setAddress} unitLabel="Unit or lot no." />
          <FieldGrid>
            <Field label="Counsel" hint="Leave blank until a firm takes it.">
              <Input value={counsel} onChange={setCounsel} placeholder="e.g. Hartley & Boyd" />
            </Field>
          </FieldGrid>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start" }}>{saving ? "Saving…" : "Open matter"}</Primary>
        </AddDrawer>

        {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

        {s.legalCases.length === 0 ? (
          <Empty>No legal matters. Anything referred to counsel is opened here and follows the stages from referral to close.</Empty>
        ) : null}

        {s.legalCases.map((c) => {
          const menu = buildActionMenu(LEGAL_STEPS, c.stage, c.id, `${c.owner} · ${c.address}`, pending, setPending);
          const needsVote = menu.confirming && VOTE_REQUIRED.includes(menu.nextValue as LegalStage);
          return (
            <React.Fragment key={c.id}>
              <Row>
                <RowMain label={c.owner} detail={c.address} />
                <Mono size={15}>{c.balance}</Mono>
                <span style={{ fontSize: 14, color: color.inkTertiary }}>{c.counsel}</span>
                <Status tone={tone(c.stage)}>{c.stage}</Status>
                <ActionSelect options={menu.options} onChoose={(id) => { setFlowError(""); setVoteDate(""); menu.onChoose(id); }} />
              </Row>
              {needsVote ? (
                <div style={{ padding: `16px ${pad.card} 0`, display: "grid", gap: 8, maxWidth: 340 }}>
                  <Field label="Date the board voted to authorize this" hint="Recorded on the matter, so the authorization is on file.">
                    <DateInput value={voteDate} onChange={setVoteDate} />
                  </Field>
                </div>
              ) : null}
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={() => { setVoteDate(""); menu.cancel(); }}
                  onConfirm={async () => {
                    const next = menu.nextValue!;
                    setPending(null);
                    setFlowError("");
                    const res = await setLegalStage({ id: c.id, stage: next, boardVoteOn: voteDate });
                    setVoteDate("");
                    if (!res.ok) return setFlowError(res.error);
                    s.setLegalCases((prev) => prev.map((x) => (x.id === c.id ? res.legalCase : x)));
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
}
