"use client";

import React, { useMemo, useState } from "react";
import { AGING, BUDGET } from "@/lib/admin-portal/fixtures";
import { CARD_FEE_RATE, DELINQ_STEPS, PAY_METHODS } from "@/lib/admin-portal/actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, font, radius } from "@/lib/admin-portal/tokens";
import type { PendingConfirm } from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, Card, CardHead, Chip, ConfirmBar, ErrorLine, Field,
  FieldGrid, Input, Mono, PageTitle, Primary, Row, RowMain, Select, Status,
  TextButton, Tile, Tiles,
} from "../ui";

export default function Accounting() {
  const s = useStore();

  /* ----- take a payment (collapsed at the top; product rule 1) ----- */
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{ receipt: string; detail: string } | null>(null);
  const [resent, setResent] = useState(false);

  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [applyTo, setApplyTo] = useState("Oldest balance first");
  const [method, setMethod] = useState<string>("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", zip: "" });
  const [ref, setRef] = useState({ number: "", received: "" });
  const [flags, setFlags] = useState({ authorized: false, recorded: false, emailReceipt: true });
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || account) return [];
    return s.owners
      .filter((o) => `${o.name} ${o.address} ${o.contact} ${o.account}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, account, s.owners]);

  const picked = s.owners.find((o) => o.name === account);
  const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const fee = method === "card" ? Math.round(amt * CARD_FEE_RATE * 100) / 100 : 0;

  const reset = () => {
    setAmount(""); setCard({ number: "", expiry: "", cvv: "", zip: "" });
    setRef({ number: "", received: "" }); setAccount(""); setQuery(""); setError("");
  };

  function process() {
    if (!account) return setError("Pick the account this payment belongs to.");
    if (!amt) return setError("Enter an amount.");
    if (method === "card" && (!card.number.trim() || !card.expiry.trim() || !card.cvv.trim()))
      return setError("Card number, expiry and CVV are required.");
    if (method === "card" && !flags.authorized)
      return setError("Mark the owner's verbal authorization before charging a card.");
    if ((method === "check" || method === "money") && !ref.number.trim())
      return setError("Add the check or money order number.");

    const label = PAY_METHODS.find((m) => m.id === method)?.label ?? "";
    const last4 = card.number.replace(/[^0-9]/g, "").slice(-4);
    const short = `${account.split(" ")[0].charAt(0)}. ${account.split(" ").slice(1).join(" ")}`;

    s.setPayments((prev) => [
      { id: s.uid("p"), date: s.stamp().split(",")[0], amount: `$${amt.toFixed(2)}`,
        label: `${short} · ${label.toLowerCase()}${last4 ? ` ····${last4}` : ""}${ref.number.trim() ? ` · ref ${ref.number.trim()}` : ""}` },
      ...prev,
    ]);
    s.setDelinquents((prev) => prev
      .map((d) => {
        if (d.owner !== short) return d;
        const remaining = Math.max(0, (parseFloat(d.balance.replace(/[^0-9.]/g, "")) || 0) - amt);
        return { ...d, balance: `$${remaining.toFixed(2)}`, stage: remaining === 0 ? "Paid in full" : d.stage };
      })
      .filter((d) => d.balance !== "$0.00"));

    setDone({
      receipt: `$${(amt + fee).toFixed(2)} from ${account}`,
      detail: `${label}${last4 ? ` ····${last4}` : ""}${ref.number.trim() ? ` · ref ${ref.number.trim()}` : ""} · applied to ${applyTo.toLowerCase()} · posted by ${s.currentUser.split(" · ")[0]} at ${s.stamp()}${flags.emailReceipt ? " · receipt emailed" : " · no receipt sent"}`,
    });
    setResent(false);
    setError("");
    s.audit(`Posted $${amt.toFixed(2)} for ${account} (${label})`);
  }

  /* ----- delinquency ladder ----- */
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  return (
    <>
      <PageTitle title="Accounting" lede={`Receivables, delinquencies and budget performance for ${s.scopeLabel}.`} />

      <Card>
        <CardHead title="Take a payment" meta={`Phone, walk-in or mailed check · posted by ${s.currentUser.split(" · ")[0]}`} />
        <div style={{ padding: 24 }}>
          {done ? (
            <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
              <Mono size={11} style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: color.neutral }}>Payment posted</Mono>
              <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{done.receipt}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>{done.detail}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <TextButton onClick={() => { setDone(null); reset(); setOpen(true); }}>Take another payment</TextButton>
                <TextButton onClick={() => setResent(true)}>Email receipt again</TextButton>
              </div>
              {resent ? <p style={{ fontSize: 14, color: color.accent }}>Receipt re-sent to the owner&rsquo;s email on file.</p> : null}
            </div>
          ) : !open ? (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <Primary onClick={() => setOpen(true)}>Add a payment</Primary>
              <span style={{ fontSize: 14, color: color.inkTertiary }}>
                Card, ACH, check, money order or cash — over the phone or at the counter.
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18, maxWidth: 780 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>New payment</span>
                <TextButton tone="muted" onClick={() => { setOpen(false); reset(); }}>Cancel</TextButton>
              </div>

              <FieldGrid>
                <div style={{ position: "relative" }}>
                  <Field label="Owner or account">
                    <Input value={query} placeholder="Start typing a name, address or account no."
                      onChange={(v) => { setQuery(v); setAccount(""); setError(""); }} />
                  </Field>
                  {matches.length > 0 ? (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                      background: color.surface, border: `1px solid ${color.borderInput}`,
                      borderRadius: 12, boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                      padding: 6, zIndex: 20, display: "grid", gap: 2, maxHeight: 260, overflowY: "auto",
                    }}>
                      {matches.map((o) => (
                        <button key={o.id} type="button"
                          onClick={() => { setAccount(o.name); setQuery(o.name); setError(""); }}
                          style={{ textAlign: "left", width: "100%", background: "none", border: "none", borderRadius: 8, padding: "10px 12px", font: "inherit", cursor: "pointer", color: "inherit" }}>
                          <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{o.name}</span>
                          <span style={{ display: "block", fontSize: 13, color: color.inkQuaternary, marginTop: 2 }}>
                            {o.address} · {o.balance !== "$0.00" ? `${o.balance} due` : "current"} · {o.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!account && query.trim() && matches.length === 0 ? (
                    <p style={{ marginTop: 8, fontSize: 14, color: color.inkTertiary }}>
                      No owner matches that. Check the spelling or search by lot number.
                    </p>
                  ) : null}
                  {picked ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, background: color.accentTint, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.md, padding: "10px 12px" }}>
                      <span style={{ fontSize: 14, color: "oklch(0.3 0.02 150)" }}>
                        {picked.name} · {picked.address} · {picked.balance !== "$0.00" ? `${picked.balance} due` : "current"}
                      </span>
                      <TextButton onClick={() => { setAccount(""); setQuery(""); }}>Change</TextButton>
                    </span>
                  ) : null}
                </div>
                <Field label="Amount"><Input value={amount} onChange={setAmount} placeholder="$0.00" /></Field>
                <Field label="Apply to">
                  <Select value={applyTo} onChange={setApplyTo} options={[
                    { id: "Oldest balance first", label: "Oldest balance first" },
                    { id: "Current HOA fee", label: "Current HOA fee" },
                    { id: "Late fees", label: "Late fees" },
                    { id: "Legal fees & costs", label: "Legal fees & costs" },
                    { id: "Special assessment", label: "Special assessment" },
                  ]} />
                </Field>
              </FieldGrid>

              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 14, color: color.inkSecondary }}>Method</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PAY_METHODS.map((m) => (
                    <Chip key={m.id} on={method === m.id} onClick={() => { setMethod(m.id); setError(""); }}>{m.label}</Chip>
                  ))}
                </div>
              </div>

              {method === "card" ? (
                <FieldGrid>
                  <Field label="Card number"><Input value={card.number} onChange={(v) => setCard({ ...card, number: v })} placeholder="•••• •••• •••• ••••" /></Field>
                  <Field label="Expiry"><Input value={card.expiry} onChange={(v) => setCard({ ...card, expiry: v })} placeholder="MM / YY" /></Field>
                  <Field label="CVV"><Input value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v })} placeholder="•••" /></Field>
                  <Field label="Billing ZIP"><Input value={card.zip} onChange={(v) => setCard({ ...card, zip: v })} placeholder="77493" /></Field>
                </FieldGrid>
              ) : null}

              {method === "check" || method === "money" || method === "cash" ? (
                <FieldGrid>
                  <Field label="Check or reference no."><Input value={ref.number} onChange={(v) => setRef({ ...ref, number: v })} placeholder="e.g. 2841" /></Field>
                  <Field label="Received on"><Input value={ref.received} onChange={(v) => setRef({ ...ref, received: v })} placeholder="e.g. Apr 08, 2026" /></Field>
                </FieldGrid>
              ) : null}

              <div style={{ background: color.surfaceMuted, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 8 }}>
                {[
                  ["Payment", `$${amt.toFixed(2)}`],
                  [method === "card" ? "Processor fee (2.95%)" : "Processor fee", `$${fee.toFixed(2)}`],
                ].map(([l, v]) => (
                  <span key={l} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 15 }}>
                    <span style={{ color: color.inkSecondary }}>{l}</span>
                    <Mono size={14}>{v}</Mono>
                  </span>
                ))}
                <span style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 16, fontWeight: 600, borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 8 }}>
                  <span>Total charged</span>
                  <Mono size={15}>{`$${(amt + fee).toFixed(2)}`}</Mono>
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 14, color: color.inkSecondary }}>Authorization &amp; receipt</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Chip on={flags.authorized} onClick={() => setFlags({ ...flags, authorized: !flags.authorized })}>Owner authorized by phone</Chip>
                  <Chip on={flags.recorded} onClick={() => setFlags({ ...flags, recorded: !flags.recorded })}>Call recorded</Chip>
                  <Chip on={flags.emailReceipt} onClick={() => setFlags({ ...flags, emailReceipt: !flags.emailReceipt })}>Email receipt</Chip>
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: color.inkQuaternary }}>
                  {method === "card"
                    ? "Card-not-present payments need the owner's verbal authorization on the call. It's stamped with your name and the time."
                    : "Log who handed over the check or cash and when it was received."}
                </span>
              </div>

              {error ? <ErrorLine>{error}</ErrorLine> : null}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Primary onClick={process}>{method === "card" ? `Charge $${(amt + fee).toFixed(2)}` : "Post payment"}</Primary>
                <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                  Card details are never stored — the processor returns a token and the last four.
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Tiles min={180}>
        {AGING.map((a) => <Tile key={a.label} label={a.label} value={a.amount} />)}
      </Tiles>

      <Card>
        <CardHead title="Delinquent accounts" meta="Collection ladder follows the recorded policy" />
        {s.delinquents.map((d) => {
          const menu = buildActionMenu(DELINQ_STEPS, d.stage, d.id, `${d.owner} · ${d.address}`, pending, setPending);
          return (
            <React.Fragment key={d.id}>
              <Row>
                <RowMain label={d.owner} detail={d.address} />
                <Mono size={15}>{d.balance}</Mono>
                <Status tone={d.stage.startsWith("90") || d.stage === "Lien filed" ? "critical" : "attention"}>{d.stage}</Status>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel}
                  onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setDelinquents((prev) => prev.map((x) => x.id === d.id ? { ...x, stage: next } : x));
                    setPending(null);
                    s.audit(`${next} — ${d.owner} (${d.balance})`);
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>

      <Card>
        <CardHead title="Recent payments" />
        {s.payments.slice(0, 8).map((p) => (
          <Row key={p.id}>
            <Mono size={13} style={{ color: color.neutral }}>{p.date}</Mono>
            <span style={{ fontSize: 15 }}>{p.label}</span>
            <Mono size={14}>{p.amount}</Mono>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="Budget vs actual · YTD" />
        {BUDGET.map((b) => (
          <Row key={b.label}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{b.label}</span>
            <Mono size={14} style={{ color: color.inkTertiary }}>{b.budget}</Mono>
            <Mono size={14}>{b.actual}</Mono>
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{b.note}</span>
          </Row>
        ))}
      </Card>
    </>
  );
}
