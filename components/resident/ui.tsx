"use client";

import React from "react";

import type { Address } from "@/lib/admin-portal/types";

/**
 * The resident portal's own primitives.
 *
 * The portal used to borrow the admin toolkit, which is right for an office
 * screen — dense mono rows, sage hairlines, everything scannable at a glance
 * because a manager reads forty records an hour. A homeowner reads their own
 * balance four times a year, so this set is the public site's language
 * instead: paper ground, white cards, olive ink, a display face on the
 * numbers that matter, and one figure per card rather than a row of them.
 *
 * Tokens come from `app/globals.css` (ink / moss / paper / line / tint …),
 * shared with the marketing pages so a resident crossing from the public site
 * into their portal does not cross a visual seam.
 *
 * The house rules still hold: no icons, no emoji, no media queries. Layout is
 * intrinsic, and the single 760px breakpoint lives in the store.
 */

/* ---------- surfaces ---------- */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{children}</h2>;
}

/**
 * A card header with its title and, optionally, an action on the right —
 * "Full ledger →" and the like. Wraps rather than squeezing on a phone.
 */
export function CardHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <CardTitle>{title}</CardTitle>
      {action}
    </div>
  );
}

export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "light" | "moss";
}) {
  const color =
    tone === "light" ? "text-white/55" : tone === "moss" ? "text-moss" : "text-faint";
  return (
    <div className={`text-[11px] font-bold tracking-[0.08em] uppercase ${color}`}>
      {children}
    </div>
  );
}

/** Status, carried by colour and a word — never a glyph. */
export function Pill({
  children,
  tone = "moss",
  onClick,
}: {
  children: React.ReactNode;
  tone?: "moss" | "amber" | "grey" | "rose";
  /** With a handler it is an action, not a status, and renders as a button. */
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={secondaryBtn}>
        {children}
      </button>
    );
  }
  const cls = {
    moss: "bg-tint text-moss",
    amber: "bg-[#F2E9D6] text-[#8A6A2F]",
    grey: "bg-paper text-muted",
    rose: "bg-[#F3E2E0] text-[#8C4A40]",
  }[tone];
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.06em] whitespace-nowrap uppercase ${cls}`}
    >
      {children}
    </span>
  );
}

/* ---------- the figure cards ---------- */

/**
 * One number, said once, large.
 *
 * `tone` is the card's weight in the row rather than a status: `ink` is the
 * thing you came to find out — the balance — and there is at most one of it
 * on a screen. `tint` is a soft second. `plain` is everything else.
 */
export function StatCard({
  label,
  value,
  note,
  tone = "plain",
  action,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ink" | "tint" | "plain";
  action?: React.ReactNode;
}) {
  const shell = {
    ink: "rounded-2xl bg-ink text-white",
    tint: "rounded-2xl bg-tint",
    plain: "rounded-2xl border border-line bg-white",
  }[tone];
  const noteCls = {
    ink: "text-white/70",
    tint: "text-body",
    plain: "text-muted",
  }[tone];

  return (
    <div className={`${shell} flex h-full flex-col p-7`}>
      <Eyebrow tone={tone === "ink" ? "light" : tone === "tint" ? "moss" : "muted"}>
        {label}
      </Eyebrow>
      {/* clamp, not a fixed 44px: at 375px three of these sit two-up and a
          four-figure balance would otherwise run past its own card. */}
      <div className="mt-3.5 font-display text-[clamp(30px,7vw,44px)] leading-none font-semibold tracking-[-0.04em]">
        {value}
      </div>
      {note ? <div className={`mt-2.5 text-sm ${noteCls}`}>{note}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * The figure row. flex-wrap rather than a fixed column count for the reason
 * written into AGENTS.md: auto-fit strands whatever does not divide into it.
 */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-4">
      {React.Children.map(children, (child) =>
        child == null ? null : (
          <div className="min-w-0 flex-[1_1_220px]">{child}</div>
        ),
      )}
    </div>
  );
}

/* ---------- rows ---------- */

/**
 * One record in a list. Not the admin auto-fit grid: a resident's lists are
 * short and read as sentences, so this is a wrapping flex line with the meta
 * kept together at its end.
 */
export function ListRow({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 py-4 ${
        last ? "" : "border-b border-line"
      }`}
    >
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-[15px] leading-[1.6] text-muted">{children}</p>;
}

/* ---------- controls ---------- */

export const inputCls =
  /* 16px so iOS does not zoom the page on focus; h-12 clears 44px. */
  "h-12 w-full rounded-lg border border-[#D8D4C6] bg-field px-3.5 text-[16px] text-ink";

export const primaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-moss disabled:opacity-60";

export const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink";

export const quietBtn =
  "inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-moss transition-colors hover:text-ink";

