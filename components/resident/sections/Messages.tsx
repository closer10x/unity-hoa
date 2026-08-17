"use client";

import React, { useState } from "react";

import {
  markResidentThreadRead, replyAsResident, startResidentThread,
} from "@/lib/resident-portal/message-actions";
import { fileSize, uploadMessageAttachment } from "@/lib/messages/upload-attachment";
import {
  attachmentName, attachmentUrl, isImageAttachment,
} from "@/lib/supabase/message-files";
import { useResident } from "@/lib/resident-portal/store";
import type { Thread } from "@/lib/resident-portal/types";
import {
  Area, Card, CardHeadMeta as CardHead, Chip, Empty, ErrorLine, Field, FieldGrid, Input, Mono,
  Pill, Primary, Select, Status, TextButton,
} from "../ui";
import { color, font, pad, radius } from "../ui";

const FILTERS = ["All", "Unread", "Office", "Committees"];

const RECIPIENTS = [
  "Management office", "Billing", "Architectural Committee", "Board liaison",
];

export default function Messages() {
  const s = useResident();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");
  const [msgTo, setMsgTo] = useState(RECIPIENTS[0]);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgError, setMsgError] = useState("");
  /* Chosen but not yet uploaded — one for a reply, one for the new-message
     form, because both can be open with different files picked. */
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const replyInput = React.useRef<HTMLInputElement | null>(null);
  const newInput = React.useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const visible = s.threads.filter((t) => {
    if (filter === "Unread" && !t.unread) return false;
    if (filter === "Office" && !(t.party === "Management office" || t.party === "Billing")) return false;
    if (filter === "Committees" && !(t.party.includes("Committee") || t.party === "Board liaison")) return false;
    if (!q) return true;
    return (
      t.subject.toLowerCase().includes(q) ||
      t.party.toLowerCase().includes(q) ||
      t.messages.some((m) => m.body.toLowerCase().includes(q))
    );
  });

  const thread = s.threads.find((t) => t.id === threadId) ?? visible[0] ?? s.threads[0] ?? null;

  const [sending, setSending] = useState(false);

  function openThread(t: Thread) {
    setThreadId(t.id);
    setComposing(false);
    setReply("");
    if (t.unread) {
      s.setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
      // Persist so the unread dot stays cleared after a reload.
      void markResidentThreadRead(t.id);
    }
  }

  async function sendReply() {
    if (!thread || sending) return;
    if (!reply.trim() && !replyFile) return;
    const text = reply.trim();
    setSending(true);
    setMsgError("");

    /* Upload first, then write the message with the path on it — the other
       way round leaves a message pointing at a file that never arrived. */
    let attachmentPath: string | undefined;
    if (replyFile) {
      const up = await uploadMessageAttachment(replyFile, thread.id);
      if (!up.ok) {
        setSending(false);
        return setMsgError(up.error);
      }
      attachmentPath = up.path;
    }

    const res = await replyAsResident({ threadId: thread.id, body: text, attachmentPath });
    setSending(false);
    if (!res.ok) return setMsgError(res.error);
    setReply("");
    setReplyFile(null);
    s.setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id
          ? { ...t, status: "Open" as const, date: "Today", messages: [...t.messages, res.message] }
          : t,
      ),
    );
  }

  async function sendNew() {
    if (sending) return;
    if (!msgSubject.trim() || (!msgBody.trim() && !newFile)) {
      return setMsgError("Add a subject, and a message or a file.");
    }
    setSending(true);
    setMsgError("");

    /* No thread id yet — this message is what creates it — so the upload
       lands in the sender's pending folder and the message carries the path. */
    let attachmentPath: string | undefined;
    if (newFile) {
      const up = await uploadMessageAttachment(newFile);
      if (!up.ok) {
        setSending(false);
        return setMsgError(up.error);
      }
      attachmentPath = up.path;
    }

    const res = await startResidentThread({
      party: msgTo, subject: msgSubject.trim(), body: msgBody.trim(), attachmentPath,
    });
    setSending(false);
    if (!res.ok) return setMsgError(res.error);
    s.setThreads((prev) => [res.thread, ...prev]);
    setThreadId(res.thread.id);
    setComposing(false);
    setMsgSubject(""); setMsgBody(""); setMsgError(""); setNewFile(null);
  }

  return (
    <>

      <Card>
        <div style={{ padding: `16px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Pill onClick={() => { setComposing(true); setMsgError(""); }}>New message</Pill>
          <input
            type="text"
            value={query}
            placeholder="Search messages…"
            onChange={(e) => setQuery(e.target.value)}
            style={{
              /* 16px so iOS does not zoom the page when a resident taps it. */
              flex: "1 1 200px", font: "inherit", fontSize: 16, color: color.ink,
              background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
              borderRadius: 10, padding: "12px 14px",
            }}
          />
          {FILTERS.map((f) => (
            <Chip key={f} size="sm" on={f === filter} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
          {/* Thread list */}
          <div style={{ flex: "1 1 260px", minWidth: 0, borderRight: `1px solid ${color.hairlineSoft}` }}>
            {visible.length === 0 ? (
              <Empty>
                {s.threads.length === 0
                  ? "No conversations yet. Start one with “New message” — the office answers within one business day."
                  : "Nothing matches that filter."}
              </Empty>
            ) : (
              visible.map((t) => {
                const active = thread?.id === t.id && !composing;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openThread(t)}
                    style={{
                      display: "grid", gap: 3, width: "100%", textAlign: "left", font: "inherit",
                      border: "none", borderBottom: `1px solid ${color.hairlineSoft}`,
                      borderLeft: `3px solid ${t.unread ? "oklch(0.55 0.06 155)" : "transparent"}`,
                      background: active ? "oklch(0.96 0.012 148)" : color.surface,
                      padding: "14px 16px", cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 13, color: color.inkTertiary }}>{t.party}</span>
                      <Mono size={12} style={{ color: color.inkQuaternary }}>{t.date}</Mono>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: t.unread ? 600 : 500 }}>{t.subject}</span>
                    <span style={{ fontSize: 13, color: color.inkQuaternary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.messages[t.messages.length - 1]?.body}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Conversation / composer */}
          <div style={{ flex: "2 1 340px", minWidth: 0, display: "grid", alignContent: "start" }}>
            {composing ? (
              <div style={{ padding: pad.card, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>New message</span>
                  <TextButton tone="muted" onClick={() => setComposing(false)}>Cancel</TextButton>
                </div>
                <FieldGrid>
                  <Field label="To">
                    <Select value={msgTo} onChange={setMsgTo} options={RECIPIENTS.map((r) => ({ id: r, label: r }))} />
                  </Field>
                  <Field label="Subject">
                    <Input value={msgSubject} onChange={setMsgSubject} placeholder="What's it about?" />
                  </Field>
                </FieldGrid>
                <Field label="Message">
                  <Area value={msgBody} onChange={setMsgBody} rows={4} placeholder="Write your message…" />
                </Field>
                <input
                  ref={newInput}
                  type="file"
                  hidden
                  onChange={(e) => {
                    setNewFile(e.target.files?.[0] ?? null);
                    setMsgError("");
                    e.target.value = "";
                  }}
                />
                {newFile ? (
                  <span style={{
                    justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 10,
                    background: color.surface, border: `1px solid ${color.borderInput}`,
                    borderRadius: 10, padding: "7px 8px 7px 12px",
                    fontFamily: font.mono, fontSize: 12, color: color.inkSecondary,
                  }}>
                    {newFile.name} · {fileSize(newFile.size)}
                    <TextButton onClick={() => setNewFile(null)}>Remove</TextButton>
                  </span>
                ) : null}
                {msgError ? <ErrorLine>{msgError}</ErrorLine> : null}
                <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Primary onClick={sendNew}
                    style={{ ...(sending ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
                    {sending ? "Sending…" : "Send"}
                  </Primary>
                  <TextButton onClick={() => newInput.current?.click()}>
                    Attach a photo or file
                  </TextButton>
                </span>
              </div>
            ) : !thread ? (
              <Empty>Select a conversation, or start a new one.</Empty>
            ) : (
              <>
                <CardHead
                  title={thread.subject}
                  meta={`${thread.party} · ${thread.messages.length} message${thread.messages.length === 1 ? "" : "s"} · last activity ${thread.date}`}
                >
                  <Status tone={thread.status === "Open" ? "positive" : "neutral"}>{thread.status}</Status>
                </CardHead>
                <div style={{ padding: pad.card, display: "grid", gap: 14 }}>
                  {thread.messages.map((m) => (
                    <div key={m.id} style={{ display: "grid", gap: 4, justifyItems: m.mine ? "end" : "start" }}>
                      <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: m.mine ? "oklch(0.4 0.05 155)" : color.inkSecondary }}>
                          {m.from}
                        </span>
                        <Mono size={11} style={{ color: color.inkQuaternary }}>{m.time}</Mono>
                      </span>
                      <div
                        style={{
                          maxWidth: "min(520px, 100%)",
                          background: m.mine ? color.accentTint : color.surfaceSunken,
                          border: `1px solid ${m.mine ? color.accentTintBorder : "oklch(0.92 0.008 140)"}`,
                          borderRadius: radius.xl,
                          padding: "12px 16px",
                          fontSize: 15,
                          lineHeight: 1.55,
                        }}
                      >
                        {m.body}
                      </div>
                      {/* Was the storage path as plain text. A photo shows;
                          anything else is a chip that downloads. */}
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
                                borderRadius: 12, border: `1px solid ${color.hairlineSoft}`,
                              }}
                            />
                          </a>
                        ) : (
                          <a
                            href={attachmentUrl(m.id, true)}
                            style={{
                              fontFamily: font.mono, fontSize: 12,
                              border: `1px solid ${color.borderInput}`, borderRadius: 6,
                              padding: "6px 10px", color: color.inkSecondary,
                              textDecoration: "none", background: color.surface,
                            }}
                          >
                            {attachmentName(m.attachment)}
                          </a>
                        )
                      ) : null}
                    </div>
                  ))}
                </div>
                <div style={{ padding: pad.card, borderTop: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 10 }}>
                  <Area value={reply} onChange={setReply} rows={2} placeholder="Write a reply…" />
                  <input
                    ref={replyInput}
                    type="file"
                    hidden
                    onChange={(e) => {
                      setReplyFile(e.target.files?.[0] ?? null);
                      setMsgError("");
                      e.target.value = "";
                    }}
                  />
                  {replyFile ? (
                    <span style={{
                      justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 10,
                      background: color.surface, border: `1px solid ${color.borderInput}`,
                      borderRadius: 10, padding: "7px 8px 7px 12px",
                      fontFamily: font.mono, fontSize: 12, color: color.inkSecondary,
                    }}>
                      {replyFile.name} · {fileSize(replyFile.size)}
                      <TextButton onClick={() => setReplyFile(null)}>Remove</TextButton>
                    </span>
                  ) : null}
                  {msgError && !composing ? <ErrorLine>{msgError}</ErrorLine> : null}
                  <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Primary onClick={sendReply}
                      style={{ padding: "10px 22px", ...(sending ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
                      {sending ? "Sending…" : "Reply"}
                    </Primary>
                    <TextButton onClick={() => replyInput.current?.click()}>
                      Attach a photo or file
                    </TextButton>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
