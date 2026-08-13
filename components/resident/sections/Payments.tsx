"use client";

import React, { useState } from "react";

import { useResident } from "@/lib/resident-portal/store";
import {
  Card, CardHead, Empty, ErrorLine, Field, FieldRow, ListRow, PAGE, Pill,
  StatCard, StatRow, inputCls, primaryBtn, quietBtn, useNarrowerThan,
} from "../ui";

const CARD_FEE_RATE = 0.0295;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function Payments() {
  const s = useResident();
  const p = s.property;
  /* Measured against the card the ledger sits in, not the viewport: the four
     tracks below need about 470px, and the rail leaves an iPad's main column
     less than that long before the phone breakpoint would fire. */
  const ledgerRef = React.useRef<HTMLDivElement>(null);
  const narrow = useNarrowerThan(ledgerRef, 470);

  const [choice, setChoice] = useState("full");
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("ach");
  const [error, setError] = useState("");

  const baseCents =
    choice === "custom" ? Math.round(parseFloat(custom || "0") * 100) : p.balanceCents ?? 0;
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
    <div className={PAGE} style={{ paddingInline: 0, paddingTop: 0 }}>
      <StatRow>
        <StatCard
          tone="ink"
          label={p.overdue ? "Past due" : "Balance due"}
          value={p.balance || "—"}
          note={
            p.balanceCents == null
              ? "No billing on file yet"
              : p.overdue
                ? `Was due ${p.due}`
                : p.due
                  ? `Due ${p.due}`
                  : "Due date to be announced"
          }
        />
        <StatCard
          label="HOA fee"
          value={p.balance || "—"}
          note={p.cadence ? `${p.cadence} billing` : "Schedule not set yet"}
        />
        <StatCard
          label="Autopay"
          value={s.autopay ? "On" : "Off"}
          note={
            s.autopay
              ? "Drafts three days before each due date"
              : "You get an email reminder ten days before"
          }
          action={
            <button type="button" className={quietBtn} onClick={() => s.setAutopay(!s.autopay)}>
              {s.autopay ? "Turn autopay off →" : "Turn autopay on →"}
            </button>
          }
        />
      </StatRow>

      <Card className="px-[clamp(18px,3vw,30px)] py-7">
        <CardHead title="Make a payment" />
        <div className="mt-4 grid gap-[18px]">
          <FieldRow>
            <Field label="Amount">
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className={inputCls}
              >
                <option value="full">
                  {p.balance ? `Full HOA fee — ${p.balance}` : "Full HOA fee"}
                </option>
                <option value="custom">Another amount</option>
              </select>
            </Field>
            {choice === "custom" ? (
              <Field label="Custom amount" hint="Dollars and cents, e.g. 285.00">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className={inputCls}
                />
              </Field>
            ) : null}
            <Field label="Method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputCls}
              >
                <option value="ach">Bank transfer — no fee</option>
                <option value="card">Card — 2.95% processor fee</option>
              </select>
            </Field>
          </FieldRow>

          <div className="grid gap-1.5">
            {method === "card" && baseCents > 0 ? (
              <span className="text-[14px] font-semibold text-[#8A6A2F]">
                {usd(baseCents / 100)} + {usd(feeCents / 100)} card fee ={" "}
                {usd(totalCents / 100)}
              </span>
            ) : null}
            <span className="text-[13px] leading-[1.55] text-faint">
              Card payments carry a 2.95% processor fee. Bank transfers and checks carry
              none. You&rsquo;ll confirm on the secure payment page before anything is charged.
            </span>
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <button type="button" onClick={payNow} className={`${primaryBtn} justify-self-start`}>
            Continue to secure payment
          </button>
        </div>
      </Card>

      <Card className="px-[clamp(18px,3vw,30px)] py-7">
        <CardHead title="Account ledger" />
        {s.ledger.length === 0 ? (
          <Empty>
            Nothing on your ledger yet. HOA fee postings and payments appear here as they
            happen.
          </Empty>
        ) : (
          <div ref={ledgerRef}>
            {/* Four columns where there is room; the head goes once they
                stack, because a column head over stacked rows is a lie.

                This was two Tailwind breakpoints — the house rule is one JS
                breakpoint and no media queries — and the narrow arm dropped
                the running balance, which is the second thing a homeowner
                reads a ledger for. It now says it in words instead. */}
            {narrow ? (
              s.ledger.map((l, i, arr) => (
                <div
                  key={l.id}
                  className={
                    "grid gap-1 py-4 text-[15px] " +
                    (i < arr.length - 1 ? "border-b border-line" : "")
                  }
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 text-ink">{l.label}</span>
                    <span
                      className={`shrink-0 font-semibold ${l.credit ? "text-moss" : "text-body"}`}
                    >
                      {l.amount}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-[13px] text-faint">
                    <span>{l.date}</span>
                    <span>Balance {l.balance}</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="mt-4 grid grid-cols-[110px_minmax(0,1fr)_120px_120px] gap-[18px] border-b border-ink py-3 text-xs font-bold tracking-[0.06em] text-faint uppercase">
                  <span>Date</span>
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Balance</span>
                </div>
                {s.ledger.map((l, i, arr) => (
                  <div
                    key={l.id}
                    className={
                      "grid grid-cols-[110px_minmax(0,1fr)_120px_120px] gap-[18px] py-4 text-[15px] " +
                      (i < arr.length - 1 ? "border-b border-line" : "")
                    }
                  >
                    <span className="text-faint">{l.date}</span>
                    <span className="min-w-0 text-ink">{l.label}</span>
                    <span
                      className={`text-right font-semibold ${l.credit ? "text-moss" : "text-body"}`}
                    >
                      {l.amount}
                    </span>
                    <span className="text-right text-muted">{l.balance}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="px-[clamp(18px,3vw,30px)] py-7">
        <CardHead title="Portal payments" />
        {s.payments.length === 0 ? (
          <Empty>
            No portal payments yet. Anything you pay here is listed with its receipt.
          </Empty>
        ) : (
          s.payments.map((r, i, arr) => (
            <ListRow key={r.id} last={i === arr.length - 1}>
              <span className="flex min-w-0 flex-[1_1_200px] items-baseline gap-4">
                <span className="w-[74px] shrink-0 text-sm text-faint">{r.date}</span>
                <span className="min-w-0 text-[15px] text-body">{r.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-[15px] font-semibold text-ink">{r.amount}</span>
                <Pill tone={r.status === "paid" ? "moss" : r.status === "failed" ? "rose" : "amber"}>
                  {r.status}
                </Pill>
              </span>
            </ListRow>
          ))
        )}
      </Card>
    </div>
  );
}
