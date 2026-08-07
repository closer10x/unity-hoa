"use client";

import React from "react";
import { color, fieldGrid, font, pad, radius, rowGrid } from "@/lib/admin-portal/tokens";
import type { Address, AddressSuggestion } from "@/lib/admin-portal/types";

/* ---------- text ---------- */

export function Mono({ children, size = 12, style }: { children: React.ReactNode; size?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: font.mono, fontSize: size, ...style }}>{children}</span>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
      {children}
    </span>
  );
}

export function PageTitle({ title, lede }: { title: string; lede?: string }) {
  return (
    <div>
      <h1 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 600, letterSpacing: "-0.024em", margin: "0 0 8px" }}>{title}</h1>
      {lede ? <p style={{ margin: 0, fontSize: 16, color: color.inkTertiary, textWrap: "pretty" }}>{lede}</p> : null}
    </div>
  );
}

/* ---------- containers ---------- */

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: color.surface, border: `1px solid ${color.hairline}`, borderRadius: radius.card, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

export function CardHead({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: `20px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{title}</h2>
      {meta ? <span style={{ fontSize: 14, color: color.inkTertiary }}>{meta}</span> : null}
      {children}
    </div>
  );
}

/** A data row. Always the auto-fit grid — see tokens.rowGrid for why. */
export function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...rowGrid, padding: `16px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, ...style }}>
      {children}
    </div>
  );
}

export function RowMain({ label, detail }: { label: string; detail?: string }) {
  return (
    <span>
      <span style={{ display: "block", fontSize: 16, fontWeight: 500 }}>{label}</span>
      {detail ? <span style={{ display: "block", fontSize: 14, color: color.inkTertiary, marginTop: 2 }}>{detail}</span> : null}
    </span>
  );
}

export function Status({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "positive" | "attention" | "critical" }) {
  const map = { neutral: color.neutral, positive: color.positive, attention: color.attention, critical: color.critical };
  return <Mono style={{ color: map[tone] }}>{children}</Mono>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: `28px ${pad.card}`, fontSize: 15, color: color.inkTertiary }}>{children}</div>;
}

export function Tiles({ children, min = 200 }: { children: React.ReactNode; min?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 }}>{children}</div>;
}

export function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: color.surface, border: `1px solid ${color.hairline}`, borderRadius: radius.xl, padding: 22 }}>
      <p style={{ margin: "0 0 10px" }}><Eyebrow>{label}</Eyebrow></p>
      <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</p>
      {note ? <p style={{ margin: 0, fontSize: 14, color: color.inkTertiary }}>{note}</p> : null}
    </div>
  );
}

/* ---------- controls ---------- */

export function Primary({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ font: "inherit", fontSize: 15, fontWeight: 500, background: hover ? color.accentHover : color.accent, color: "oklch(0.97 0.008 140)", border: "none", padding: "13px 26px", borderRadius: radius.md, cursor: "pointer", ...style }}>
      {children}
    </button>
  );
}

export function Pill({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ font: "inherit", fontSize: 15, fontWeight: 500, background: "none", border: `1px solid ${hover ? "oklch(0.5 0.04 155)" : "oklch(0.8 0.02 150)"}`, borderRadius: radius.pill, padding: "11px 22px", cursor: "pointer", color: "oklch(0.32 0.02 150)", whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
}

export function TextButton({ children, onClick, tone = "accent" }: { children: React.ReactNode; onClick?: () => void; tone?: "accent" | "muted" | "destructive" }) {
  const map = { accent: "oklch(0.44 0.045 155)", muted: color.inkTertiary, destructive: color.destructive };
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", padding: "10px 2px", font: "inherit", fontSize: 14, color: map[tone], cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

export function Chip({ children, on, onClick, size = "md" }: { children: React.ReactNode; on: boolean; onClick: () => void; size?: "sm" | "md" }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        font: "inherit", fontSize: size === "sm" ? 13 : 14, fontWeight: 500,
        border: `1px solid ${on ? color.chipOnBorder : color.hairline}`,
        background: on ? color.chipOn : color.surfaceSunken,
        color: on ? color.chipOnText : color.inkTertiary,
        borderRadius: radius.pill, padding: size === "sm" ? "10px 14px" : "11px 18px",
        cursor: "pointer", whiteSpace: "nowrap",
      }}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 14, color: color.inkSecondary, marginBottom: 8 }}>{label}</span>
      {children}
      {hint ? (
        <span style={{ display: "block", fontSize: 13, color: color.inkQuaternary, marginTop: 6 }}>{hint}</span>
      ) : null}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", font: "inherit", fontSize: 16, color: color.ink,
  background: color.surface, border: `1px solid ${color.borderInput}`,
  borderRadius: radius.md, padding: "12px 14px",
};

