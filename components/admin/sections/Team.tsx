"use client";

import React, { useState } from "react";
import { ROLE_HINTS } from "@/lib/admin-portal/actions";
import { NAV } from "@/lib/admin-portal/fixtures";
import { ALL_SECTIONS, SECTION_ACCESS } from "@/lib/admin-portal/permissions";
import {
  removeStaffAccount, setStaffAccountActive, updateStaffAccount,
} from "@/lib/admin-portal/team-actions";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import type { Staff, StaffRole } from "@/lib/admin-portal/types";
import {
  ConfirmBar,
  AddDrawer, Card, CardHead, Chip, Empty, ErrorLine, Field, FieldGrid, FilterBar,
  Input, Mono, PageTitle, Pill, Primary, Row, RowMain, Select, Status, TextButton,
} from "../ui";

/* Ordered by how much each role can reach, narrowest first, so the matrix
   below reads left to right as access widening and the role picker offers
   the least-privileged choice first. Roles reaching the same number of
   sections are ordered by how sensitive those sections are. */
const ROLES: StaffRole[] = [
  "Accounting", "Maintenance tech", "Inspector", "Front desk",
  "Assistant manager", "Community manager", "Administrator", "Owner",
];

/* Format a US number as it's typed — "(832) 302-5722". Reformatting from the
   raw digits each keystroke keeps deletes working. The stored value stays
   human-readable; the SMS sender strips it back to digits (normalizePhone). */
function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/* Row order is chosen so each role's column is as close to one unbroken run
   of green as the permissions allow — sections reached by the same roles sit
   next to each other, instead of green scattered down the page. Dashboard and
   Calendar lead because everyone reaches them, and the senior-only sections
   close it out. Anything not listed falls to the end rather than vanishing. */
const MATRIX_ROW_ORDER = [
  "dashboard", "calendar",
  "vendors", "work", "schedule",
  "violations", "owners",
  "bookings", "comms",
  "docs", "accounting",
  "arc", "board",
  "legal",
  "portfolio", "team",
] as const;

const MATRIX_SECTIONS = [
  ...MATRIX_ROW_ORDER.filter((s) => (ALL_SECTIONS as readonly string[]).includes(s)),
  ...ALL_SECTIONS.filter((s) => !(MATRIX_ROW_ORDER as readonly string[]).includes(s)),
];


/** Profile photo, falling back to initials so a row is never a blank circle. */
function Avatar({ name, url, size = 34 }: { name: string; url: string | null; size?: number }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <span style={{
      display: "grid", placeItems: "center", flex: "0 0 auto",
      width: size, height: size, borderRadius: "50%", overflow: "hidden",
      background: color.accentTint, color: "oklch(0.34 0.05 155)",
      fontSize: size * 0.36, fontWeight: 600,
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : letters}
    </span>
  );
}

