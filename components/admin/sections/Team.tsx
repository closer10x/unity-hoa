"use client";

import React, { useState } from "react";
import { ROLE_HINTS, ROLE_MATRIX } from "@/lib/admin-portal/actions";
import { useStore } from "@/lib/admin-portal/store";
import { color } from "@/lib/admin-portal/tokens";
import type { Staff, StaffRole } from "@/lib/admin-portal/types";
import {
  AddDrawer, Card, CardHead, Chip, Empty, ErrorLine, Field, FieldGrid, Input,
  Mono, PageTitle, Pill, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const ROLES: StaffRole[] = [
  "Community manager", "Assistant manager", "Maintenance tech",
  "Inspector", "Accounting", "Front desk", "Administrator",
];

export default function Team() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("Community manager");
  const [comms, setComms] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  async function save() {
    if (!name.trim() || !email.trim()) return setError("Add a name and a work email.");
    if (comms.length === 0) return setError("Assign at least one community.");
    setSending(true);
    setError("");
    try {
      // Creates the account with an auto-generated temporary password and
      // emails the credentials to the new team member.
      const res = await fetch("/api/team-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; emailError?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The invite could not be sent.");
        return;
      }
      const p: Staff = {
        id: s.uid("s"), name: name.trim(), email: email.trim(),
        role, communities: [...comms], active: true, load: 0,
      };
      s.setStaff((prev) => [...prev, p]);
      s.audit(
        data.emailError
          ? `Invited ${p.name} as ${p.role} — account created, but the welcome email failed (${data.emailError})`
          : `Invited ${p.name} as ${p.role} — welcome email sent with a temporary password`,
      );
      if (data.emailError) {
        setError(`Account created, but the welcome email failed: ${data.emailError}`);
        return;
      }
      setOpen(false); setName(""); setEmail(""); setComms([]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageTitle title="Unity Grid team" lede="Staff accounts, what each role can reach, the communities they cover and the work sitting with them today." />

      <Card>
        <CardHead title="Staff accounts"
          meta={`${s.staff.filter((p) => p.active).length} active · ${s.staff.length} accounts`} />
        <AddDrawer open={open} onOpen={() => { setOpen(true); setError(""); }} onCancel={() => { setOpen(false); setError(""); }}
          openLabel="Invite a team member" title="Invite a team member">
          <FieldGrid>
            <Field label="Name"><Input value={name} onChange={setName} placeholder="First and last" /></Field>
            <Field label="Work email"><Input value={email} onChange={setEmail} placeholder="name@unitygrid.com" /></Field>
            <Field label="Role">
              <Select value={role} onChange={(v) => setRole(v as StaffRole)} options={ROLES.map((r) => ({ id: r, label: r }))} />
            </Field>
          </FieldGrid>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Communities they cover</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {s.communities.map((c) => (
                <Chip key={c.id} on={comms.includes(c.id)}
                  onClick={() => setComms((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary }}>{ROLE_HINTS[role]}</p>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start", ...(sending ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
            {sending ? "Sending invite…" : "Send invite"}
          </Primary>
        </AddDrawer>

        {s.staff.map((p) => (
          <Row key={p.id}>
            <RowMain label={p.name} detail={p.email} />
            <Mono size={12} style={{ color: color.neutral }}>{p.role}</Mono>
            <span style={{ fontSize: 14, color: color.inkTertiary, overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.communities.map((id) => s.communities.find((c) => c.id === id)?.name).filter(Boolean).join(", ") || "None assigned"}
            </span>
            <Status tone={!p.active ? "neutral" : p.load > 7 ? "attention" : "positive"}>
              {p.active ? `${p.load} open` : "Disabled"}
            </Status>
            <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Pill style={{ padding: "8px 16px", fontSize: 14 }}
                onClick={() => {
                  s.setStaff((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
                  s.audit(`${p.active ? "Disabled" : "Enabled"} account for ${p.name}`);
                }}>
                {p.active ? "Disable" : "Enable"}
              </Pill>
              <TextButton tone="destructive"
                onClick={() => {
                  s.setStaff((prev) => prev.filter((x) => x.id !== p.id));
                  s.audit(`Removed staff account for ${p.name}`);
                }}>
                Remove
              </TextButton>
            </span>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="Audit trail"
          meta="Every change in this portal is stamped with the account that made it. The log can't be edited." />
        {s.auditLog.length === 0 ? (
          <Empty>Nothing recorded yet this session.</Empty>
        ) : s.auditLog.slice(0, 40).map((a) => (
          <Row key={a.id} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <span style={{ fontSize: 15 }}>{a.text}</span>
            <Mono size={12} style={{ color: color.neutral }}>{a.who}</Mono>
            <Mono size={12} style={{ color: color.inkQuaternary }}>{a.time}</Mono>
          </Row>
        ))}
      </Card>

      <Card>
        <CardHead title="What each role can reach" />
        {ROLE_MATRIX.map((r) => (
          <Row key={r.role} style={{ gridTemplateColumns: "180px minmax(0, 1fr)" }}>
            <Mono size={12} style={{ color: color.neutral }}>{r.role}</Mono>
            <span style={{ fontSize: 15, lineHeight: 1.55, color: color.inkSecondary }}>{r.access}</span>
          </Row>
        ))}
      </Card>
    </>
  );
}