export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-[7px] block text-[13px] font-semibold text-body">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[13px] text-faint">{hint}</span> : null}
    </label>
  );
}

/** Form fields side by side where there is room, stacked where there is not. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">{children}</div>;
}

export function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-[#F3E2E0] px-4 py-3 text-[14px] leading-[1.5] text-[#8C4A40]">
      {children}
    </p>
  );
}

export function NoteLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-tint px-4 py-3 text-[14px] leading-[1.5] text-moss">{children}</p>
  );
}

/** Where a request has got to: three steps, no icons. */
export function Progress({ pct, step }: { pct: number; step: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-tint">
        <span className="block h-full bg-moss" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
      <span className="text-[13px] whitespace-nowrap text-faint">{step}</span>
    </div>
  );
}

/** The page's own padding, so every section agrees on its gutters. */
export const PAGE = "grid gap-4 px-[clamp(16px,4vw,44px)] pt-8 pb-14";

/* ---------- the admin toolkit's shapes, in this portal's language ----------
   The eight sections below Overview were written against the admin toolkit.
   Rather than rewrite each by hand — which is how a screen quietly drifts out
   of the design — they keep calling the same names and get the redesign from
   here. Same props, olive surfaces, no mono, larger targets. */

/** A card header with an optional meta line beneath the title. */
export function CardHeadMeta({
  title, meta, children,
}: {
  title: string; meta?: string; children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 grid gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle>{title}</CardTitle>
        {children}
      </div>
      {meta ? <p className="max-w-[70ch] text-sm leading-[1.5] text-muted">{meta}</p> : null}
    </div>
  );
}

/**
 * One record. The admin version is a five-track auto-fit grid because an
 * office reads forty at a time; a resident reads four, so this wraps as a
 * line of prose with its status kept at the end.
 */
export function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-line py-4 last:border-b-0"
      style={style}
    >
      {children}
    </div>
  );
}

export function RowMain({ label, detail }: { label: string; detail?: string; detailSize?: number }) {
  return (
    <span className="min-w-0 flex-[1_1_220px]">
      <span className="block text-[16px] font-semibold text-ink">{label}</span>
      {detail ? (
        <span className="mt-1 block text-[15px] leading-[1.55] whitespace-pre-line text-muted">
          {detail}
        </span>
      ) : null}
    </span>
  );
}

/** Status as a pill rather than mono text — the resident's colour language. */
export function Status({
  children, tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "attention" | "critical";
}) {
  const map = { neutral: "grey", positive: "moss", attention: "amber", critical: "rose" } as const;
  return <Pill tone={map[tone]}>{children}</Pill>;
}

/** Was mono. Here it is quiet sans — nothing in this portal is machine-read. */
export function Mono({
  children, style,
}: {
  children: React.ReactNode; size?: number; style?: React.CSSProperties;
}) {
  return <span className="text-sm text-faint" style={style}>{children}</span>;
}

export function TextButton({
  children, onClick, tone = "accent",
}: {
  children: React.ReactNode; onClick?: () => void;
  tone?: "accent" | "muted" | "destructive";
}) {
  const color =
    tone === "muted" ? "text-muted hover:text-ink"
      : tone === "destructive" ? "text-[#8C4A40] hover:text-ink"
        : "text-moss hover:text-ink";
  return (
    <button type="button" onClick={onClick} className={`min-h-11 text-sm font-semibold transition-colors ${color}`}>
      {children}
    </button>
  );
}

export function Primary({
  children, onClick, style,
}: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} className={primaryBtn} style={style}>
      {children}
    </button>
  );
}

export function Select({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function Input({
  value, onChange, placeholder, readOnly = false, password = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  readOnly?: boolean; mono?: boolean; password?: boolean;
  suggestions?: unknown;
}) {
  return (
    <input
      type={password ? "password" : "text"}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} ${readOnly ? "text-muted" : ""}`}
    />
  );
}

export function Area({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border border-[#D8D4C6] bg-field px-3.5 py-3 text-[16px] leading-[1.55] text-ink"
    />
  );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

export const FieldGrid = FieldRow;

export function Chip({
  children, on, onClick,
}: {
  children: React.ReactNode; on: boolean; onClick: () => void; size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "min-h-11 rounded-full px-4 text-[13px] font-bold tracking-[0.06em] uppercase transition-colors " +
        (on ? "bg-ink text-white" : "border border-line bg-white text-muted hover:border-ink")
      }
    >
      {children}
    </button>
  );
}

/** Search plus filter chips. Chips fold behind a button on a phone. */
export function FilterBar({
  query, onQuery, placeholder, filters, active, onFilter, extra,
}: {
  query: string; onQuery: (v: string) => void; placeholder: string;
  filters: string[]; active: string; onFilter: (f: string) => void;
  extra?: React.ReactNode;
  sortOptions?: { id: string; label: string }[];
  sort?: string;
  onSort?: (id: string) => void;
}) {
  const narrow = useIsNarrow();
  const [open, setOpen] = React.useState(false);
  const filtered = active && active !== filters[0];
  const show = !narrow || open;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} min-w-0 flex-[1_1_180px]`}
      />
      {narrow ? (
        <Chip on={open || Boolean(filtered)} onClick={() => setOpen((v) => !v)}>
          {filtered ? `Filter · ${active}` : open ? "Done" : "Filter"}
        </Chip>
      ) : null}
      {show ? (
        <>
          {extra}
          {filters.map((f) => (
            <Chip key={f} on={f === active} onClick={() => onFilter(f)}>{f}</Chip>
          ))}
        </>
      ) : null}
    </div>
  );
}

