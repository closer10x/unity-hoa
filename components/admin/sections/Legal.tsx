"use client";

import React, { useState } from "react";
import { LEGAL_STEPS } from "@/lib/admin-portal/actions";
import { COUNSEL, LEGAL_CALENDAR } from "@/lib/admin-portal/fixtures";
import { buildActionMenu, useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { PendingConfirm } from "@/lib/admin-portal/types";
import { ActionSelect, Card, CardHead, ConfirmBar, Mono, PageTitle, Row, RowMain, Status } from "../ui";

export default function Legal() {
  const s = useStore();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const tone = (stage: string) =>
    stage === "Closed" || stage === "Payment plan" ? "positive"
    : stage === "Foreclosure scheduled" || stage === "Suit filed" ? "critical" : "attention";

  return (
    <>
      <PageTitle title="Legal & liens" lede="Matters with counsel, recorded liens and the dates that carry deadlines." />

      <Card>
        <CardHead title="Open matters" meta="Consequential stages need a recorded board vote" />
        {s.legalCases.map((c) => {
          const menu = buildActionMenu(LEGAL_STEPS, c.stage, c.id, `${c.owner} · ${c.address}`, pending, setPending);
          return (
            <React.Fragment key={c.id}>
              <Row>
                <RowMain label={c.owner} detail={c.address} />
                <Mono size={15}>{c.balance}</Mono>
                <span style={{ fontSize: 14, color: color.inkTertiary }}>{c.counsel}</span>
                <Status tone={tone(c.stage)}>{c.stage}</Status>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel} onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setLegalCases((prev) => prev.map((x) => x.id === c.id ? { ...x, stage: next } : x));
                    setPending(null);
                    s.audit(`Legal — ${c.owner} → ${next}`);
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>

      <Card>
        <CardHead title="Counsel" />
        {COUNSEL.map((c) => (
          <Row key={c.firm}>
            <RowMain label={c.firm} detail={c.contact} />
            <span style={{ fontSize: 14, color: color.inkTertiary }}>{c.scope}</span>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="Upcoming legal dates" />
        {LEGAL_CALENDAR.map((e) => (
          <Row key={e.id}>
            <Mono size={13} style={{ color: color.critical }}>{e.date}</Mono>
            <RowMain label={e.title} detail={e.detail} />
          </Row>
        ))}
      </Card>
    </>
  );
}
