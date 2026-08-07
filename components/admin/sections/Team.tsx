"use client";

import React, { useState } from "react";
import { ROLE_HINTS } from "@/lib/admin-portal/actions";
import { NAV } from "@/lib/admin-portal/fixtures";
import { ALL_SECTIONS, SECTION_ACCESS } from "@/lib/admin-portal/permissions";
import { updateStaffAccount } from "@/lib/admin-portal/team-actions";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import type { Staff, StaffRole } from "@/lib/admin-portal/types";
import {
  ConfirmBar,
  AddDrawer, Card, CardHead, Chip, Empty, ErrorLine, Field, FieldGrid, Input,
  Mono, PageTitle, Pill, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

const ROLES: StaffRole[] = [
  "Community manager", "Assistant manager", "Maintenance tech",
  "Inspector", "Accounting", "Front desk", "Administrator", "Owner",
];

/**
 * Per-section access as checkmarks. Picking a role auto-fills the checked
 * set from SECTION_ACCESS (the same map the server enforces); an
 * Administrator can then grant an extra section or take one away, and the
 * difference is stored on the account as a custom override.
 */
function SectionsPicker({
  role, checked, onToggle,
}: {
  role: StaffRole; checked: string[]; onToggle: (id: string) => void;
}) {
  const def = SECTION_ACCESS[role];
  const custom = checked.length !== def.length || def.some((sec) => !checked.includes(sec));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span style={{ fontSize: 14, color: color.inkSecondary }}>
        What they can reach
        {custom
          ? <span style={{ color: color.attention }}> · customized from the {role} default</span>
          : <span style={{ color: color.inkQuaternary }}> · the {role} default</span>}
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ALL_SECTIONS.map((sec) => {
          const on = checked.includes(sec);
          const label = NAV.find((n) => n.id === sec)?.label ?? sec;
          return (
            <Chip key={sec} size="sm" on={on} onClick={() => onToggle(sec)}>
              {on ? `✓ ${label}` : label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

export default function Team() {
  const s = useStore();
  /* Rule 3: deletion always confirms. Only one row confirms at a time. */
  const [removing, setRemoving] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("Community manager");
  const [comms, setComms] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([...SECTION_ACCESS["Community manager"]]);
  const [sending, setSending] = useState(false);

  /* ----- inline edit (name, email, password, role, access) ----- */
  const [editing, setEditing] = useState<string | null>(null);
  const [ef, setEf] = useState({
    name: "", email: "", role: "Community manager" as StaffRole,
    comms: [] as string[], sections: [] as string[], password: "",
  });
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(p: Staff) {
    setEditing(p.id);
    setRemoving(null);
    setEditErr("");
    setEf({
      name: p.name,
      email: p.email === "—" ? "" : p.email,
      role: p.role,
      comms: [...p.communities],
      sections: [...(p.sections ?? SECTION_ACCESS[p.role])],
      password: "",
    });
  }

  async function saveEdit(p: Staff) {
    if (savingEdit) return;
    setSavingEdit(true);
    setEditErr("");
    const res = await updateStaffAccount({
      employeeId: p.employeeId,
      profileId: p.profileId,
      currentEmail: p.email,
      name: ef.name,
      email: ef.email,
      role: ef.role,
      communities: ef.comms,
      sections: ef.sections,
      newPassword: ef.password || undefined,
    });
    setSavingEdit(false);
    if (!res.ok) return setEditErr(res.error);
    s.setStaff(res.staff);
    s.audit(`Team: updated ${ef.name.trim()} — ${res.changed}`);
    setEditing(null);
  }
  // The role reference is static copy — collapsed by default so it doesn't
  // push the audit trail off screen.
  const [matrixOpen, setMatrixOpen] = useState(false);

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
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), role, phone: phone.trim(),
          sections, communities: comms,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; emailError?: string; smsError?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The invite could not be sent.");
        return;
      }
      const p: Staff = {
        id: s.uid("s"), name: name.trim(), email: email.trim(),
        role, communities: [...comms], active: true, load: 0,
        /* The server created the rows; this optimistic entry is replaced on
           the next load, so it carries no ids and the role default applies. */
        employeeId: null, profileId: null, sections: null,
      };
      s.setStaff((prev) => [...prev, p]);
      const delivery = data.emailError
        ? `the welcome email failed (${data.emailError})`
        : "welcome email sent with a temporary password" +
          (phone.trim() ? (data.smsError ? "; the text notification failed" : "; text notification sent") : "");
      s.audit(`Invited ${p.name} as ${p.role} — ${delivery}`);
      if (data.emailError || data.smsError) {
        setError(
          data.emailError
            ? `Account created, but the welcome email failed: ${data.emailError}`
            : `Invite sent, but the text notification failed: ${data.smsError}`,
        );
        return;
      }
      setOpen(false); setName(""); setEmail(""); setPhone(""); setComms([]);
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
            <Field label="Cell (for text notifications)"><Input value={phone} onChange={setPhone} placeholder="(713) 555-0100" /></Field>
            <Field label="Role">
              <Select value={role}
                onChange={(v) => {
                  setRole(v as StaffRole);
                  setSections([...SECTION_ACCESS[v as StaffRole]]);
                }}
                options={ROLES.map((r) => ({ id: r, label: r }))} />
            </Field>
          </FieldGrid>
          <SectionsPicker role={role} checked={sections}
            onToggle={(id) => setSections((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
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
          /* Tight vertical rhythm: when the action cluster wraps under the
             name at narrower widths, the row shouldn't balloon. */
          <Row key={p.id} style={{ padding: `10px ${pad.card}`, rowGap: 4, alignItems: "center" }}>
            <RowMain label={p.name} detail={p.email} />
            <Mono size={12} style={{ color: color.neutral }}>{p.role}</Mono>
            <span style={{ fontSize: 14, color: color.inkTertiary, overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.communities.map((id) => s.communities.find((c) => c.id === id)?.name).filter(Boolean).join(", ") || "None assigned"}
            </span>
            <Status tone={!p.active ? "neutral" : p.load > 7 ? "attention" : "positive"}>
              {p.active ? `${p.load} open` : "Disabled"}
            </Status>
            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Pill style={{ padding: "6px 13px", fontSize: 13 }}
                onClick={() => (editing === p.id ? setEditing(null) : openEdit(p))}>
                {editing === p.id ? "Close" : "Edit"}
              </Pill>
              <Pill style={{ padding: "6px 13px", fontSize: 13 }}
                onClick={() => {
                  s.setStaff((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
                  s.audit(`${p.active ? "Disabled" : "Enabled"} account for ${p.name}`);
                }}>
                {p.active ? "Disable" : "Enable"}
              </Pill>
              {/* Removing an account is Administrator-only; everyone else can
                  disable it, which is reversible. */}
              {s.isAdministrator ? (
                <TextButton tone="destructive" onClick={() => setRemoving(p.id)}>
                  Remove
                </TextButton>
              ) : (
                <span
                  title="Only an Administrator can remove a staff account"
                  style={{ fontSize: 14, color: color.inkQuaternary, padding: "10px 2px", whiteSpace: "nowrap" }}
                >
                  Remove
                </span>
              )}
            </span>
          </Row>
        ))}
        {s.staff.map((p) =>
          editing === p.id ? (
            <div key={`edit-${p.id}`}
              style={{ padding: `18px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, background: color.surfaceSunken }}>
              <div style={{ display: "grid", gap: 16, maxWidth: 860 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Edit {p.name}&rsquo;s account</span>
                <FieldGrid>
                  <Field label="Name"><Input value={ef.name} onChange={(v) => setEf({ ...ef, name: v })} /></Field>
                  <Field label="Work email"><Input value={ef.email} onChange={(v) => setEf({ ...ef, email: v })} placeholder="name@unitygrid.com" /></Field>
                  <Field label="Role">
                    <Select value={ef.role}
                      onChange={(v) => setEf({
                        ...ef, role: v as StaffRole,
                        sections: [...SECTION_ACCESS[v as StaffRole]],
                      })}
                      options={ROLES.map((r) => ({ id: r, label: r }))} />
                  </Field>
                  <Field label="New password" hint={p.profileId
                    ? "Leave blank to keep their current password. 8 characters minimum."
                    : "No sign-in account yet — send an invite to create one."}>
                    <Input password value={ef.password} onChange={(v) => setEf({ ...ef, password: v })}
                      placeholder="Leave blank to keep" />
                  </Field>
                </FieldGrid>
                <SectionsPicker role={ef.role} checked={ef.sections}
                  onToggle={(id) => setEf({
                    ...ef,
                    sections: ef.sections.includes(id)
                      ? ef.sections.filter((x) => x !== id)
                      : [...ef.sections, id],
                  })} />
                <div style={{ display: "grid", gap: 10 }}>
                  <span style={{ fontSize: 14, color: color.inkSecondary }}>Communities they cover</span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {s.communities.map((c) => (
                      <Chip key={c.id} on={ef.comms.includes(c.id)}
                        onClick={() => setEf({
                          ...ef,
                          comms: ef.comms.includes(c.id)
                            ? ef.comms.filter((x) => x !== c.id)
                            : [...ef.comms, c.id],
                        })}>
                        {c.name}
                      </Chip>
                    ))}
                  </div>
                </div>
                {editErr ? <ErrorLine>{editErr}</ErrorLine> : null}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <Primary onClick={() => saveEdit(p)}
                    style={savingEdit ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
                    {savingEdit ? "Saving…" : "Save changes"}
                  </Primary>
                  <TextButton tone="muted" onClick={() => setEditing(null)}>Cancel</TextButton>
                  <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                    Changes apply at their next page load and are stamped in the audit trail.
                  </span>
                </div>
              </div>
            </div>
          ) : null,
        )}
        {s.staff.map((p) =>
          removing === p.id ? (
            <ConfirmBar
              key={`confirm-${p.id}`}
              text={`Are you sure you want to delete ${p.name}? This removes the staff account and their access. Work already logged against them stays in the audit trail.`}
              confirmLabel="Yes, delete this account"
              onCancel={() => setRemoving(null)}
              onConfirm={() => {
                s.setStaff((prev) => prev.filter((x) => x.id !== p.id));
                s.audit(`Removed staff account for ${p.name}`);
                setRemoving(null);
              }}
            />
          ) : null,
        )}
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
        <CardHead title="What each role can reach">
          <button
            type="button"
            onClick={() => setMatrixOpen((v) => !v)}
            aria-expanded={matrixOpen}
            aria-label={matrixOpen ? "Hide role details" : "Show role details"}
            style={{
              background: "none", border: "none", padding: "8px 2px",
              cursor: "pointer", color: "oklch(0.44 0.045 155)",
              display: "inline-flex", alignItems: "center",
            }}
          >
            {/* Chevron matches the nav icons: one stroke weight, currentColor. */}
            <svg
              width={17} height={17} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden focusable={false}
              style={{
                transform: matrixOpen ? "rotate(180deg)" : "none",
                transition: "transform 140ms ease",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </CardHead>
        {matrixOpen ? (
          /* Rendered from SECTION_ACCESS — the same map the server enforces —
             so this table cannot drift from real permissions. */
          <div style={{ overflowX: "auto", padding: `6px ${pad.card} 18px` }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 14px 10px 0", fontFamily: font.mono, fontSize: 11, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkTertiary, whiteSpace: "nowrap" }}>
                    Section
                  </th>
                  {ROLES.map((r) => (
                    <th key={r} style={{ padding: "12px 8px 10px", fontFamily: font.mono, fontSize: 11, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: color.inkTertiary, textAlign: "center", maxWidth: 96, lineHeight: 1.4 }}>
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_SECTIONS.map((sec) => (
                  <tr key={sec} style={{ borderTop: `1px solid ${color.hairlineSoft}` }}>
                    <td style={{ padding: "10px 14px 10px 0", fontSize: 14, color: color.inkSecondary, whiteSpace: "nowrap" }}>
                      {NAV.find((n) => n.id === sec)?.label ?? sec}
                    </td>
                    {ROLES.map((r) => {
                      const has = SECTION_ACCESS[r].includes(sec);
                      return (
                        <td key={r} aria-label={has ? `${r} can reach` : `${r} cannot reach`}
                          style={{ padding: "10px 8px", textAlign: "center", fontFamily: font.mono, fontSize: 13, color: has ? "oklch(0.44 0.045 155)" : color.inkQuaternary }}>
                          {has ? "✓" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </>
  );
}
