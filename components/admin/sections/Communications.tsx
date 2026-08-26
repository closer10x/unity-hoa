"use client";

import React, { useEffect, useState } from "react";
import {
  approveAnnouncement, countAnnouncementAudience, deleteAnnouncement, listAnnouncements,
  rejectAnnouncement, type SentAnnouncement, submitAnnouncement, unpublishAnnouncement,
  updateAnnouncement, uploadAnnouncementImage,
} from "@/lib/admin-portal/announcement-actions";
import {
  listMessageableResidents, replyToResidentThread, setResidentThreadStatus,
  startResidentThread,
} from "@/lib/admin-portal/message-actions";
import { getSmsSettings, setSmsEnabled } from "@/lib/admin-portal/sms-settings-actions";
import {
  createArcFromMessage, createBookingFromMessage, createViolationFromMessage,
  createWorkOrderFromMessage, getThreadResidentContext,
  type ThreadResidentContext,
} from "@/lib/admin-portal/thread-create-actions";
import { fileSize, uploadMessageAttachment } from "@/lib/messages/upload-attachment";
import {
  attachmentName, attachmentUrl, isImageAttachment,
} from "@/lib/supabase/message-files";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import {
  Area, Card, CardHead, Chip, ConfirmBar, DateInput, Empty, ErrorLine, Field, FieldGrid,
  Input, Mono, Primary, Row, RowMain, Select, Status, TextButton,
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

/** Paperclip — the attach mark, drawn in the same line style as the nav. */
function ClipMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ flex: "0 0 auto" }}>
      <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 1 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 1 1-2.4-2.4l7.9-7.9" />
    </svg>
  );
}

/** Arrow up — the send mark, drawn in the same line style as the nav. */
function SendMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ flex: "0 0 auto" }}>
      <path d="M12 19V6" />
      <path d="M6 12l6-6 6 6" />
    </svg>
  );
}

