"use client";

import React, { useState } from "react";
import { SENT_HISTORY } from "@/lib/admin-portal/fixtures";
import {
  replyToResidentThread, setResidentThreadStatus,
} from "@/lib/admin-portal/message-actions";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import {
  Area, Card, CardHead, Chip, Empty, ErrorLine, Field, Input, Mono, PageTitle,
  Primary, Row, RowMain, Status, TextButton,
} from "../ui";

const THREAD_FILTERS = ["All", "Awaiting reply", "Open", "Closed"];

/** Two-pane resident inbox: threads left, conversation + reply right. */
function ResidentInbox() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const q = query.trim().toLowerCase();
  const visible = s.residentThreads.filter((t) => {
    if (filter === "Awaiting reply" && !t.awaitingReply) return false;
    if (filter === "Open" && t.status !== "Open") return false;
    if (filter === "Closed" && t.status !== "Closed") return false;
    if (!q) return true;
    return (
      t.subject.toLowerCase().includes(q) ||
      t.resident.toLowerCase().includes(q) ||
      t.messages.some((m) => m.body.toLowerCase().includes(q))
    );
  });

  const thread =
    s.residentThreads.find((t) => t.id === threadId) ?? visible[0] ?? null;
  const waiting = s.residentThreads.filter((t) => t.awaitingReply).length;

  async function send() {
    if (!thread) return;
    setError("");
    setSending(true);
    const res = await replyToResidentThread({ threadId: thread.id, body: reply });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setReply("");
    s.setResidentThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id
          ? { ...t, status: "Open", awaitingReply: false, date: res.message.time, messages: [...t.messages, res.message] }
          : t,
      ),
    );
  }

  async function setStatus(status: "Open" | "Closed") {
    if (!thread) return;
    setError("");
    const res = await setResidentThreadStatus({ threadId: thread.id, status });
    if (!res.ok) return setError(res.error);
    s.setResidentThreads((prev) =>
      prev.map((t) => (t.id === thread.id ? { ...t, status, awaitingReply: status === "Open" ? t.awaitingReply : false } : t)),
    );
  }

  return (
    <Card>
      <CardHead
        title="Resident messages"
        meta={waiting ? `${waiting} awaiting a reply` : "Every conversation answered"}
      />
      <div style={{ padding: `16px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={query}
          placeholder="Search residents or messages…"
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: "1 1 200px", font: "inherit", fontSize: 15, color: color.ink,
            background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
            borderRadius: 10, padding: "11px 14px",
          }}
        />
        {THREAD_FILTERS.map((f) => (
          <Chip key={f} size="sm" on={f === filter} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0, borderRight: `1px solid ${color.hairlineSoft}` }}>
          {visible.length === 0 ? (
            <Empty>
              {s.residentThreads.length === 0
                ? "No resident conversations yet. New messages from the portal land here."
                : "Nothing matches that."}
            </Empty>
          ) : (
            visible.map((t) => {
              const active = thread?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setThreadId(t.id); setError(""); }}
                  style={{
                    display: "grid", gap: 3, width: "100%", textAlign: "left", font: "inherit",
                    border: "none", borderBottom: `1px solid ${color.hairlineSoft}`,
                    borderLeft: `3px solid ${t.awaitingReply ? "oklch(0.55 0.06 155)" : "transparent"}`,
                    background: active ? "oklch(0.96 0.012 148)" : color.surface,
                    padding: "14px 16px", cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, color: color.inkTertiary }}>{t.resident} → {t.party}</span>
                    <Mono size={12} style={{ color: color.inkQuaternary }}>{t.date}</Mono>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: t.awaitingReply ? 600 : 500 }}>{t.subject}</span>
                  <span style={{ fontSize: 13, color: color.inkQuaternary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.messages[t.messages.length - 1]?.body}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div style={{ flex: "2 1 340px", minWidth: 0, display: "grid", alignContent: "start" }}>
          {!thread ? (
            <Empty>Select a conversation.</Empty>
          ) : (
            <>
              <CardHead title={thread.subject} meta={`${thread.resident} · ${thread.messages.length} message${thread.messages.length === 1 ? "" : "s"} · ${thread.date}`}>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Status tone={thread.status === "Open" ? "positive" : "neutral"}>{thread.status}</Status>
                  <TextButton tone="muted" onClick={() => setStatus(thread.status === "Open" ? "Closed" : "Open")}>
                    {thread.status === "Open" ? "Close thread" : "Reopen"}
                  </TextButton>
                </span>
              </CardHead>
              <div style={{ padding: pad.card, display: "grid", gap: 14 }}>
                {thread.messages.map((m) => (
                  <div key={m.id} style={{ display: "grid", gap: 4, justifyItems: m.fromStaff ? "end" : "start" }}>
                    <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: m.fromStaff ? "oklch(0.4 0.05 155)" : color.inkSecondary }}>
                        {m.from}
                      </span>
                      <Mono size={11} style={{ color: color.inkQuaternary }}>{m.time}</Mono>
                    </span>
                    <div
                      style={{
                        maxWidth: "min(520px, 100%)",
                        background: m.fromStaff ? color.accentTint : color.surfaceSunken,
                        border: `1px solid ${m.fromStaff ? color.accentTintBorder : "oklch(0.92 0.008 140)"}`,
                        borderRadius: radius.xl, padding: "12px 16px",
                        fontSize: 15, lineHeight: 1.55,
                      }}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: pad.card, borderTop: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 10 }}>
                <Area value={reply} onChange={setReply} rows={2} placeholder={`Reply to ${thread.resident}…`} />
                {error ? <ErrorLine>{error}</ErrorLine> : null}
                <Primary onClick={send} style={{ justifySelf: "start", padding: "10px 22px" }}>
                  {sending ? "Sending…" : "Send reply"}
                </Primary>
                <span style={{ fontFamily: font.mono, fontSize: 11, color: color.inkQuaternary }}>
                  Replies appear in the resident&rsquo;s portal immediately and flag their Messages badge.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Communications() {
  const s = useStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [channels, setChannels] = useState({ email: true, sms: false, portal: true });
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [history, setHistory] = useState(SENT_HISTORY);

  const audiences = [
    { id: "all", label: "All communities", count: 676 },
    ...s.communities.map((c) => ({ id: c.id, label: c.name, count: parseInt(c.doors, 10) || 0 })),
    { id: "delinquent", label: "Delinquent accounts", count: s.delinquents.length },
    { id: "board", label: "Board members", count: s.directors.length },
  ];

  function send() {
    if (!subject.trim()) return setError("Give the announcement a subject.");
    if (!body.trim()) return setError("Write the message.");
    const active = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
    if (active.length === 0) return setError("Pick at least one channel.");
    const a = audiences.find((x) => x.id === audience)!;
    const labels: Record<string, string> = { email: "email", sms: "SMS", portal: "portal" };
    setSent(`\u201C${subject.trim()}\u201D sent to ${a.label.toLowerCase()} by ${active.map((k) => labels[k]).join(", ")}.`);
    setHistory((prev) => [
      { date: "Today", subject: subject.trim(), meta: `${a.label} · ${active.map((k) => labels[k]).join(" + ")} · ${a.count} recipients` },
      ...prev,
    ]);
    s.audit(`Sent announcement \u201C${subject.trim()}\u201D to ${a.label.toLowerCase()}`);
    setSubject(""); setBody(""); setError("");
  }

  return (
    <>
      <PageTitle title="Communications" lede="Resident conversations, and announcements to owners by email, text and the portal." />
      <ResidentInbox />
      <Card>
        <CardHead title="New announcement" />
        <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 760 }}>
          <Field label="Subject"><Input value={subject} onChange={setSubject} placeholder="e.g. Water shut-off Thursday" /></Field>
          <Field label="Message"><Area value={body} onChange={setBody} rows={4} placeholder="Plain language. Lead with what changes and when." /></Field>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Audience</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {audiences.map((a) => (
                <Chip key={a.id} on={audience === a.id} onClick={() => setAudience(a.id)}>{a.label} · {a.count}</Chip>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Channels</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip on={channels.email} onClick={() => setChannels({ ...channels, email: !channels.email })}>Email</Chip>
              <Chip on={channels.sms} onClick={() => setChannels({ ...channels, sms: !channels.sms })}>Text message</Chip>
              <Chip on={channels.portal} onClick={() => setChannels({ ...channels, portal: !channels.portal })}>Portal notice</Chip>
            </div>
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Text messages reach only residents who have opted in.
            </span>
          </div>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          {sent ? <p style={{ fontSize: 14, color: color.accent }}>{sent}</p> : null}
          <Primary onClick={send} style={{ justifySelf: "start" }}>Send announcement</Primary>
        </div>
      </Card>

      <Card>
        <CardHead title="Sent history" />
        {history.map((h, i) => (
          <Row key={i}>
            <Mono size={13} style={{ color: color.neutral }}>{h.date}</Mono>
            <RowMain label={h.subject} detail={h.meta} />
          </Row>
        ))}
      </Card>
    </>
  );
}