/** The 760px breakpoint, for primitives that cannot reach the store. */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 759px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

/** Product rule 1: the add-form sits on top, collapsed behind one button. */
export function AddDrawer({
  open, onOpen, onCancel, openLabel, title, count, note, children,
}: {
  open: boolean; onOpen: () => void; onCancel: () => void;
  openLabel: string; title: string; count?: string; note?: string;
  children: React.ReactNode;
}) {
  if (!open) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <button type="button" onClick={onOpen} className={secondaryBtn}>{openLabel}</button>
        {count ? <span className="text-sm text-muted">{count}</span> : null}
      </div>
    );
  }
  return (
    <div className="mb-4 grid gap-4 rounded-xl border border-line bg-paper p-[clamp(16px,2.5vw,22px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <TextButton tone="muted" onClick={onCancel}>Cancel</TextButton>
      </div>
      {note ? <p className="text-[14px] leading-[1.55] text-muted">{note}</p> : null}
      {children}
    </div>
  );
}

const ARC_ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.txt,.rtf";

export function DropZone({
  children,
  camera = false,
  multiple = false,
  accept,
  files,
  onFiles,
}: {
  children: React.ReactNode;
  camera?: boolean;
  multiple?: boolean;
  accept?: string;
  files?: File[];
  onFiles?: (files: File[]) => void;
}) {
  const chosen = files ?? [];
  return (
    <div className="grid gap-2">
      <label className="relative grid min-h-11 cursor-pointer place-items-center rounded-lg border border-dashed border-[#D8D4C6] bg-field px-4 py-6 text-center text-[14px] text-muted transition-colors hover:border-ink">
        {children}
        <input
          type="file"
          multiple={multiple}
          accept={accept ?? (camera ? "image/*" : ARC_ACCEPT)}
          {...(camera ? { capture: "environment" as const } : {})}
          onChange={(e) => {
            onFiles?.(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
          className="absolute h-px w-px overflow-hidden opacity-0"
        />
      </label>
      {chosen.length > 0 ? (
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-muted">
          {chosen.map((f) => (
            <span key={`${f.name}-${f.size}`}>{f.name}</span>
          ))}
          {onFiles ? (
            <button
              type="button"
              onClick={() => onFiles([])}
              className="min-h-11 text-sm font-semibold text-muted hover:text-ink"
            >
              Remove
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/** Summary tiles, so sections written against the admin names still get the
    resident's figure cards. */
export function Tiles({ children }: { children: React.ReactNode; min?: number }) {
  return <StatRow>{children}</StatRow>;
}

export function Tile({
  label, value, note,
}: {
  label: string; value: string; note?: string;
}) {
  return <StatCard label={label} value={value} note={note} />;
}

export { CardHeadMeta as SectionHead };

/* ---------- the token names, mapped onto the olive palette ----------------
   The sections style inline against `color.*` / `pad.*` / `radius.*`. Rather
   than rewrite several hundred style objects — the kind of edit that breaks
   one screen in five and is not caught until somebody opens it — the names
   resolve here to the resident palette. Same keys, olive values. */

export const color = {
  surface: "#FFFFFF",
  surfaceSunken: "#FAF9F5",
  surfaceMuted: "#F4F3EE",
  hairline: "#E3E0D5",
  hairlineSoft: "#E9E7DC",
  borderInput: "#D8D4C6",
  ink: "#333D26",
  inkSecondary: "#4F5645",
  inkTertiary: "#7C8272",
  inkQuaternary: "#9BA091",
  neutral: "#9BA091",
  positive: "#5A6B3C",
  attention: "#8A6A2F",
  critical: "#8C4A40",
  destructive: "#8C4A40",
  accent: "#333D26",
  accentTint: "#E9EBDD",
  accentTintBorder: "#DDE3C6",
  chipOn: "#E9EBDD",
  chipOnText: "#5A6B3C",
} as const;

/* Nothing in this portal is machine-read, so the mono face resolves to the
   body face — a resident's amounts are prose, not a column to scan. */
export const font = {
  mono: "var(--font-franklin), ui-sans-serif, system-ui, sans-serif",
  display: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
} as const;

export const pad = {
  card: "clamp(18px, 3vw, 30px)",
  shell: "clamp(16px, 2.5vw, 24px)",
  gap: "16px",
} as const;

export const radius = { md: 10, lg: 12, xl: 16, card: 16, pill: 999 } as const;

/* ---------- the remaining shapes the sections call ---------- */

/** Product rule 3: every action confirms inline, in plain language. */
export function ConfirmBar({
  text, confirmLabel, onCancel, onConfirm,
}: {
  text: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-tint px-4 py-4">
      <span className="min-w-0 flex-[1_1_260px] text-[15px] leading-[1.55] text-body">{text}</span>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <TextButton tone="muted" onClick={onCancel}>Cancel</TextButton>
        <button type="button" onClick={onConfirm} className={primaryBtn}>{confirmLabel}</button>
      </span>
    </div>
  );
}

/**
 * Product rule 6: a mailing address is structured fields behind a "same as
 * property" toggle, never one free-text line.
 */
export function MailingAddress({
  same, onToggle, value, onChange, propertyPreview,
}: {
  same: boolean; onToggle: () => void; value: Address;
  onChange: (a: Address) => void; propertyPreview: string;
}) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <span className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-body">Mailing address</span>
        <Chip on={same} onClick={onToggle}>
          {same ? "Same as property" : "Different address"}
        </Chip>
      </span>
      {same ? (
        <p className="rounded-lg bg-paper px-4 py-3 text-[15px] leading-[1.6] text-muted">
          {propertyPreview || "Your property address"}
        </p>
      ) : (
        <FieldRow>
          <Field label="Street number">
            <input value={value.streetNo} onChange={(e) => set({ streetNo: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Street name">
            <input value={value.street} onChange={(e) => set({ street: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Unit or lot no." hint="Optional">
            <input value={value.unit} onChange={(e) => set({ unit: e.target.value })} className={inputCls} />
          </Field>
          <Field label="City">
            <input value={value.city} onChange={(e) => set({ city: e.target.value })} className={inputCls} />
          </Field>
          <Field label="State">
            <input value={value.state} onChange={(e) => set({ state: e.target.value })} className={inputCls} />
          </Field>
          <Field label="ZIP">
            <input value={value.zip} onChange={(e) => set({ zip: e.target.value })} className={inputCls} inputMode="numeric" />
          </Field>
        </FieldRow>
      )}
    </div>
  );
}

/** A labelled image placeholder, until real photography is supplied. */
export function PhotoSlot({
  label, ratio = "16 / 9", size,
}: {
  label: string; ratio?: string; size?: number;
}) {
  return (
    <div
      className="flex items-end overflow-hidden rounded-xl border border-line bg-tint"
      style={{
        width: size ?? undefined,
        height: size ?? undefined,
        aspectRatio: size ? undefined : ratio,
        padding: size ? 4 : 16,
      }}
    >
      <span className="rounded bg-white/80 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * A real image picker: preview, replace, remove. Photo is optional — the
 * parent decides whether a missing file blocks the save.
 *
 * Not wrapped in Field (a `<label>`): Replace/Remove would otherwise also
 * open the file dialog.
 */
export function PhotoPicker({
  label,
  hint,
  file,
  onChange,
  size = 112,
}: {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  size?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <span className="mb-[7px] block text-[13px] font-semibold text-body">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-end overflow-hidden rounded-xl border border-line bg-tint text-left"
        style={{
          width: size,
          height: size,
          padding: preview ? 0 : 8,
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span className="rounded bg-white/80 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
            {file ? "Replace photo" : "Add a photo"}
          </span>
        )}
      </button>
      {file ? (
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3">
          <TextButton onClick={() => inputRef.current?.click()}>Replace</TextButton>
          <TextButton tone="muted" onClick={() => onChange(null)}>Remove</TextButton>
        </span>
      ) : null}
      {hint ? <span className="mt-1.5 block text-[13px] text-faint">{hint}</span> : null}
    </div>
  );
}

/** Thumbnail that opens the full image. Used on pet, vehicle and request rows. */
export function RecordPhoto({
  href,
  alt,
  size = 48,
}: {
  href: string;
  alt: string;
  size?: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${alt} — open full size`}
      style={{ display: "block", lineHeight: 0, flex: "0 0 auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt={alt}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: 8,
          border: `1px solid ${color.hairlineSoft}`,
        }}
      />
    </a>
  );
}