/** Two-pane resident inbox: threads left, conversation + reply right. */
function ResidentInbox() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  /* Chosen but not yet uploaded: the file goes to the bucket when the reply
     is sent, so picking one and then changing your mind costs nothing. */
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
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

  /* Start-a-conversation composer: the office writing to a resident first. */
  const [composeOpen, setComposeOpen] = useState(false);
  const [residents, setResidents] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [residentQuery, setResidentQuery] = useState("");
  const [toId, setToId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  function toggleCompose() {
    setStartError("");
    if (composeOpen) { setComposeOpen(false); return; }
    setComposeOpen(true);
    if (residents.length === 0) {
      listMessageableResidents().then((r) => { if (r.ok) setResidents(r.residents); });
    }
  }

  async function startThread() {
    if (starting) return;
    if (!toId) return setStartError("Pick a resident to write to.");
    if (!newSubject.trim()) return setStartError("Give the message a subject.");
    if (!newBody.trim()) return setStartError("Write the message.");
    setStarting(true);
    setStartError("");
    const res = await startResidentThread({ userId: toId, subject: newSubject, body: newBody });
    setStarting(false);
    if (!res.ok) return setStartError(res.error);
    s.setResidentThreads((prev) => [res.thread, ...prev]);
    setThreadId(res.thread.id);
    s.audit(`Messages: started “${newSubject.trim()}” with ${res.thread.resident}`);
    setComposeOpen(false);
    setToId(""); setNewSubject(""); setNewBody(""); setResidentQuery("");
  }

  const rq = residentQuery.trim().toLowerCase();
  const residentMatches = rq
    ? residents.filter((r) => r.name.toLowerCase().includes(rq) || (r.address ?? "").toLowerCase().includes(rq))
    : residents;

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
    if (!reply.trim() && !attachFile) return;
    setError("");
    setSending(true);

    /* Upload first, then write the message with the path on it. The other way
       round leaves a message pointing at a file that never arrived. */
    let attachmentPath: string | undefined;
    if (attachFile) {
      const up = await uploadMessageAttachment(attachFile, thread.id);
      if (!up.ok) {
        setSending(false);
        return setError(up.error);
      }
      attachmentPath = up.path;
    }

    const res = await replyToResidentThread({
      threadId: thread.id, body: reply, attachmentPath,
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setReply("");
    setAttachFile(null);
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
      >
        <TextButton onClick={toggleCompose}>
          {composeOpen ? "Close" : "New message"}
        </TextButton>
      </CardHead>

      {composeOpen ? (
        <div style={{ padding: pad.card, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 14, maxWidth: 720 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Start a conversation</span>
          <Field label="To" hint="Search residents by name or address.">
            <input
              type="text"
              value={residentQuery}
              placeholder="Search residents…"
              onChange={(e) => { setResidentQuery(e.target.value); setToId(""); }}
              style={{
                width: "100%", font: "inherit", fontSize: 16, color: color.ink,
                background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
                borderRadius: 10, padding: "11px 14px",
              }}
            />
          </Field>
          {toId ? (
            <Mono size={12} style={{ color: color.accent }}>
              To: {residents.find((r) => r.id === toId)?.name}
            </Mono>
          ) : (
            <div style={{ display: "grid", gap: 2, maxHeight: 200, overflowY: "auto", border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.md }}>
              {residents.length === 0 ? (
                <span style={{ padding: 12, fontSize: 13, color: color.inkQuaternary }}>
                  No resident accounts yet. Residents appear here once their portal accounts are set up.
                </span>
              ) : residentMatches.length === 0 ? (
                <span style={{ padding: 12, fontSize: 13, color: color.inkQuaternary }}>Nothing matches that.</span>
              ) : residentMatches.slice(0, 30).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setToId(r.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", gap: 12, width: "100%",
                    textAlign: "left", font: "inherit", border: "none", background: color.surface,
                    padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${color.hairlineSoft}`,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{r.name}</span>
                  {r.address ? <Mono size={12} style={{ color: color.inkQuaternary }}>{r.address}</Mono> : null}
                </button>
              ))}
            </div>
          )}
          <Field label="Subject"><Input value={newSubject} onChange={setNewSubject} placeholder="e.g. Your account is set up" /></Field>
          <Field label="Message"><Area value={newBody} onChange={setNewBody} rows={3} placeholder="Write to the resident…" /></Field>
          {startError ? <ErrorLine>{startError}</ErrorLine> : null}
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Primary onClick={startThread} style={{ justifySelf: "start", opacity: starting ? 0.6 : 1 }}>
              {starting ? "Sending…" : "Send message"}
            </Primary>
            <span style={{ fontFamily: font.mono, fontSize: 11, color: color.inkQuaternary }}>
              It lands in the resident’s portal as an unread conversation.
            </span>
          </span>
        </div>
      ) : null}

      <div style={{ padding: `16px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={query}
          placeholder="Search residents or messages…"
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: "1 1 200px", font: "inherit", fontSize: 16, color: color.ink,
            background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
            borderRadius: 10, padding: "11px 14px",
          }}
        />
        {THREAD_FILTERS.map((f) => (
          <Chip key={f} size="sm" on={f === filter} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>

      {/* Bounded, so picking a conversation scrolls that pane instead of
          growing the card and pushing the whole page down. Each side keeps
          its own scrollbar: the list below its head, the conversation
          between the head and the composer.

          Only above the breakpoint. Stacked on a phone these become two
          short windows one above the other, which is worse than the page
          simply being long. */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "stretch",
        ...(s.isMobile ? {} : { height: "clamp(440px, 66vh, 780px)" }),
      }}>
        <div style={{
          flex: "1 1 260px", minWidth: 0, borderRight: `1px solid ${color.hairlineSoft}`,
          display: "grid", gridTemplateRows: "auto 1fr", minHeight: 0,
          /* Take the container's height, not the content's. With flex-wrap the
             line sizes to its tallest item, so without this both panes grow to
             their full content and simply overflow the bounded box — and
             nothing scrolls. Resolves to auto on a phone, where the container
             has no fixed height. */
          height: "100%",
        }}>
          {/* Built to CardHead's shape on purpose — same padding, same 44px
              title row, same meta line beneath — so this column's title sits
              on the open thread's title and the first conversation sits on
              the first message. CardHead centres its title against whatever
              controls sit beside it, so a header carrying a status pill and a
              button holds its title 9px lower than one that carries nothing;
              matching the row height is what puts the two back on a line. */}
          <div style={{
            padding: `18px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`,
            display: "grid", gap: 3,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 16, minHeight: 44,
            }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Conversations</h2>
              <Mono size={12} style={{ color: color.inkQuaternary }}>
                {visible.length}
                {visible.length === s.residentThreads.length ? "" : ` of ${s.residentThreads.length}`}
              </Mono>
            </div>
            {/* Not the awaiting-reply count — the card's own head says that
                two inches above, and a screen that states the same fact twice
                reads as two facts. */}
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: color.inkTertiary }}>
              Newest first
            </span>
          </div>
          <div style={{ minHeight: 0, overflowY: "auto" }}>
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
                    background: active ? color.accentTint : color.surface,
                    /* pad.card, matching the head above and the conversation
                       beside it — a row indented to its own number put every
                       line in this column out of step with the rest. The 3px
                       unread rule is subtracted so text does not shift when a
                       thread is answered. */
                    padding: `14px ${pad.card}`,
                    paddingLeft: `calc(${pad.card} - 3px)`,
                    cursor: "pointer",
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
        </div>

        <div style={{
          flex: "2 1 340px", minWidth: 0, display: "grid", minHeight: 0,
          /* Head and composer take what they need; the conversation takes the
             rest and scrolls inside it. */
          gridTemplateRows: thread ? "auto 1fr auto" : "1fr",
          alignContent: thread ? "stretch" : "start",
          height: "100%",
        }}>
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
              {/* The conversation itself is sunken; the head above and the
                  composer below stay on the card's own white, so the two
                  panes share one header band and one footer band and only
                  the talking is set back. */}
              <div style={{
                padding: pad.card, display: "grid", gap: 14,
                background: color.surfaceSunken,
                borderBottom: `1px solid ${color.hairlineSoft}`,
                /* Scrolls on its own, between the head and the composer, so a
                   long conversation never moves the page around it. */
                minHeight: 0, overflowY: "auto", alignContent: "start",
              }}>
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
                        /* On the sunken ground the resident's own words are
                           the white card and the office's are the sage one —
                           the two sides are told apart by fill, not by a
                           hairline that reads as a box. */
                        background: m.fromStaff ? color.accentTint : color.surface,
                        border: `1px solid ${m.fromStaff ? color.accentTintBorder : color.hairlineSoft}`,
                        borderRadius: radius.xl, padding: "12px 16px",
                        fontSize: 15, lineHeight: 1.55,
                      }}
                    >
                      {m.body}
                    </div>
                    {/* Was the file's name as plain text — a resident could
                        send a photo of the broken gate and the office could
                        read what it was called. A photo shows; anything else
                        is a chip that downloads. */}
                    {m.attachment ? (
                      isImageAttachment(m.attachment) ? (
                        <a
                          href={attachmentUrl(m.id)}
                          target="_blank"
                          rel="noreferrer"
                          title={`${attachmentName(m.attachment)} — open full size`}
                          style={{ display: "block", lineHeight: 0 }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachmentUrl(m.id)}
                            alt={attachmentName(m.attachment)}
                            style={{
                              display: "block", maxWidth: "min(280px, 100%)", maxHeight: 280,
                              width: "auto", height: "auto",
                              borderRadius: radius.lg,
                              border: `1px solid ${color.hairlineSoft}`,
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={attachmentUrl(m.id, true)}
                          style={{
                            fontFamily: font.mono, fontSize: 12,
                            border: `1px solid ${color.borderInput}`,
                            background: color.surface,
                            borderRadius: 6, padding: "6px 10px",
                            color: color.inkSecondary, textDecoration: "none",
                          }}
                        >
                          {attachmentName(m.attachment)}
                        </a>
                      )
                    ) : null}

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
              <div style={{ padding: pad.card, display: "grid", gap: 10 }}>
                {/* Send sits in the box, at the end of the line being typed,
                    the way every messaging app puts it. The button carries no
                    label, so it carries an aria-label instead — and it is
                    disabled while empty rather than hidden, because a control
                    that vanishes reads as a bug when you are looking for it. */}
                <div style={{ position: "relative" }}>
                  <Area
                    value={reply}
                    onChange={setReply}
                    rows={2}
                    placeholder={`Reply to ${thread.resident}…`}
                    style={{ paddingRight: 96 }}
                    onKeyDown={(e) => {
                      /* Enter alone breaks the line — a reply to a resident is
                         often more than one. Cmd/Ctrl+Enter sends. */
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    onChange={(e) => {
                      setAttachFile(e.target.files?.[0] ?? null);
                      setError("");
                      // Cleared so choosing the same file twice still fires.
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={sending}
                    aria-label="Attach a file"
                    title="Attach a photo or file"
                    style={{
                      position: "absolute", right: 52, top: "50%", transform: "translateY(-50%)",
                      width: 34, height: 34, borderRadius: radius.pill,
                      display: "grid", placeItems: "center",
                      border: "none", padding: 0, background: "none",
                      color: attachFile ? color.accent : color.inkTertiary,
                      cursor: sending ? "default" : "pointer",
                    }}
                  >
                    <ClipMark />
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || (!reply.trim() && !attachFile)}
                    aria-label={sending ? "Sending reply" : "Send reply"}
                    title="Send reply (⌘↵)"
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      width: 34, height: 34, borderRadius: radius.pill,
                      display: "grid", placeItems: "center",
                      border: "none", padding: 0,
                      background:
                        (reply.trim() || attachFile) && !sending ? color.ink : color.hairline,
                      color: color.surface,
                      cursor: (reply.trim() || attachFile) && !sending ? "pointer" : "default",
                      transition: "background 120ms ease",
                    }}
                  >
                    <SendMark />
                  </button>
                </div>
                {attachFile ? (
                  <span style={{
                    justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 10,
                    background: color.surface, border: `1px solid ${color.borderInput}`,
                    borderRadius: radius.md, padding: "7px 8px 7px 12px",
                    fontFamily: font.mono, fontSize: 12, color: color.inkSecondary,
                  }}>
                    {attachFile.name} · {fileSize(attachFile.size)}
                    <TextButton tone="muted" onClick={() => setAttachFile(null)}>
                      Remove
                    </TextButton>
                  </span>
                ) : null}
                {error ? <ErrorLine>{error}</ErrorLine> : null}
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SentAnnouncement[]>([]);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);
  const [allCount, setAllCount] = useState<number | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(true);

  /* Optional image behind the announcement — uploaded to the public bucket the
     moment it's chosen, so by send time we already hold a stable URL. */
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  /* Optional schedule. A datetime-local string; empty means "send now". */
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  /* Owner approval queue actions. */
  const [approvingId, setApprovingId] = useState<string | null>(null);

  /* The master text-messaging switch. */
  const [smsEnabled, setSmsEnabledState] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);

  async function toggleSms() {
    if (smsBusy) return;
    const next = !smsEnabled;
    setSmsBusy(true);
    const res = await setSmsEnabled(next);
    setSmsBusy(false);
    if (!res.ok) return setWarnings([res.error]);
    setSmsEnabledState(next);
    s.audit(`Settings: turned text messaging ${next ? "on" : "off"}`);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setImageError("");
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadAnnouncementImage(fd);
    setImageUploading(false);
    if (!res.ok) return setImageError(res.error);
    setImageUrl(res.url);
  }

  async function refreshHistory() {
    const r = await listAnnouncements();
    if (r.ok) { setHistory(r.sent); setViewerIsOwner(r.viewerIsOwner); }
  }

  async function approve(id: string, subject: string) {
    if (approvingId) return;
    setApprovingId(id);
    const res = await approveAnnouncement(id);
    setApprovingId(null);
    if (!res.ok) return setWarnings([res.error]);
    await refreshHistory();
    s.audit(`Communications: approved announcement “${subject}”`);
  }

  async function decline(id: string, subject: string) {
    if (approvingId) return;
    setApprovingId(id);
    const res = await rejectAnnouncement(id);
    setApprovingId(null);
    if (!res.ok) return setWarnings([res.error]);
    setHistory((prev) => prev.filter((h) => h.id !== id));
    s.audit(`Communications: declined announcement “${subject}”`);
  }

  /* Inline edit of a sent announcement: which row is open and its draft. */
  const [editId, setEditId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(h: { id: string; subject: string; body: string }) {
    setConfirmDelete(null);
    setEditError("");
    if (editId === h.id) { setEditId(null); return; }
    setEditId(h.id);
    setEditSubject(h.subject);
    setEditBody(h.body);
  }

  async function saveEdit(id: string) {
    if (savingEdit) return;
    setSavingEdit(true);
    setEditError("");
    const res = await updateAnnouncement({ id, subject: editSubject, body: editBody });
    setSavingEdit(false);
    if (!res.ok) return setEditError(res.error);
    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, subject: editSubject.trim(), body: editBody.trim() } : h)),
    );
    setEditId(null);
    s.audit(`Communications: edited announcement “${editSubject.trim()}”`);
  }

  async function unpublish(id: string, subject: string) {
    if (unpublishing) return;
    setUnpublishing(id);
    const res = await unpublishAnnouncement(id);
    setUnpublishing(null);
    if (!res.ok) return setWarnings([res.error]);
    await refreshHistory();
    s.audit(`Communications: unpublished announcement “${subject}”`);
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string, subject: string) {
    if (deleting) return;
    setDeleting(id);
    const res = await deleteAnnouncement(id);
    setDeleting(null);
    setConfirmDelete(null);
    if (!res.ok) return setWarnings([res.error]);
    setHistory((prev) => prev.filter((h) => h.id !== id));
    s.audit(`Communications: deleted announcement “${subject}”`);
  }

  useEffect(() => {
    let alive = true;
    listAnnouncements().then((r) => {
      if (alive && r.ok) { setHistory(r.sent); setViewerIsOwner(r.viewerIsOwner); }
    });
    countAnnouncementAudience("all").then((r) => {
      if (alive && r.ok) setAllCount(r.households);
    });
    getSmsSettings().then((r) => {
      if (alive && r.ok) { setSmsEnabledState(r.enabled); setSmsConfigured(r.configured); }
    });
    return () => { alive = false; };
  }, []);

  const audiences = [
    { id: "all", label: "All communities", count: allCount ?? s.owners.length },
    ...s.communities.map((c) => ({ id: c.id, label: c.name, count: parseInt(c.doors, 10) || 0 })),
    { id: "delinquent", label: "Delinquent accounts", count: s.delinquents.length },
    { id: "board", label: "Board members", count: s.directors.length },
  ];

  async function submit() {
    if (sending) return;
    if (!subject.trim()) return setError("Give the announcement a subject.");
    if (!body.trim()) return setError("Write the message.");
    const active = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
    if (active.length === 0) return setError("Pick at least one channel.");
    const a = audiences.find((x) => x.id === audience)!;

    // A schedule that's toggled on but empty, or set to the past, is a mistake
    // worth catching before the row is written.
    let scheduledFor: string | null = null;
    if (scheduleOn) {
      if (!scheduleAt) return setError("Pick the date and time to send it, or turn scheduling off.");
      const when = new Date(scheduleAt);
      if (Number.isNaN(when.getTime())) return setError("That schedule time isn't valid.");
      if (when.getTime() < Date.now()) return setError("That time is in the past \u2014 pick a future time.");
      scheduledFor = when.toISOString();
    }

    setSending(true);
    setError("");
    setSent("");
    setWarnings([]);
    const res = await submitAnnouncement({
      subject, body, audience, audienceLabel: a.label, channels,
      imageUrl, scheduledFor,
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setSent(res.summary);
    setWarnings(res.warnings);
    s.audit(
      res.status === "pending"
        ? `Communications: submitted announcement \u201C${subject.trim()}\u201D for approval`
        : res.status === "scheduled"
          ? `Communications: scheduled announcement \u201C${subject.trim()}\u201D`
          : `Sent announcement \u201C${subject.trim()}\u201D to ${a.label.toLowerCase()}`,
    );
    await refreshHistory();
    setSubject(""); setBody("");
    setImageUrl(null); setImageError("");
    setScheduleOn(false); setScheduleAt("");
  }

  return (
    <>

      <Card>
        <CardHead title="Text messaging" meta="The master switch for all outbound texts, through SignalWire.">
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Status tone={smsEnabled ? "positive" : "neutral"}>{smsEnabled ? "On" : "Off"}</Status>
            <Chip on={smsEnabled} onClick={toggleSms}>
              {smsBusy ? "Saving…" : smsEnabled ? "Turn off" : "Turn on"}
            </Chip>
          </span>
        </CardHead>
        <div style={{ padding: `14px ${pad.card} 18px` }}>
          <span style={{ fontSize: 13.5, color: color.inkTertiary }}>
            {!smsConfigured
              ? "SignalWire isn’t configured yet — set the SIGNALWIRE_* keys, then turn this on to start sending texts."
              : smsEnabled
                ? "Texts are on. Announcements with the Text channel and reply-by-text will send through SignalWire."
                : "Texts are off. Nothing is sent by text until this is turned on, whatever a message’s channels say."}
          </span>
        </div>
      </Card>

      <ResidentInbox />
      <Card>
        <CardHead title="New announcement">
          <TextButton tone="muted" onClick={() => setComposeOpen((o) => !o)}>
            {composeOpen ? "Collapse" : "New announcement"}
          </TextButton>
        </CardHead>
        {composeOpen ? (
        <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 760 }}>
          <Field label="Subject"><Input value={subject} onChange={setSubject} placeholder="e.g. Water shut-off Thursday" /></Field>
          <Field label="Message"><Area value={body} onChange={setBody} rows={4} placeholder="Plain language. Lead with what changes and when." /></Field>

          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Image (optional)</span>
            {imageUrl ? (
              <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    width: "100%", maxWidth: 360, aspectRatio: "16 / 9", objectFit: "cover",
                    borderRadius: radius.lg, border: `1px solid ${color.hairline}`,
                  }}
                />
                <TextButton tone="destructive" onClick={() => { setImageUrl(null); setImageError(""); }}>
                  Remove image
                </TextButton>
              </div>
            ) : (
              <label
                style={{
                  border: `1px dashed oklch(0.82 0.014 145)`, borderRadius: radius.md,
                  padding: 18, textAlign: "center", cursor: imageUploading ? "default" : "pointer",
                  fontFamily: font.mono, fontSize: 13, color: color.inkQuaternary,
                }}
              >
                {imageUploading ? "Uploading…" : "Add a photo or graphic — JPG, PNG, WebP or GIF, up to 8 MB"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={imageUploading}
                  onChange={(e) => uploadImage(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
              </label>
            )}
            {imageError ? <ErrorLine>{imageError}</ErrorLine> : null}
          </div>

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

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: color.inkSecondary }}>When</span>
              <Chip on={!scheduleOn} onClick={() => setScheduleOn(false)}>Send now</Chip>
              <Chip on={scheduleOn} onClick={() => setScheduleOn(true)}>Schedule</Chip>
            </div>
            {scheduleOn ? (
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                style={{
                  /* datetime-local is focusable, so 14px zooms iOS on tap. */
                  justifySelf: "start", font: "inherit", fontFamily: font.mono, fontSize: 16,
                  color: color.ink, background: color.surfaceSunken,
                  border: `1px solid ${color.borderInput}`, borderRadius: 10, padding: "10px 12px",
                }}
              />
            ) : null}
            {scheduleOn ? (
              <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                It goes out automatically at that time (Central). Nothing is sent until then.
              </span>
            ) : null}
          </div>

          {!viewerIsOwner ? (
            <span style={{ fontSize: 13, color: color.attention }}>
              Your announcements go to an Owner to approve before they\u2019re sent.
            </span>
          ) : null}
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          {sent ? <p style={{ fontSize: 14, color: color.accent, margin: 0 }}>{sent}</p> : null}
          {warnings.map((w) => (
            <p key={w} style={{ fontSize: 14, color: color.attention, margin: 0 }}>{w}</p>
          ))}
          <Primary onClick={submit} style={{ justifySelf: "start", opacity: sending || imageUploading ? 0.6 : 1 }}>
            {sending
              ? "Working\u2026"
              : !viewerIsOwner
                ? "Submit for approval"
                : scheduleOn
                  ? "Schedule announcement"
                  : "Send announcement"}
          </Primary>
        </div>
        ) : null}
      </Card>

      {history.some((h) => h.isPending) ? (
        <Card>
          <CardHead
            title="Awaiting approval"
            meta={viewerIsOwner
              ? "Announcements from staff, waiting for you to release"
              : "Your announcements, waiting for an Owner to release"}
          />
          {history.filter((h) => h.isPending).map((h) => (
            <Row key={h.id} style={{ alignItems: "baseline" }}>
              <Mono size={13} style={{ color: color.neutral }}>{h.date}</Mono>
              <RowMain
                label={h.subject}
                detail={[h.channels, h.audienceLabel, h.scheduledFor].filter(Boolean).join(" · ")}
              />
              <Mono size={12} style={{ color: color.inkQuaternary }}>from {h.authorName ?? "staff"}</Mono>
              {viewerIsOwner ? (
                <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", gridColumn: "-2 / -1", justifySelf: "end" }}>
                  <Primary
                    onClick={() => approve(h.id, h.subject)}
                    style={{ padding: "8px 16px", fontSize: 13, opacity: approvingId === h.id ? 0.6 : 1 }}
                  >
                    {approvingId === h.id ? "Working…" : h.scheduledFor ? "Approve & schedule" : "Approve & send"}
                  </Primary>
                  <TextButton tone="destructive" onClick={() => decline(h.id, h.subject)}>Decline</TextButton>
                </span>
              ) : (
                <Status tone="attention">Pending</Status>
              )}
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardHead title="Announcements" meta="Sent, scheduled, and posted — newest first" />
        {history.filter((h) => !h.isPending).length === 0 ? (
          <Empty>Nothing sent yet. Announcements you send appear here.</Empty>
        ) : history.filter((h) => !h.isPending).map((h) => {
          const isPosted = h.isPosted;
          return (
            <React.Fragment key={h.id}>
              <Row>
                <Mono size={13} style={{ color: color.neutral }}>{h.date}</Mono>
                <RowMain label={h.subject} detail={h.meta} />
                <Mono size={12} style={{ color: color.inkQuaternary }}>{h.channels}</Mono>
                <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", gridColumn: "-2 / -1", justifySelf: "end" }}>
                  <TextButton tone="muted" onClick={() => openEdit(h)}>
                    {editId === h.id ? "Close" : "Edit"}
                  </TextButton>
                  {isPosted ? (
                    <TextButton tone="muted" onClick={() => unpublish(h.id, h.subject)}>
                      {unpublishing === h.id ? "Unpublishing…" : "Unpublish"}
                    </TextButton>
                  ) : null}
                  <TextButton tone="destructive"
                    onClick={() => setConfirmDelete(confirmDelete === h.id ? null : h.id)}>
                    Delete
                  </TextButton>
                </span>
              </Row>
              {editId === h.id ? (
                <div style={{
                  padding: `4px ${pad.card} 20px`, display: "grid", gap: 12, maxWidth: 760,
                  borderBottom: `1px solid ${color.hairlineSoft}`,
                }}>
                  <Field label="Subject"><Input value={editSubject} onChange={setEditSubject} /></Field>
                  <Field label="Message"><Area value={editBody} onChange={setEditBody} rows={4} /></Field>
                  {isPosted ? (
                    <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                      This notice is live — saving updates it on the resident portal right away.
                    </span>
                  ) : null}
                  {editError ? <ErrorLine>{editError}</ErrorLine> : null}
                  <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Primary onClick={() => saveEdit(h.id)} style={{ justifySelf: "start", padding: "9px 18px", opacity: savingEdit ? 0.6 : 1 }}>
                      {savingEdit ? "Saving…" : "Save changes"}
                    </Primary>
                    <TextButton tone="muted" onClick={() => setEditId(null)}>Cancel</TextButton>
                  </span>
                </div>
              ) : null}
              {confirmDelete === h.id ? (
                <ConfirmBar
                  text={`Permanently delete the announcement “${h.subject}”? ${isPosted ? "It comes off the resident portal and " : "It "}is removed from the send history for good. This can't be undone.`}
                  confirmLabel={deleting === h.id ? "Deleting…" : "Yes, delete it"}
                  onCancel={() => setConfirmDelete(null)}
                  onConfirm={() => remove(h.id, h.subject)}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
}
