"use client";

import React from "react";
import { QUEUE } from "@/lib/admin-portal/fixtures";
import { useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import { Card, CardHead, PageTitle, Pill, Row, RowMain, Tile, Tiles } from "../ui";

export default function Dashboard() {
  const s = useStore();
  return (
    <>
      <PageTitle title="Dashboard" lede={`What needs attention across ${s.scopeLabel}.`} />
      <Tiles min={220}>
        {s.metrics.map((m) => <Tile key={m.label} label={m.label} value={m.value} note={m.note} />)}
      </Tiles>
      <Card>
        <CardHead title="Needs a decision" meta="Items waiting on the office, most urgent first — each opens its section" />
        {QUEUE.map((q) => (
          <Row key={q.id}>
            <RowMain label={q.label} detail={q.detail} />
            <Pill onClick={() => s.setView(q.target)}>Open</Pill>
          </Row>
        ))}
      </Card>
      <Card>
        <CardHead title="Latest changes" meta="The most recent actions across both portals, with who made them — full history in Team → Audit trail" />
        {s.auditLog.length === 0 ? (
          <Row><span style={{ fontSize: 15, color: color.inkTertiary }}>Nothing recorded yet this session. Actions you take appear here and in Team → Audit trail.</span></Row>
        ) : s.auditLog.slice(0, 6).map((a) => (
          <Row key={a.id}>
            <span style={{ fontSize: 15 }}>{a.text}</span>
            <span style={{ fontSize: 14, color: color.neutral }}>{a.who}</span>
            <span style={{ fontSize: 14, color: color.inkQuaternary }}>{a.time}</span>
          </Row>
        ))}
      </Card>
    </>
  );
}
