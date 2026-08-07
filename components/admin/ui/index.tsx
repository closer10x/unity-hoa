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
  value, onChange, placeholder, readOnly = false, mono = false, password = false, suggestions,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  /** System-assigned values: shown, never typed into. */
  readOnly?: boolean;
  mono?: boolean;
  /** Masks the value (temporary passwords an admin sets). */
  password?: boolean;
  /** Known addresses; typing offers them and fills the whole line. */
  suggestions?: AddressSuggestion[];
}) {
  const typed = value.trim().toLowerCase();
  const matches =
    !suggestions || typed.length < 1
      ? []
      : suggestions
          .filter((a) => {
            const line = `${a.streetNo} ${a.street}`.toLowerCase();
            return line.includes(typed) && line !== typed;
          })
          .slice(0, 6);

  const field = (
    <input
      type={password ? "password" : "text"}
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

  if (matches.length === 0) return field;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {field}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {matches.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onChange(`${a.streetNo} ${a.street}`.trim())}
            style={{
              font: "inherit", fontSize: 14, cursor: "pointer",
              background: color.surfaceSunken,
              border: `1px solid ${color.hairline}`,
              borderRadius: 999, padding: "7px 14px", color: color.ink,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const localISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Calendar date picker. Value is always ISO (YYYY-MM-DD); the field shows it
 * as "Aug 7, 2026". A real month grid — mono weekday headers, today tinted,
 * text-glyph month arrows — matching the Calendar section's grid language.
 */
export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const todayIso = localISO(new Date());
  const [view, setView] = React.useState(() => (selected || todayIso).slice(0, 7));

  const [vy, vm] = view.split("-").map(Number);
  const startDow = new Date(vy, vm - 1, 1).getDay();
  const daysInMonth = new Date(vy, vm, 0).getDate();
  const shift = (delta: number) => {
    const d = new Date(vy, vm - 1 + delta, 1);
    setView(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };
  const display = selected
    ? new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "";

  return (
    <div style={{ position: "relative" }}>
      <button type="button"
        onClick={() => { setView((selected || todayIso).slice(0, 7)); setOpen((v) => !v); }}
        style={{ ...inputStyle, fontFamily: font.mono, fontSize: 14, textAlign: "left", cursor: "pointer", color: display ? color.ink : color.inkQuaternary }}>
        {display || "Pick a date"}
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close the calendar" onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "transparent", border: "none", cursor: "default", zIndex: 29 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30, width: 292,
            background: color.surface, border: `1px solid ${color.borderInput}`, borderRadius: radius.lg,
            boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.14)", padding: 14, display: "grid", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <button type="button" aria-label="Previous month" onClick={() => shift(-1)}
                style={{ background: "none", border: "none", font: "inherit", fontSize: 18, cursor: "pointer", padding: "2px 10px", color: color.inkSecondary }}>
                ‹
              </button>
              <span style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {MONTHS[vm - 1]} {vy}
              </span>
              <button type="button" aria-label="Next month" onClick={() => shift(1)}
                style={{ background: "none", border: "none", font: "inherit", fontSize: 18, cursor: "pointer", padding: "2px 10px", color: color.inkSecondary }}>
                ›
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <span key={i} style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.08em", color: color.inkQuaternary, textAlign: "center", padding: "4px 0" }}>{d}</span>
              ))}
              {Array.from({ length: startDow }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const iso = `${view}-${pad2(i + 1)}`;
                const isSelected = iso === selected;
                const isToday = iso === todayIso;
                return (
                  <button key={iso} type="button"
                    onClick={() => { onChange(iso); setOpen(false); }}
                    style={{
                      font: "inherit", fontFamily: font.mono, fontSize: 13, cursor: "pointer",
                      padding: "7px 0", borderRadius: radius.sm, textAlign: "center",
                      border: `1px solid ${isSelected ? color.accent : isToday ? color.accentTintBorder : "transparent"}`,
                      background: isSelected ? color.accent : isToday ? color.accentTint : "none",
                      color: isSelected ? "oklch(0.97 0.008 140)" : color.ink,
                    }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <TextButton onClick={() => { onChange(todayIso); setView(todayIso.slice(0, 7)); setOpen(false); }}>Today</TextButton>
              {selected ? <TextButton tone="muted" onClick={() => { onChange(""); setOpen(false); }}>Clear</TextButton> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
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

/**
 * File drop zone. Accepts a drag, a click-to-browse, and — with `camera` — a
 * "Take a photo" action that opens the device camera directly, which is how an
 * inspector standing at the property will actually use it.
 *
 * `capture="environment"` asks for the rear camera. Desktop browsers ignore it
 * and fall back to the file picker, so the same control works everywhere; the
 * button is only rendered where a capture-capable input is likely, and is
 * harmless if it degrades.
 *
 * Files are held in component state and named back to the user. Nothing is
 * uploaded yet — that needs a storage bucket and a signed-upload route.
 */
export function DropZone({
  children, camera = false, onFiles,
}: {
  children: React.ReactNode;
  /** Offer a direct camera capture alongside browse. */
  camera?: boolean;
  onFiles?: (files: File[]) => void;
}) {
  /** Object URLs are revoked on unmount; leaving them alive leaks memory. */
  const [picked, setPicked] = React.useState<{ name: string; url: string | null }[]>([]);
  const [over, setOver] = React.useState(false);
  const browseRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(
    () => () => {
      picked.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setPicked((prev) => [
      ...prev,
      ...files.map((f) => ({
        name: f.name,
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      })),
    ]);
    onFiles?.(files);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        onClick={() => browseRef.current?.click()}
        style={{
          border: `1px dashed ${over ? color.accent : "oklch(0.82 0.014 145)"}`,
          background: over ? color.accentTint : undefined,
          borderRadius: radius.md, padding: 18, textAlign: "center", cursor: "pointer",
        }}
      >
        <Mono style={{ color: color.inkQuaternary }}>{children}</Mono>
      </div>

      <input
        ref={browseRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={(e) => take(e.target.files)}
        style={{ display: "none" }}
      />

      {camera ? (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => take(e.target.files)}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Pill onClick={() => cameraRef.current?.click()}>Take a photo</Pill>
            <Pill onClick={() => browseRef.current?.click()}>Choose files</Pill>
          </div>
        </>
      ) : null}

      {picked.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {picked.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                style={{ display: "grid", gap: 4, justifyItems: "center", maxWidth: 96 }}
              >
                {f.url ? (
                  /* Local object URL, not a remote asset — next/image would
                     add nothing and cannot optimise a blob. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt=""
                    style={{
                      width: 72, height: 72, objectFit: "cover",
                      borderRadius: radius.sm,
                      border: `1px solid ${color.hairline}`,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 72, height: 72, display: "grid", placeItems: "center",
                      borderRadius: radius.sm, border: `1px solid ${color.hairline}`,
                      background: color.surfaceMuted, fontSize: 11, color: color.inkQuaternary,
                    }}
                  >
                    file
                  </span>
                )}
                <Mono
                  size={11}
                  style={{
                    color: color.neutral, maxWidth: 92, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </Mono>
              </span>
            ))}
          </div>
          <span style={{ fontSize: 13, color: color.attention }}>
            Held in this form only — file upload is not wired up yet.
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- add-form drawer (product rule: always on top) ---------- */

export function AddDrawer({
  open, onOpen, onCancel, openLabel, title, note, count, children,
}: {
  open: boolean; onOpen: () => void; onCancel: () => void;
  openLabel: string; title: string; note?: string;
  /** Right-aligned total, e.g. "101 homes". */
  count?: string;
  children: React.ReactNode;
}) {
  if (!open) {
    return (
      <div style={{ padding: pad.card, borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Pill onClick={onOpen}>{openLabel}</Pill>
        {note ? <span style={{ fontSize: 14, color: color.inkTertiary }}>{note}</span> : null}
        {count ? (
          <Mono size={13} style={{ color: color.neutral, marginLeft: "auto" }}>{count}</Mono>
        ) : null}
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
