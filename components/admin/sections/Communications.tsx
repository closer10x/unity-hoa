"use client";

import React, { useState } from "react";
import { SENT_HISTORY } from "@/lib/admin-portal/fixtures";
import {
  replyToResidentThread, setResidentThreadStatus,
} from "@/lib/admin-portal/message-actions";
import {
  createArcFromMessage, createBookingFromMessage, createViolationFromMessage,
  createWorkOrderFromMessage, getThreadResidentContext,
  type ThreadResidentContext,
} from "@/lib/admin-portal/thread-create-actions";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import {
  Area, Card, CardHead, Chip, DateInput, Empty, ErrorLine, Field, FieldGrid,
  Input, Mono, PageTitle, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const THREAD_FILTERS = ["All", "Awaiting reply", "Open", "Closed"];

const CREATE_KINDS = [
  { id: "work", label: "Work order" },
  { id: "violation", label: "Violation" },
  { id: "arc", label: "ARC request" },
  { id: "booking", label: "Booking" },
] as const;
type CreateKind = (typeof CREATE_KINDS)[number]["id"];

const AMENITIES = ["Great Hall", "Pool cabana 1", "Pool cabana 2", "Clubhouse Annex", "Tennis court"];

/** Two-pane resident inbox: threads left, conversation + reply right. */
function ResidentInbox() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  /* Create-from-message: which message is open, the resident's autofill
     context, and the fields for whichever record kind is picked. */
  const [createMsgId, setCreateMsgId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ThreadResidentContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [kind, setKind] = useState<CreateKind>("work");
  const [cTitle, setCTitle] = useState("");
  const [cPriority, setCPriority] = useState("normal");
  const [cVioType, setCVioType] = useState("");
  const [cCureDays, setCCureDays] = useState("14");
  const [cAmenity, setCAmenity] = useState(AMENITIES[0]);
  const [cDate, setCDate] = useState("");
  const [cEvent, setCEvent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createNote, setCreateNote] = useState<{ text: string; view: string } | null>(null);

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

  async function openCreate(m: { id: string; body: string }) {
    if (!thread) return;
    if (createMsgId === m.id) { setCreateMsgId(null); return; }
    setCreateMsgId(m.id);
    setKind("work");
    setCreateError("");
    setCreateNote(null);
    setCTitle(thread.subject === "(no subject)" ? "" : thread.subject);
    if (!ctx) {
      setCtxLoading(true);
      const res = await getThreadResidentContext(thread.id);
      setCtxLoading(false);
      if (res.ok) setCtx(res.context);
      else setCreateError(res.error);
    }
  }

  async function runCreate(message: string) {
    if (!thread || !ctx || creating) return;
    setCreating(true);
    setCreateError("");
    setCreateNote(null);
    const base = { threadId: thread.id, residentName: ctx.residentName, address: ctx.address, message };
    const where = [ctx.address, ctx.lotLabel].filter(Boolean).join(" · ") || ctx.residentName;
    if (kind === "work") {
      const res = await createWorkOrderFromMessage({ ...base, title: cTitle, priority: cPriority });
      if (!res.ok) setCreateError(res.error);
      else {
        s.setWork((prev) => [res.work, ...prev]);
        s.audit(`Created work order ${res.work.ref} from ${ctx.residentName}'s message`);
        setCreateNote({ text: `Work order ${res.work.ref} created for ${where}.`, view: "work" });
      }
    } else if (kind === "violation") {
      const res = await createViolationFromMessage({
        ...base, violationType: cVioType, cureDays: parseInt(cCureDays, 10) || 0,
      });
      if (!res.ok) setCreateError(res.error);
      else {
        s.setViolations((prev) => [res.violation, ...prev]);
        s.audit(`Reported violation at ${ctx.address} from ${ctx.residentName}'s message`);
        setCreateNote({ text: `Violation reported at ${where}.`, view: "violations" });
      }
    } else if (kind === "arc") {
      const res = await createArcFromMessage({ ...base, title: cTitle });
      if (!res.ok) setCreateError(res.error);
      else {
        s.setArcApps((prev) => [res.arc, ...prev]);
        s.audit(`Opened ARC request ${res.arc.ref} for ${ctx.residentName}`);
        setCreateNote({ text: `ARC request ${res.arc.ref} opened for ${where}.`, view: "arc" });
      }
    } else {
      const res = await createBookingFromMessage({
        threadId: thread.id, residentName: ctx.residentName,
        amenity: cAmenity, date: cDate, eventType: cEvent,
      });
      if (!res.ok) setCreateError(res.error);
      else {
        s.setBookings((prev) => [res.booking, ...prev]);
        s.audit(`Requested ${cAmenity} booking for ${ctx.residentName} from their message`);
        setCreateNote({ text: `${cAmenity} requested for ${ctx.residentName} on ${res.booking.date}.`, view: "bookings" });
      }
    }
    setCreating(false);
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
                  onClick={() => {
                    setThreadId(t.id); setError("");
                    setCtx(null); setCreateMsgId(null); setCreateNote(null); setCreateError("");
                  }}
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
                      {!m.fromStaff ? (
                        <TextButton tone="muted" onClick={() => openCreate(m)}>
                          {createMsgId === m.id ? "Close" : "Create from this…"}
                        </TextButton>
                      ) : null}
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

                    {createMsgId === m.id ? (
                      <div style={{
                        justifySelf: "stretch", maxWidth: "min(560px, 100%)",
                        background: color.surface, border: `1px solid ${color.accentTintBorder}`,
                        borderRadius: radius.lg, padding: 18, display: "grid", gap: 14,
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>Create from this message</span>
                        {ctxLoading ? (
                          <span style={{ fontSize: 14, color: color.inkTertiary }}>Looking up the resident&rsquo;s lot…</span>
                        ) : ctx ? (
                          <Mono size={12} style={{ color: color.inkTertiary }}>
                            {[ctx.residentName, ctx.address || "no lot on file", ctx.lotLabel]
                              .filter(Boolean)
                              .join(" · ")}
                          </Mono>
                        ) : null}

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {CREATE_KINDS.map((k) => (
                            <Chip key={k.id} size="sm" on={kind === k.id}
                              onClick={() => { setKind(k.id); setCreateError(""); setCreateNote(null); }}>
                              {k.label}
                            </Chip>
                          ))}
                        </div>

                        {kind === "work" ? (
                          <FieldGrid>
                            <Field label="Title"><Input value={cTitle} onChange={setCTitle} placeholder="What needs doing" /></Field>
                            <Field label="Priority">
                              <Select value={cPriority} onChange={setCPriority} options={[
                                { id: "normal", label: "Routine" },
                                { id: "high", label: "Urgent" },
                                { id: "urgent", label: "Emergency" },
                              ]} />
                            </Field>
                          </FieldGrid>
                        ) : kind === "violation" ? (
                          <FieldGrid>
                            <Field label="Violation type"><Input value={cVioType} onChange={setCVioType} placeholder="e.g. Trash cans left out" /></Field>
                            <Field label="Cure period">
                              <Select value={cCureDays} onChange={setCCureDays} options={[
                                { id: "7", label: "7 days" }, { id: "14", label: "14 days" }, { id: "30", label: "30 days" },
                              ]} />
                            </Field>
                          </FieldGrid>
                        ) : kind === "arc" ? (
                          <Field label="Application title"><Input value={cTitle} onChange={setCTitle} placeholder="e.g. Backyard fence replacement" /></Field>
                        ) : (
                          <FieldGrid>
                            <Field label="Amenity">
                              <Select value={cAmenity} onChange={setCAmenity} options={AMENITIES.map((a) => ({ id: a, label: a }))} />
                            </Field>
                            <Field label="Date"><DateInput value={cDate} onChange={setCDate} /></Field>
                            <Field label="Event (optional)"><Input value={cEvent} onChange={setCEvent} placeholder="e.g. Birthday party" /></Field>
                          </FieldGrid>
                        )}

                        <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                          The resident&rsquo;s name{kind === "booking" ? "" : ", their lot address"} and this
                          message carry over automatically.
                        </span>
                        {createError ? <ErrorLine>{createError}</ErrorLine> : null}
                        {createNote ? (
                          <span style={{ fontSize: 14, color: color.accent, display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                            {createNote.text}
                            <TextButton onClick={() => s.setView(createNote.view)}>
                              Open the section
                            </TextButton>
                          </span>
                        ) : (
                          <Primary onClick={() => runCreate(m.body)}
                            style={{ justifySelf: "start", padding: "9px 18px", opacity: creating || ctxLoading || !ctx ? 0.6 : 1 }}>
                            {creating ? "Creating…"
                              : kind === "work" ? "Create the work order"
                                : kind === "violation" ? "Report the violation"
                                  : kind === "arc" ? "Open the ARC request"
                                    : "Request the booking"}
                          </Primary>
                        )}
                      </div>
                    ) : null}
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
