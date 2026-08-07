"use client";

import React, { useState } from "react";

import { useResident } from "@/lib/resident-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import {
  Card, CardHead, Empty, ErrorLine, Eyebrow, Field, FieldGrid, Input, Mono,
  PageTitle, Primary, Row, RowMain, Select, Status, TextButton,
} from "@/components/admin/ui";

const CARD_FEE_RATE = 0.0295;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** The four-column ledger grid from the handoff. */
const ledgerGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "88px minmax(120px, 1fr) 96px 96px",
  gap: "8px 18px",
  alignItems: "baseline",
  padding: `14px ${pad.card}`,
  borderBottom: `1px solid ${color.hairlineSoft}`,
};

export default function Payments() {
  const s = useResident();
  const p = s.property;

  const [choice, setChoice] = useState("full");
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("ach");
  const [error, setError] = useState("");

  const baseCents =
    choice === "custom"
      ? Math.round(parseFloat(custom || "0") * 100)
      : p.balanceCents ?? 0;
  const feeCents = method === "card" ? Math.round(baseCents * CARD_FEE_RATE) : 0;
  const totalCents = baseCents + feeCents;

  function payNow() {
    if (choice === "custom" && (!baseCents || baseCents <= 0)) {
      return setError("Add the amount you want to pay.");
    }
    setError("");
    // The processor flow lives at /payment (Stripe checkout); the amount is
    // confirmed there before anything is charged.
    window.location.href = "/payment";
  }

  return (
    <>
      <PageTitle title="Payments" lede="Your balance, ways to pay, and the full account ledger." />

      <Card>
        <CardHead title="Your HOA fee" meta={p.cadence ? `${p.cadence} billing` : undefined} />
        <div style={{ padding: pad.card, display: "grid", gap: 6 }}>
          {p.balanceCents != null ? (
            <>
              <Eyebrow>Next HOA fee</Eyebrow>
              <span style={{ fontFamily: font.mono, fontSize: 34, fontWeight: 400, letterSpacing: "-0.01em" }}>
                {p.balance}
              </span>
              <span style={{ fontSize: 15, color: color.inkTertiary }}>
                {p.due ? `Due ${p.due}` : "Due date to be announced"}
                {p.cadence ? ` · ${p.cadence} HOA fee` : ""}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkTertiary }}>
              No billing is configured on your account yet. Once the office posts
              your HOA fee schedule it will appear here.
            </span>
          )}
        </div>
      </Card>

      <Card>
        <CardHead title="Make a payment" />
        <div style={{ padding: pad.card, display: "grid", gap: 18 }}>
          <FieldGrid>
            <Field label="Amount">
              <Select
                value={choice}
                onChange={setChoice}
                options={[
                  { id: "full", label: p.balance ? `Full HOA fee — ${p.balance}` : "Full HOA fee" },
                  { id: "custom", label: "Another amount" },
                ]}
              />
            </Field>
            {choice === "custom" ? (
              <Field label="Custom amount" hint="Dollars and cents, e.g. 285.00">
                <Input value={custom} onChange={setCustom} placeholder="0.00" mono />
              </Field>
            ) : null}
            <Field label="Method">
              <Select
                value={method}
                onChange={setMethod}
                options={[
                  { id: "ach", label: "Bank transfer — no fee" },
                  { id: "card", label: "Card — 2.95% processor fee" },
                ]}
              />
            </Field>
          </FieldGrid>

          <div style={{ display: "grid", gap: 4 }}>
            {method === "card" && baseCents > 0 ? (
              <Mono size={13} style={{ color: color.attention }}>
                {usd(baseCents / 100)} + {usd(feeCents / 100)} card fee = {usd(totalCents / 100)}
              </Mono>
            ) : null}
            <span style={{ fontSize: 13, lineHeight: 1.55, color: color.inkQuaternary }}>
              Card payments carry a 2.95% processor fee. Bank transfers and
              checks carry no fee. You’ll confirm on the secure payment page
              before anything is charged.
            </span>
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={payNow} style={{ justifySelf: "start" }}>
            Continue to secure payment
          </Primary>
        </div>
      </Card>

      <Card>
        <CardHead title="Autopay" />
        <div style={{ padding: pad.card, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary, flex: "1 1 320px" }}>
            {s.autopay
              ? "On — the full HOA fee drafts from your bank account three days before each due date."
              : "Off — you'll get an email reminder ten days before each due date."}
          </span>
          <TextButton onClick={() => s.setAutopay(!s.autopay)}>
            {s.autopay ? "Turn autopay off" : "Turn autopay on"}
          </TextButton>
        </div>
      </Card>

      <Card>
        <CardHead title="Portal payments" meta="What you've paid online" />
        {s.payments.length === 0 ? (
          <Empty>No portal payments yet. Payments you make here will be listed with their receipt status.</Empty>
        ) : (
          s.payments.map((r) => (
            <Row key={r.id}>
              <Mono size={13} style={{ color: color.neutral }}>{r.date}</Mono>
              <RowMain label={r.label} />
              <Mono size={14} style={{ justifySelf: "end" }}>{r.amount}</Mono>
              <Status tone={r.status === "paid" ? "positive" : r.status === "failed" ? "critical" : "attention"}>
                {r.status}
              </Status>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <CardHead title="Ledger" meta="Charges and payments on your account" />
        {s.ledger.length === 0 ? (
          <Empty>Nothing on your ledger yet. HOA fee postings and payments will appear here.</Empty>
        ) : (
          <>
            <div style={{ ...ledgerGrid, background: color.surfaceMuted }}>
              {["Date", "Description", "Amount", "Balance"].map((h, i) => (
                <span
                  key={h}
                  style={{
                    fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: color.inkQuaternary,
                    justifySelf: i >= 2 ? "end" : "start",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {s.ledger.map((l) => (
              <div key={l.id} style={ledgerGrid}>
                <Mono size={13} style={{ color: color.neutral }}>{l.date}</Mono>
                <span style={{ fontSize: 15, minWidth: 0 }}>{l.label}</span>
                <Mono size={14} style={{ justifySelf: "end", color: l.credit ? color.positive : color.ink }}>
                  {l.amount}
                </Mono>
                <Mono size={14} style={{ justifySelf: "end", color: color.inkTertiary }}>{l.balance}</Mono>
              </div>
            ))}
          </>
        )}
      </Card>
    </>
  );
}
