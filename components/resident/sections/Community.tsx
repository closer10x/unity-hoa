"use client";

import React, { useState } from "react";

import { useResident } from "@/lib/resident-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";
import {
  Card, CardHead, Chip, Empty, Mono, PageTitle, Row, RowMain, TextButton,
} from "@/components/admin/ui";

export default function Community() {
  const s = useResident();
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [directoryListed, setDirectoryListed] = useState(false);

  return (
    <>
      <PageTitle title="Community" lede="Events, elections, your neighbors, and news from the association." />

      <Card>
        <CardHead title="Events" meta="RSVP so the office can plan" />
        {s.events.length === 0 ? (
          <Empty>Nothing on the calendar right now. Community events and meetings will appear here.</Empty>
        ) : (
          s.events.map((e) => (
            <Row key={e.id}>
              <Mono size={13} style={{ color: color.neutral }}>{e.date}</Mono>
              <RowMain label={e.title} detail={e.detail} />
              <Chip size="sm" on={!!rsvps[e.id]} onClick={() => setRsvps((r) => ({ ...r, [e.id]: !r[e.id] }))}>
                {rsvps[e.id] ? "Going" : "RSVP"}
              </Chip>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <CardHead title="Elections & ballots" />
        <Empty>
          No ballot is open right now. When board elections or special votes
          open, you’ll cast your ballot here and by mail.
        </Empty>
      </Card>

      <Card>
        <CardHead title="Resident directory" meta="Opt-in only" />
        <div style={{ padding: pad.card, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary, flex: "1 1 320px" }}>
            {directoryListed
              ? "You're listed. Neighbors can see your name and street — never your email, phone or balance."
              : "You're hidden. You can still see neighbors who chose to be listed."}
          </span>
          <TextButton onClick={() => setDirectoryListed(!directoryListed)}>
            {directoryListed ? "Hide me" : "List me"}
          </TextButton>
        </div>
      </Card>

      <Card>
        <CardHead title="Announcements" meta="From the association" />
        {s.announcements.length === 0 ? (
          <Empty>No announcements yet.</Empty>
        ) : (
          s.announcements.map((a) => (
            <div key={a.id} style={{ padding: `18px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 6 }}>
              <Mono size={12} style={{ color: color.inkQuaternary }}>{a.meta}</Mono>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{a.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary }}>{a.body}</span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