export function Input({
  value, onChange, placeholder, readOnly = false, mono = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  /** System-assigned values: shown, never typed into. */
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      tabIndex={readOnly ? -1 : undefined}
      onChange={(e) => { if (!readOnly) onChange(e.target.value); }}
      style={{
        ...inputStyle,
        ...(mono ? { fontFamily: font.mono, fontSize: 14 } : null),
        ...(readOnly
          ? { background: color.surfaceMuted, color: color.inkTertiary, cursor: "default" }
          : null),
      }}
    />
  );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, fontFamily: font.mono, fontSize: 14 }} />;
}

export function Area({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, lineHeight: 1.55, resize: "vertical" }} />;
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: "none", padding: "12px 38px 12px 14px", cursor: "pointer" }}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={fieldGrid}>{children}</div>;
}

export function ErrorLine({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 14, color: color.critical }}>{children}</p>;
}

export function DropZone({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px dashed oklch(0.82 0.014 145)`, borderRadius: radius.md, padding: 18, textAlign: "center" }}>
      <Mono style={{ color: color.inkQuaternary }}>{children}</Mono>
    </div>
  );
}

/* ---------- add-form drawer (product rule: always on top) ---------- */

export function AddDrawer({
  open, onOpen, onCancel, openLabel, title, note, children,
}: {
  open: boolean; onOpen: () => void; onCancel: () => void;
  openLabel: string; title: string; note?: string; children: React.ReactNode;
}) {
  if (!open) {
    return (
      <div style={{ padding: pad.card, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Pill onClick={onOpen}>{openLabel}</Pill>
        {note ? <span style={{ fontSize: 14, color: color.inkTertiary }}>{note}</span> : null}
      </div>
    );
  }
  return (
    <div style={{ padding: pad.card, borderBottom: `1px solid ${color.hairlineSoft}` }}>
      <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 22, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          <TextButton tone="muted" onClick={onCancel}>Cancel</TextButton>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- action dropdown + confirmation (product rules 2 & 3) ---------- */

export function ActionSelect({ options, onChoose }: { options: { id: string; label: string }[]; onChoose: (id: string) => void }) {
  return (
    <select value="" onChange={(e) => onChoose(e.target.value)}
      style={{
        appearance: "none", font: "inherit", fontSize: 14, color: "oklch(0.32 0.02 150)",
        background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
        borderRadius: radius.pill, padding: "11px 32px 11px 16px", cursor: "pointer", whiteSpace: "nowrap",
      }}>
      <option value="">Take action…</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function ConfirmBar({ text, confirmLabel, onCancel, onConfirm }: { text: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ padding: `16px ${pad.card}`, background: color.confirmBg, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 16, alignItems: "center" }}>
      <span style={{ fontSize: 15, lineHeight: 1.55, color: "oklch(0.32 0.02 150)" }}>{text}</span>
      <TextButton tone="muted" onClick={onCancel}>Cancel</TextButton>
      <Primary onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: radius.pill, fontSize: 14 }}>{confirmLabel}</Primary>
    </div>
  );
}

/* ---------- search + filters (product rule 5) ---------- */

export function FilterBar({
  query, onQuery, placeholder, filters, active, onFilter, extra,
  sortOptions, sort, onSort,
}: {
  query: string; onQuery: (v: string) => void; placeholder: string;
  filters: string[]; active: string; onFilter: (f: string) => void;
  extra?: React.ReactNode;
  /** Optional sort control; omit all three to hide it. */
  sortOptions?: { id: string; label: string }[];
  sort?: string;
  onSort?: (id: string) => void;
}) {
  return (
    <div style={{ padding: `16px ${pad.card}`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <input type="text" value={query} placeholder={placeholder} onChange={(e) => onQuery(e.target.value)}
        style={{ ...inputStyle, flex: "1 1 220px", width: "auto", fontSize: 15, background: color.surfaceSunken, padding: "11px 14px" }} />
      {extra}
      {sortOptions && sort !== undefined && onSort ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
            Sort
          </span>
          <Select value={sort} onChange={onSort} options={sortOptions} />
        </label>
      ) : null}
      {filters.map((f) => <Chip key={f} size="sm" on={f === active} onClick={() => onFilter(f)}>{f}</Chip>)}
    </div>
  );
}

/* ---------- structured address (product rule 6) ---------- */

export function AddressFields({
  value, onChange, stateLocked = true, unitLabel = "Unit or lot no.",
  suggestions = [],
}: {
  value: Address; onChange: (a: Address) => void;
  stateLocked?: boolean; unitLabel?: string;
  /** Known addresses from the lots roster; typing a street number offers them. */
  suggestions?: AddressSuggestion[];
}) {
  const set = (k: keyof Address) => (v: string) => onChange({ ...value, [k]: v });

  /* Match on street number or name so either field can drive the fill.
     Capped at 6 — a longer list is a scroll, not a shortcut. */
  const typed = `${value.streetNo} ${value.street}`.trim().toLowerCase();
  const matches =
    typed.length < 1
      ? []
      : suggestions
          .filter((a) =>
            `${a.streetNo} ${a.street}`.toLowerCase().includes(typed) &&
            `${a.streetNo} ${a.street}`.toLowerCase() !== typed,
          )
          .slice(0, 6);

  const apply = (a: AddressSuggestion) =>
    onChange({
      ...value,
      streetNo: a.streetNo,
      street: a.street,
      unit: a.unit || value.unit,
      city: a.city,
      state: a.state || value.state,
      zip: a.zip,
    });

  return (
    <>
      <FieldGrid>
        <Field label="Street number"><Input value={value.streetNo} onChange={set("streetNo")} placeholder="e.g. 1420" /></Field>
        <Field label="Street name"><Input value={value.street} onChange={set("street")} placeholder="e.g. Willow Bend Ln" /></Field>
        <Field label={unitLabel}><Input value={value.unit} onChange={set("unit")} placeholder="Optional" /></Field>
      </FieldGrid>

      {matches.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {matches.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => apply(a)}
                title={a.taken ? "This lot already has an owner linked" : "Fill this address"}
                style={{
                  font: "inherit", fontSize: 14, cursor: "pointer",
                  background: color.surfaceSunken,
                  border: `1px solid ${color.hairline}`,
                  borderRadius: 999, padding: "7px 14px",
                  color: color.ink, display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {a.label}
                {a.taken ? (
                  <span style={{ fontFamily: font.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: color.attention }}>
                    owner on file
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <FieldGrid>
        <Field label="City"><Input value={value.city} onChange={set("city")} placeholder="e.g. Katy" /></Field>
        <Field label="State">
          <Select value={value.state} onChange={set("state")}
            options={stateLocked ? [{ id: "Texas", label: "Texas" }] : [{ id: "Texas", label: "Texas" }, { id: "Out of state", label: "Out of state" }]} />
        </Field>
        <Field label="ZIP code"><Input value={value.zip} onChange={set("zip")} placeholder="e.g. 77493" /></Field>
      </FieldGrid>
    </>
  );
}

/** Mailing address: "Same as property" first, fields only when it differs. */
export function MailingAddress({
  same, onToggle, value, onChange, propertyPreview,
}: {
  same: boolean; onToggle: () => void; value: Address;
  onChange: (a: Address) => void; propertyPreview: string;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: color.inkSecondary }}>Mailing address</span>
        <Chip size="sm" on={same} onClick={onToggle}>{same ? "Same as property" : "Different address"}</Chip>
      </span>
      {same ? (
        <span style={{ fontSize: 14, lineHeight: 1.55, color: color.inkTertiary }}>
          Statements and notices go to {propertyPreview || "the property address"}
        </span>
      ) : (
        <AddressFields value={value} onChange={onChange} stateLocked={false} unitLabel="Unit or PO box" />
      )}
    </div>
  );
}

/** Labeled striped placeholder. Real photography replaces these. */
export function PhotoSlot({ label, ratio = "16 / 9", size }: { label: string; ratio?: string; size?: number }) {
  return (
    <div style={{
      borderRadius: size ? radius.md : radius.xl, overflow: "hidden",
      border: `1px solid ${color.hairline}`,
      width: size ?? undefined, height: size ?? undefined,
      aspectRatio: size ? undefined : ratio,
      backgroundColor: "oklch(0.955 0.012 145)",
      backgroundImage: "repeating-linear-gradient(135deg, oklch(0.91 0.016 148) 0 10px, oklch(0.955 0.012 145) 10px 20px)",
      display: "flex", alignItems: "flex-end", padding: size ? 4 : 16,
    }}>
      {size ? null : (
        <Mono style={{ background: color.surface, border: `1px solid ${color.borderInput}`, borderRadius: 4, padding: "6px 10px", color: color.inkSecondary }}>
          {label}
        </Mono>
      )}
    </div>
  );
}
