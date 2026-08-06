"use client";

import React, { useState } from "react";
import { SENT_HISTORY } from "@/lib/admin-portal/fixtures";
import { useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import {
  Area, Card, CardHead, Chip, ErrorLine, Field, Input, Mono, PageTitle,
  Primary, Row, RowMain,
} from "../ui";

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
      <PageTitle title="Communications" lede="Announcements to owners by email, text and the portal." />
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