/** Card-header collapse toggle — same chevron as the nav icons. */
function Chevron({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      style={{
        background: "none", border: "none", padding: "8px 12px",
        minWidth: 44, minHeight: 44,
        cursor: "pointer", color: "oklch(0.44 0.045 155)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg
        width={17} height={17} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden focusable={false}
        style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 140ms ease" }}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

/** Numbered pages — 1 · 2 · 3 — for short logs. Hidden with one page. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages < 2) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: `14px ${pad.card}` }}>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => onPage(p)}
          aria-current={p === page ? "page" : undefined}
          style={{
            fontFamily: font.mono, fontSize: 13, cursor: "pointer",
            minWidth: 34, padding: "7px 0", textAlign: "center",
            border: `1px solid ${p === page ? color.chipOnBorder : color.hairline}`,
            background: p === page ? color.chipOn : color.surfaceSunken,
            color: p === page ? color.chipOnText : color.inkTertiary,
            borderRadius: 8,
          }}>
          {p}
        </button>
      ))}
    </div>
  );
}

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
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");
  const [disabling, setDisabling] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState("");

  async function uploadPhoto(p: Staff, file: File) {
    if (!p.profileId) {
      return setRowError("This person has no sign-in account yet, so there is nowhere to keep a photo. Send them an invite first.");
    }
    setPhotoBusy(p.id);
    setRowError("");
    const form = new FormData();
    form.set("file", file);
    form.set("profileId", p.profileId);
    form.set("name", p.name);
    try {
      const res = await fetch("/api/staff/avatar", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string; photoUrl?: string | null };
      if (!res.ok || !data.ok) return setRowError(data.error ?? "The photo could not be saved.");
      s.setStaff((prev) => prev.map((x) => x.id === p.id ? { ...x, photoUrl: data.photoUrl ?? null } : x));
      s.audit(`Updated the profile photo for ${p.name}`);
    } catch {
      /* A dropped connection, or a proxy returning HTML for an oversized
         upload, would otherwise stop the spinner and say nothing. */
      setRowError("The photo could not be uploaded. Check the connection and try again.");
    } finally {
      setPhotoBusy(null);
    }
  }
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
    canEditSchedule: false,
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
      canEditSchedule: p.canEditSchedule,
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
      canEditSchedule: ef.canEditSchedule,
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

  /* ----- sign-in activity: collapse + pages of five ----- */
  const [signInsOpen, setSignInsOpen] = useState(false);
  const [signInPage, setSignInPage] = useState(1);
  const signInPages = Math.max(1, Math.ceil(s.signIns.length / 5));
  const signInPageSafe = Math.min(signInPage, signInPages);

  /* ----- audit trail: collapse + search + filter by user ----- */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditWho, setAuditWho] = useState("All");
  const auditUsers = ["All", ...[...new Set(s.auditLog.map((a) => a.who))].slice(0, 7)];
  const aq = auditQuery.trim().toLowerCase();
  const auditVisible = s.auditLog.filter((a) => {
    if (auditWho !== "All" && a.who !== auditWho) return false;
    if (!aq) return true;
    return (
      a.text.toLowerCase().includes(aq) ||
      a.who.toLowerCase().includes(aq) ||
      a.time.toLowerCase().includes(aq)
    );
  });

  async function save() {
    if (!name.trim() || !email.trim()) return setError("Add a name and a work email.");
    if (comms.length === 0) return setError("Assign at least one community.");
    setSending(true);
    setError("");
    try {
      // Creates the account and emails a one-time link that lands the new
      // team member on "choose your password" — no credential in the mail.
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
           the next load, so it carries no ids and the role default applies.
           New field staff start view-only; grant scheduling in their edit. */
        employeeId: null, profileId: null, sections: null, canEditSchedule: false, photoUrl: null,
      };
      s.setStaff((prev) => [...prev, p]);
      const delivery = data.emailError
        ? `the welcome email failed (${data.emailError})`
        : "welcome email sent with a link to choose a password" +
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
    } catch {
      setError("The invite could not be sent. Check the connection and try again.");
    } finally {
      setSending(false);
    }
  }

  /* An invitation link is one-time and expires. When it lapses, or the mail
     never lands, the office needs to be able to send another without
     rebuilding the account — this mints a fresh one and changes nothing
     until the recipient follows it. */
  async function resendInvite(p: Staff) {
    if (rowBusy) return;
    setRowBusy(p.id);
    setRowError("");
    setResendNote("");
    try {
      const res = await fetch("/api/team-invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setRowError(data.error ?? "The invitation could not be resent.");
        return;
      }
      setResendNote(
        `A fresh invitation is on its way to ${p.email}. The link lets them choose a password, and it expires in 24 hours.`,
      );
      s.audit(`Resent the portal invitation to ${p.name} at ${p.email}`);
    } catch {
      setRowError("The invitation could not be resent. Check the connection and try again.");
    } finally {
      setRowBusy(null);
      setResending(null);
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
            <Field label="Cell (for text notifications)"><Input value={phone} onChange={(v) => setPhone(formatUsPhone(v))} placeholder="(713) 555-0100" /></Field>
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

        {rowError ? (
          <div style={{ padding: `12px ${pad.card}` }}><ErrorLine>{rowError}</ErrorLine></div>
        ) : null}
        {resendNote ? (
          <div style={{ padding: `12px ${pad.card}`, fontSize: 14, lineHeight: 1.55, color: color.inkSecondary }}>
            {resendNote}
          </div>
        ) : null}

        {s.staff.map((p) => (
          /* Tight vertical rhythm: when the action cluster wraps under the
             name at narrower widths, the row shouldn't balloon. */
          <Row key={p.id} style={{ padding: `10px ${pad.card}`, rowGap: 4, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <Avatar name={p.name} url={p.photoUrl} />
              <RowMain label={p.name} detail={p.email} detailSize={12.5} />
            </span>
            <Mono size={12} style={{ color: color.neutral }}>{p.role}</Mono>
            <span style={{ fontSize: 14, color: color.inkTertiary, overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.communities.map((id) => s.communities.find((c) => c.id === id)?.name).filter(Boolean).join(", ") || "None assigned"}
            </span>
            <Status tone={!p.active ? "neutral" : p.load > 7 ? "attention" : "positive"}>
              {p.active ? `${p.load} open` : "Disabled"}
            </Status>
            {/* One line, always: the controls read as a set, and a wrapped
                "Remove" under the others looks like a separate row. */}
            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap", justifySelf: "end" }}>
              <Pill style={{ padding: "10px 12px", fontSize: 12.5 }}
                onClick={() => (editing === p.id ? setEditing(null) : openEdit(p))}>
                {editing === p.id ? "Close" : "Edit"}
              </Pill>
              {/* Administrator-only, like the invite itself — the server says
                  the same, and a button that only ever 403s is worse than no
                  button. Without an address there is nowhere to send it. */}
              {s.isAdministrator && p.email && p.email !== "—" ? (
                <Pill style={{ padding: "10px 12px", fontSize: 12.5, opacity: rowBusy === p.id ? 0.6 : 1 }}
                  title="Send them a fresh link to choose a portal password"
                  onClick={() => {
                    if (rowBusy) return;
                    setRowError("");
                    setResendNote("");
                    setResending(resending === p.id ? null : p.id);
                  }}>
                  Resend
                </Pill>
              ) : null}
              <Pill style={{ padding: "10px 12px", fontSize: 12.5, opacity: rowBusy === p.id ? 0.6 : 1 }}
                onClick={() => {
                  if (rowBusy) return;
                  setRowError("");
                  setDisabling(disabling === p.id ? null : p.id);
                }}>
                {rowBusy === p.id ? "…" : p.active ? "Disable" : "Enable"}
              </Pill>
              {/* Removing an account is Administrator-only; everyone else can
                  disable it, which is reversible. */}
              {s.isAdministrator ? (
                <button type="button" onClick={() => setRemoving(p.id)}
                  style={{
                    font: "inherit", fontSize: 12.5, fontWeight: 500,
                    background: "none", border: "1px solid transparent",
                    borderRadius: 999, padding: "10px 10px", minHeight: 44,
                    display: "inline-flex", alignItems: "center",
                    cursor: "pointer",
                    color: "oklch(0.5 0.09 30)", whiteSpace: "nowrap",
                  }}>
                  Remove
                </button>
              ) : (
                <span
                  title="Only an Administrator can remove a staff account"
                  style={{ fontSize: 12.5, color: color.inkQuaternary, padding: "10px 10px", whiteSpace: "nowrap" }}
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

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <Avatar name={p.name} url={p.photoUrl} size={56} />
                  <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                    {/* A styled label standing in for the file input: the raw
                        control is nearly invisible against the card and reads
                        as nothing to click. */}
                    <label
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        font: "inherit", fontSize: 13, fontWeight: 500,
                        background: color.surface,
                        border: `1px solid ${color.borderInput}`,
                        borderRadius: 999, padding: "7px 15px",
                        cursor: p.profileId && photoBusy !== p.id ? "pointer" : "default",
                        color: p.profileId ? color.ink : color.inkQuaternary,
                        opacity: photoBusy === p.id ? 0.6 : 1,
                      }}
                    >
                      {photoBusy === p.id
                        ? "Uploading\u2026"
                        : p.photoUrl ? "Replace photo" : "Upload a photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={!p.profileId || photoBusy === p.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadPhoto(p, file);
                        }}
                        style={{
                          position: "absolute", width: 1, height: 1,
                          padding: 0, margin: -1, overflow: "hidden",
                          clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
                        }}
                      />
                    </label>
                    <span style={{ fontSize: 11.5, lineHeight: 1.5, color: color.inkQuaternary }}>
                      {p.profileId
                        ? "JPEG, PNG or WebP \u00B7 up to 5 MB \u00B7 office only"
                        : "No sign-in account yet \u2014 send an invite first"}
                    </span>
                  </div>
                </div>
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
                {ef.role === "Maintenance tech" || ef.role === "Inspector" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontSize: 14, color: color.inkSecondary }}>Privileges</span>
                    <Chip on={ef.canEditSchedule}
                      onClick={() => setEf({ ...ef, canEditSchedule: !ef.canEditSchedule })}>
                      Can change the schedule
                    </Chip>
                    <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                      Off by default — a {ef.role.toLowerCase()} sees the schedule but can’t change it unless this is on.
                    </span>
                  </div>
                ) : null}
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
          resending === p.id ? (
            <ConfirmBar
              key={`resend-${p.id}`}
              text={`Email ${p.name} a fresh invitation at ${p.email}? They get a one-time link that signs them in and asks them to choose a password. Any earlier link stops working, and nothing about the account changes until they follow this one.`}
              confirmLabel={rowBusy === p.id ? "Sending…" : "Yes, resend the invitation"}
              onCancel={() => setResending(null)}
              onConfirm={() => resendInvite(p)}
            />
          ) : null,
        )}
        {s.staff.map((p) =>
          disabling === p.id ? (
            <ConfirmBar
              key={`toggle-${p.id}`}
              text={p.active
                ? `Switch off the account for ${p.name}? They keep their record and their history, but cannot sign in until it is switched back on.`
                : `Switch the account for ${p.name} back on? They will be able to sign in again with the access their role allows.`}
              confirmLabel={p.active ? "Yes, switch it off" : "Yes, switch it on"}
              onCancel={() => setDisabling(null)}
              onConfirm={async () => {
                setRowBusy(p.id);
                setRowError("");
                const res = await setStaffAccountActive({
                  employeeId: p.employeeId, profileId: p.profileId,
                  name: p.name, active: !p.active,
                });
                setRowBusy(null);
                setDisabling(null);
                if (!res.ok) return setRowError(res.error);
                s.setStaff(() => res.staff);
                s.audit(`${p.active ? "Switched off" : "Switched on"} the account for ${p.name}`);
              }}
            />
          ) : null,
        )}
        {s.staff.map((p) =>
          removing === p.id ? (
            <ConfirmBar
              key={`confirm-${p.id}`}
              text={`Are you sure you want to delete ${p.name}? This removes their roster record and their sign-in for good — they will not be able to reach the portal again. Work already logged against them stays, unassigned, and the audit trail keeps the history. To switch someone off temporarily instead, use Disable.`}
              confirmLabel="Yes, delete this account"
              onCancel={() => setRemoving(null)}
              onConfirm={async () => {
                if (rowBusy) return;
                setRowBusy(p.id);
                setRowError("");
                const res = await removeStaffAccount({
                  employeeId: p.employeeId, profileId: p.profileId, name: p.name,
                });
                setRowBusy(null);
                if (!res.ok) { setRemoving(null); return setRowError(res.error); }
                s.setStaff(() => res.staff);
                s.audit(`Removed the staff account for ${p.name}`);
                setRemoving(null);
              }}
            />
          ) : null,
        )}
      </Card>

      {/* Sign-in activity sits beside the audit trail: that log records what an
          account did, this records attempts to become one — including failures
          and probes against addresses that do not exist. */}
      <Card>
        <CardHead
          title="Sign-in activity"
          meta={`${s.signIns.filter((e) => !e.succeeded).length} failed of the last ${s.signIns.length}`}
        >
          <Chevron open={signInsOpen} onToggle={() => setSignInsOpen((v) => !v)} label="sign-in activity" />
        </CardHead>
        {!signInsOpen ? null : s.signIns.length === 0 ? (
          <Row>
            <span style={{ fontSize: 15, color: color.inkTertiary }}>
              Nothing recorded yet. Sign-ins, sign-outs and password resets appear here.
            </span>
          </Row>
        ) : (
          <>
            {s.signIns.slice((signInPageSafe - 1) * 5, signInPageSafe * 5).map((e) => (
              <Row key={e.id}>
                <RowMain
                  label={e.who}
                  detail={e.succeeded ? e.event : `${e.event} failed — ${e.reason ?? "unknown reason"}`}
                />
                <Status tone={e.succeeded ? "positive" : "critical"}>
                  {e.succeeded ? "Success" : "Failed"}
                </Status>
                {/* Location over IP in one cell: the office reads "where", the
                    IP stays underneath for a security check, and the row keeps
                    its five-cell budget. */}
                <span style={{ display: "grid", gap: 1 }}>
                  <span style={{ fontSize: 14, color: color.inkTertiary }}>
                    {e.location ?? "Location unknown"}
                  </span>
                  <Mono size={12} style={{ color: color.inkQuaternary }}>{e.ip}</Mono>
                </span>
                <span style={{ fontSize: 14, color: color.inkTertiary }}>{e.device}</span>
                <Mono size={12} style={{ color: color.inkQuaternary }}>{e.at}</Mono>
              </Row>
            ))}
            <Pager page={signInPageSafe} pages={signInPages} onPage={setSignInPage} />
          </>
        )}
      </Card>

      <Card>
        <CardHead title="Audit trail"
          meta="Every change in this portal is stamped with the account that made it. The log can't be edited.">
          <Chevron open={auditOpen} onToggle={() => setAuditOpen((v) => !v)} label="the audit trail" />
        </CardHead>
        {!auditOpen ? null : (
          <>
            <FilterBar
              query={auditQuery}
              onQuery={setAuditQuery}
              placeholder="Search the audit trail — action, account or time"
              filters={auditUsers}
              active={auditWho}
              onFilter={setAuditWho}
            />
            {auditVisible.length === 0 ? (
              <Empty>
                {s.auditLog.length === 0
                  ? "Nothing recorded yet this session."
                  : "Nothing matches that search."}
              </Empty>
            ) : (
              auditVisible.slice(0, 40).map((a) => (
                <Row key={a.id} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                  <span style={{ fontSize: 15 }}>{a.text}</span>
                  <Mono size={12} style={{ color: color.neutral }}>{a.who}</Mono>
                  <Mono size={12} style={{ color: color.inkQuaternary }}>{a.time}</Mono>
                </Row>
              ))
            )}
            {auditVisible.length > 40 ? (
              <Empty>Showing the first 40 of {auditVisible.length} matches — narrow the search to see the rest.</Empty>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <CardHead title="What each role can reach">
          <button
            type="button"
            onClick={() => setMatrixOpen((v) => !v)}
            aria-expanded={matrixOpen}
            aria-label={matrixOpen ? "Hide role details" : "Show role details"}
            style={{
              background: "none", border: "none", padding: "8px 12px",
              minWidth: 44, minHeight: 44,
              cursor: "pointer", color: "oklch(0.44 0.045 155)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
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
          <div style={{ display: "grid", gap: 12, padding: `6px ${pad.card} 18px` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: color.inkTertiary }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: color.chipOn, border: `1px solid ${color.chipOnBorder}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 12, color: color.chipOnText }}>
                  ✓
                </span>
                Can reach it
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: color.surfaceMuted, border: `1px solid ${color.hairlineSoft}`, display: "inline-block" }} />
                No access
              </span>
            </span>

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", left: 0, zIndex: 1, background: color.surface, textAlign: "left", padding: "12px 14px 10px 0", fontFamily: font.mono, fontSize: 11, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkTertiary, whiteSpace: "nowrap" }}>
                      Section
                    </th>
                    {ROLES.map((r) => (
                      <th key={r} style={{ padding: "12px 6px 10px", fontFamily: font.mono, fontSize: 11, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: color.inkTertiary, textAlign: "center", maxWidth: 96, lineHeight: 1.4 }}>
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_SECTIONS.map((sec, i) => {
                    /* Banding the rows is what makes a wide grid readable —
                       without it the eye loses the row between distant columns. */
                    const band = i % 2 === 1 ? color.surfaceSunken : color.surface;
                    return (
                      <tr key={sec}>
                        <td style={{ position: "sticky", left: 0, zIndex: 1, background: band, padding: "8px 14px 8px 0", fontSize: 14, color: color.inkSecondary, whiteSpace: "nowrap", borderTop: `1px solid ${color.hairlineSoft}` }}>
                          {NAV.find((n) => n.id === sec)?.label ?? sec}
                        </td>
                        {ROLES.map((r) => {
                          const has = SECTION_ACCESS[r].includes(sec);
                          return (
                            <td key={r}
                              aria-label={has ? `${r} can reach ${sec}` : `${r} cannot reach ${sec}`}
                              style={{ padding: "6px 6px", textAlign: "center", background: band, borderTop: `1px solid ${color.hairlineSoft}` }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 26, height: 26, borderRadius: 7,
                                fontFamily: font.mono, fontSize: 13,
                                background: has ? color.chipOn : "transparent",
                                border: `1px solid ${has ? color.chipOnBorder : color.hairlineSoft}`,
                                color: has ? color.chipOnText : color.inkQuaternary,
                              }}>
                                {has ? "✓" : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
