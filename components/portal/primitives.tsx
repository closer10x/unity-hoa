"use client";

import { useState } from "react";

/**
 * Shared admin-portal primitives, built from docs/design/handoff.md
 * ("Layout System" and "Interactions & Behavior"). Every section composes
 * these so the product rules hold uniformly:
 *
 *   rule 1 — add-forms on top, collapsed to a pill, expanding to a drawer
 *   rule 2 — status changes are "Take action…" selects of every valid state
 *   rule 3 — choosing one opens an inline confirmation naming the consequence
 *   rule 5 — every list carries search plus status chips
 *
 * No icons and no emoji anywhere: status is colour plus mono text.
 */

export const CARD = "rounded-2xl border border-outline-variant bg-surface";
export const CARD_HEAD =
  "flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant px-5 py-4 md:px-6";
export const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";
export const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface px-3.5 py-2.5 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
export const LABEL = "mb-2 block text-sm text-on-surface-variant";
/** Handoff: drawer field grids are auto-fit / minmax(180px, 1fr). */
export const FIELD_GRID =
  "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] justify-items-start gap-4";
/** Handoff: the critical data-row rule — auto-fit with a 170px floor. */
export const DATA_ROW =
  "grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-baseline justify-items-start gap-x-[18px] gap-y-2 px-5 py-4 md:px-6";
export const CHIP_ON =
  "cursor-pointer rounded-full border border-chip-on-border bg-chip-on px-3.5 py-1.5 text-sm text-chip-on-ink";
export const CHIP_OFF =
  "cursor-pointer rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1.5 text-sm text-on-surface-variant hover:border-outline";
export const BTN_PRIMARY =
  "rounded-[10px] bg-secondary px-5 py-2.5 text-[15px] font-medium text-on-secondary hover:bg-secondary-hover";
export const BTN_OUTLINE =
  "rounded-[10px] border border-outline-strong px-5 py-2.5 text-[15px] text-on-surface hover:border-outline";

/** Status tone → ink class. Colour carries the meaning. */
export const TONE: Record<string, string> = {
  positive: "text-status-positive",
  attention: "text-status-attention",
  critical: "text-status-critical",
  neutral: "text-status-neutral",
};

export function SectionHeader({
  group,
  title,
  lead,
}: {
  group: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mb-6">
      <p className={EYEBROW}>{group}</p>
      <h1 className="mt-2 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
        {title}
      </h1>
      {lead ? (
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-on-surface-variant">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/** Rule 1 — collapsed pill that expands into an inline drawer. */
export function AddDrawer({
  label,
  heading,
  open,
  onOpen,
  onCancel,
  onSubmit,
  submitLabel,
  error,
  children,
  aside,
}: {
  label: string;
  heading: string;
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error?: string | null;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  if (!open) {
    return (
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onOpen} className={`${BTN_PRIMARY} rounded-full`}>
          {label}
        </button>
        {aside}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-outline-variant bg-surface-container-low p-5 md:p-6"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-on-surface">{heading}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-secondary hover:underline"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-6">
        {children}

        {/* One error at a time, above the submit. */}
        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <button type="submit" className={BTN_PRIMARY}>
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Rule 5 — search input, optional scope select, status chips ("All" first). */
export function ListToolbar<T extends string>({
  query,
  onQuery,
  placeholder,
  filters,
  active,
  onFilter,
  scope,
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  filters: ReadonlyArray<{ value: T; label: string }>;
  active: T;
  onFilter: (v: T) => void;
  scope?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] justify-items-start gap-3">
        <label className="block w-full">
          <span className={LABEL}>Search</span>
          <input
            className={FIELD}
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        {scope}
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilter(f.value)}
            className={active === f.value ? CHIP_ON : CHIP_OFF}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Rules 2 and 3 — a "Take action…" select of every valid next state, and the
 * inline confirmation bar that names the consequence before anything applies.
 * Only one confirmation is open per list.
 */
export function ActionCell<S extends string>({
  options,
  labels,
  pending,
  onPick,
  onCancel,
  onConfirm,
  consequence,
  actingStaff,
}: {
  options: readonly S[];
  labels: Record<S, string>;
  pending: S | null;
  onPick: (next: S | null) => void;
  onCancel: () => void;
  onConfirm: (next: S) => void;
  consequence: Record<S, string>;
  actingStaff: string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">No further action.</p>
    );
  }

  return (
    <label className="block w-full">
      <span className={LABEL}>Take action…</span>
      <select
        className={`${FIELD} cursor-pointer appearance-none`}
        value={pending ?? ""}
        onChange={(e) => onPick((e.target.value || null) as S | null)}
      >
        <option value="">Take action…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
      {pending ? (
        <ConfirmBar
          label={labels[pending]}
          consequence={consequence[pending]}
          actingStaff={actingStaff}
          onCancel={onCancel}
          onConfirm={() => onConfirm(pending)}
        />
      ) : null}
    </label>
  );
}

export function ConfirmBar({
  label,
  consequence,
  actingStaff,
  onCancel,
  onConfirm,
}: {
  label: string;
  consequence: string;
  actingStaff: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-accent-tint-border bg-confirm-bar p-4">
      <p className="text-sm leading-relaxed text-on-secondary-container">
        Are you sure this is <strong>{label.toLowerCase()}</strong>?{" "}
        {consequence} It will be recorded in the audit trail as {actingStaff}{" "}
        with a timestamp.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-[10px] bg-secondary px-4 py-2.5 text-sm font-medium text-on-secondary hover:bg-secondary-hover"
        >
          Yes, {label.toLowerCase()}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] border border-outline-strong px-4 py-2.5 text-sm text-on-surface hover:border-outline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Session-scoped audit surface. The real log is append-only, written server-side. */
export function AuditTrail({ entries }: { entries: string[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-muted p-5">
      <p className={`${EYEBROW} mb-3`}>Audit trail — this session</p>
      <ul className="grid gap-2">
        {entries.map((e, i) => (
          <li key={i} className="font-label text-xs text-status-neutral">
            {e}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-on-surface-variant">
        The real log is append-only and written server-side in the same
        transaction as the mutation. It lives at Team → Audit trail.
      </p>
    </div>
  );
}

/** Small hook for the one-confirmation-per-list rule. */
export function usePendingAction<S extends string>() {
  const [pending, setPending] = useState<{ id: string; next: S } | null>(null);
  return {
    pending,
    pick: (id: string, next: S | null) =>
      setPending(next ? { id, next } : null),
    clear: () => setPending(null),
    forRow: (id: string) => (pending?.id === id ? pending.next : null),
  };
}
