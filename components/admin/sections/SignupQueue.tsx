"use client";

import React, { useState } from "react";

import {
  approveResidentSignup, declineResidentSignup,
} from "@/lib/admin-portal/signup-actions";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import type { ResidentSignup } from "@/lib/admin-portal/types";

import {
  Area, Card, CardHead, Chevron, CopyLine, ErrorLine, Mono, Primary, Tag,
  TextButton,
} from "../ui";

/**
 * Sign-up requests from the public form, waiting on the office.
 *
 * It sits at the top of Owners because that is where the office already goes
 * to ask "who lives here?", and because approving one *is* an Owners edit —
 * it links a household to a home and opens their portal account.
 *
 * The card is here even with an empty queue: it carries the link the office
 * hands out, and a form nobody can find is a form nobody fills in.
 *
 * Nothing about a request is a record. Until somebody presses Approve the
 * home has no owner, the email has no account, and the row is only what a
 * stranger typed — which is why the address they picked is shown against the
 * roster and flagged when that home already has somebody on it.
 */
export function SignupQueue() {
  const s = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function approve(r: ResidentSignup) {
    if (busy) return;
    setBusy(r.id);
    setError("");
    setNote("");
    const res = await approveResidentSignup(r.id);
    setBusy(null);
    setApproving(null);
    if (!res.ok) return setError(res.error);
    s.setSignups(res.signups);
    setNote(res.note);
    s.audit(`Approved the sign-up request from ${r.name} for ${r.home}`);
  }

  async function decline(r: ResidentSignup) {
    if (busy) return;
    setBusy(r.id);
    setError("");
    setNote("");
    const res = await declineResidentSignup(r.id, reason);
    setBusy(null);
    setDeclining(null);
    setReason("");
    if (!res.ok) return setError(res.error);
    s.setSignups(res.signups);
    setNote(res.note);
    s.audit(`Declined the sign-up request from ${r.name}${reason.trim() ? ` — ${reason.trim()}` : ""}`);
  }

  const waiting = s.signups.length;

  /* Open when there is something to decide, shut when there is not: with an
     empty queue this card is only the link, and it should not push the roster
     down the page every day to say so. The count stays in the header either
     way, so collapsing never hides work. */
  const [open, setOpen] = useState(waiting > 0);

  return (
    <Card>
      <CardHead
        title="Sign-up requests"
        meta={
          waiting
            ? `${waiting} waiting · nothing is linked until you approve it`
            : "Nothing waiting. Hand this link to a household and their request lands here."
        }
      >
        <Chevron open={open} onToggle={() => setOpen((v) => !v)} label="sign-up requests" />
      </CardHead>
      {!open ? null : (
      <>

      <div style={{ padding: `4px ${pad.card} ${waiting ? 4 : 20}px` }}>
        {s.joinUrl ? (
          <CopyLine
            value={s.joinUrl}
            note="The public sign-up form — safe to put on a letter, a door hanger or the website. It grants nothing on its own."
          />
        ) : null}
      </div>

      {error ? (
        <div style={{ padding: `12px ${pad.card}` }}><ErrorLine>{error}</ErrorLine></div>
      ) : null}
      {note ? (
        <div style={{ padding: `12px ${pad.card}`, fontSize: 14, lineHeight: 1.55, color: color.inkSecondary }}>
          {note}
        </div>
      ) : null}

      {s.signups.map((r) => (
        <div
          key={r.id}
          style={{
            padding: `16px ${pad.card}`,
            borderTop: `1px solid ${color.hairlineSoft}`,
            display: "grid", gap: 10, minWidth: 0,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", alignItems: "baseline", minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: color.ink }}>{r.name}</span>
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{r.email}</span>
            <Mono size={12} style={{ color: color.neutral }}>{r.phone}</Mono>
            <span style={{ marginLeft: "auto" }}>
              <Mono size={12} style={{ color: color.inkQuaternary }}>{r.at}</Mono>
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }}>
            <span style={{ fontSize: 15, color: color.ink }}>{r.home}</span>
            {r.homeTaken ? (
              <Tag tone="amber">Already has an owner</Tag>
            ) : null}
            {r.smsOptIn ? <Tag tone="moss">Wants texts</Tag> : null}
          </div>

          {r.note ? (
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.55, color: color.inkSecondary,
              background: color.surfaceSunken, border: `1px solid ${color.hairlineSoft}`,
              borderRadius: radius.sm, padding: "10px 12px",
            }}>
              {r.note}
            </p>
          ) : null}

          {approving === r.id ? (
            <div style={{
              display: "grid", gap: 12,
              background: color.accentTint, borderRadius: radius.lg, padding: 16,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: color.inkSecondary }}>
                Link {r.name} to {r.home} and open their portal account?
                {r.homeTaken
                  ? " That home is already linked to another account, and approving replaces it — check the deed first."
                  : ""}{" "}
                They get an email with a one-time link to choose their own password.
                {r.smsOptIn ? " Their text-message consent is recorded with the account." : ""}
              </span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Primary onClick={() => approve(r)} style={busy === r.id ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
                  {busy === r.id ? "Approving…" : "Yes, approve and send the link"}
                </Primary>
                <TextButton tone="muted" onClick={() => setApproving(null)}>Cancel</TextButton>
              </div>
            </div>
          ) : declining === r.id ? (
            <div style={{
              display: "grid", gap: 12,
              background: color.surfaceSunken, border: `1px solid ${color.hairline}`,
              borderRadius: radius.lg, padding: 16,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: color.inkSecondary }}>
                Close this request without linking anything? Nothing is sent to
                them — if they should hear why, call or email. The reason below
                goes in the audit trail.
              </span>
              <Area value={reason} onChange={setReason} rows={2}
                placeholder="e.g. not the owner of record — tenant, referred to the landlord" />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Primary onClick={() => decline(r)} style={busy === r.id ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
                  {busy === r.id ? "Closing…" : "Yes, close this request"}
                </Primary>
                <TextButton tone="muted" onClick={() => { setDeclining(null); setReason(""); }}>Cancel</TextButton>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <Primary
                onClick={() => { setError(""); setNote(""); setDeclining(null); setApproving(r.id); }}
                style={{ fontFamily: font.sans }}
              >
                Approve
              </Primary>
              <TextButton
                tone="destructive"
                onClick={() => { setError(""); setNote(""); setApproving(null); setDeclining(r.id); }}
              >
                Decline
              </TextButton>
            </div>
          )}
        </div>
      ))}
      </>
      )}
    </Card>
  );
}
