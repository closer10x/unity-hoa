"use client";

import React, { useState } from "react";
import { ARC_STEPS } from "@/lib/admin-portal/actions";
import { addArcMessage, setArcStatus } from "@/lib/admin-portal/compliance-actions";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color, pad, radius } from "@/lib/admin-portal/tokens";
import type { ArcStatus, PendingConfirm } from "@/lib/admin-portal/types";
import {
  ActionSelect, Area, Card, Chip, ConfirmBar, Empty, ErrorLine, Eyebrow, Mono,
  PageTitle, Primary, Status,
} from "../ui";

/* Mirrors the audience column on arc_messages — an internal note must never
   reach the owner. */
type Target = "owner" | "committee" | "internal";

export default function Architectural() {
  const s = useStore();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [openThread, setOpenThread] = useState("");
  const [target, setTarget] = useState<Target>("owner");
  const [draft, setDraft] = useState("");
  const [flowError, setFlowError] = useState("");

  const targets: { id: Target; label: string; hint: string }[] = [
    { id: "owner", label: "Reply to owner", hint: "Copied to their portal and email." },
    { id: "committee", label: "Note to committee", hint: "Visible to committee members only." },
    { id: "internal", label: "Internal note", hint: "Staff only — never shown to the owner." },
  ];

  return (
    <>
      <PageTitle title="Architectural review" lede="Applications on the 30-day statutory clock. Decisions and correspondence stay on the case." />

      {flowError ? <Card><div style={{ padding: `12px ${pad.card}` }}><ErrorLine>{flowError}</ErrorLine></div></Card> : null}

      {s.arcApps.length === 0 ? (
        <Card><Empty>No architectural applications yet.</Empty></Card>
      ) : s.arcApps.map((a) => {
        const menu = buildActionMenu(ARC_STEPS, a.status, a.id, `${a.ref} · ${a.title}`, pending, setPending);
        const threadOpen = openThread === a.id;
        return (
          <Card key={a.id}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <span>
                  <Mono size={13} style={{ color: color.neutral }}>{a.ref}</Mono>
                  <span style={{ display: "block", fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em", marginTop: 4 }}>{a.title}</span>
                  <span style={{ display: "block", fontSize: 14, color: color.inkTertiary, marginTop: 3 }}>{a.owner} · submitted {a.submitted}</span>
                </span>
                <Status tone={a.status === "Awaiting decision" ? "attention" : a.status === "Denied" ? "critical" : "positive"}>{a.status}</Status>
              </div>

              {a.decisionNote ? (
                <p style={{ fontSize: 14, color: color.positive, marginBottom: 14 }}>{a.decisionNote}</p>
              ) : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: threadOpen ? 18 : 0 }}>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
                <button type="button" onClick={() => { setOpenThread(threadOpen ? "" : a.id); setDraft(""); }}
                  style={{ background: "none", border: "none", padding: "10px 2px", font: "inherit", fontSize: 14, color: "oklch(0.44 0.045 155)", cursor: "pointer" }}>
                  {threadOpen ? "Hide thread" : `Open thread (${a.thread.length})`}
                </button>
                <span style={{ fontSize: 14, color: color.inkQuaternary }}>{a.due}</span>
              </div>

              {threadOpen ? (
                <div style={{ borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 20, display: "grid", gap: 16 }}>
                  <Eyebrow>Case thread · {a.thread.length} messages</Eyebrow>
                  <div style={{ display: "grid", gap: 14 }}>
                    {a.thread.map((t, i) => (
                      <div key={i} style={{
                        justifySelf: t.mine ? "end" : "start", maxWidth: "82%",
                        background: t.mine ? color.accentTint : color.surfaceSunken,
                        border: `1px solid ${t.mine ? color.accentTintBorder : color.hairlineSoft}`,
                        borderRadius: radius.xl, padding: "14px 16px",
                      }}>
                        <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.mine ? "oklch(0.4 0.05 155)" : color.inkSecondary }}>{t.from}</span>
                          <Mono size={11} style={{ color: color.inkQuaternary, whiteSpace: "nowrap" }}>{t.time}</Mono>
                        </span>
                        <span style={{ display: "block", fontSize: 15, lineHeight: 1.6 }}>{t.body}</span>
                        {t.attachment ? (
                          <Mono size={12} style={{ display: "inline-block", marginTop: 10, color: "oklch(0.44 0.045 155)", border: `1px solid ${color.borderInput}`, borderRadius: 6, padding: "5px 9px", background: color.surface }}>
                            {t.attachment}
                          </Mono>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {targets.map((t) => (
                        <Chip key={t.id} size="sm" on={target === t.id} onClick={() => setTarget(t.id)}>{t.label}</Chip>
                      ))}
                    </div>
                    <Area value={draft} onChange={setDraft} placeholder="Ask the owner for more detail, or leave a note for the committee…" />
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <Primary style={{ padding: "11px 22px", fontSize: 14 }}
                        onClick={async () => {
                          const text = draft.trim();
                          if (!text) return;
                          setFlowError("");
                          const res = await addArcMessage({ applicationId: a.id, body: text, audience: target });
                          if (!res.ok) return setFlowError(res.error);
                          s.setArcApps((prev) => prev.map((x) => x.id === a.id
                            ? { ...x, thread: [...x.thread, res.message] }
                            : x));
                          setDraft("");
                        }}>
                        {target === "owner" ? "Send to owner" : target === "committee" ? "Post to committee" : "Save internal note"}
                      </Primary>
                      <span style={{ fontSize: 13, color: color.inkQuaternary }}>{targets.find((t) => t.id === target)!.hint}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {menu.confirming ? (
              <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                onConfirm={async () => {
                  const next = menu.nextValue! as ArcStatus;
                  const note = ARC_STEPS.find((x) => x.id === next)?.after ?? "Decision sent to the owner";
                  setPending(null);
                  setFlowError("");
                  const res = await setArcStatus({ id: a.id, status: next, decisionNote: note });
                  if (!res.ok) return setFlowError(res.error);
                  s.setArcApps((prev) => prev.map((x) => x.id === a.id
                    ? { ...x, status: res.status, decisionNote: res.decisionNote }
                    : x));
                }} />
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
