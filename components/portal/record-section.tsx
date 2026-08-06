"use client";

import { useMemo, useState } from "react";

import {
  ActionCell,
  AddDrawer,
  AuditTrail,
  CARD,
  DATA_ROW,
  FIELD,
  FIELD_GRID,
  LABEL,
  ListToolbar,
  SectionHeader,
  TONE,
  usePendingAction,
} from "@/components/portal/primitives";

/**
 * Config-driven admin list section.
 *
 * Every section in the handoff shares one shape — an add-form on top, a
 * searchable and chip-filtered list, and per-row "Take action…" with an inline
 * confirmation. Rather than hand-rolling that eight times (and drifting), each
 * section supplies a config and inherits the product rules identically.
 *
 * FRONTEND ONLY: records live in component state. Mutations must move
 * server-side, with the audit entry written in the same transaction.
 */

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "date" | "select" | "textarea" | "number";
  options?: readonly string[];
  optional?: boolean;
  placeholder?: string;
  mono?: boolean;
};

export type ColumnDef<R> = {
  /** Mono ref line above the primary text. */
  ref?: (r: R) => string;
  primary?: (r: R) => string;
  secondary?: (r: R) => string;
  /** Rendered as its own auto-fit cell. */
  cell?: (r: R) => { label?: string; value: string; mono?: boolean };
};

export type SectionConfig<R extends { id: string; status: S }, S extends string> = {
  group: string;
  title: string;
  lead?: string;
  searchPlaceholder: string;
  /** Fields matched against the search box. */
  searchable: (r: R) => string[];

  addLabel: string;
  addHeading: string;
  submitLabel: string;
  fields: FieldDef[];
  /** Build a record from the drawer draft; return a string to show an error. */
  build: (draft: Record<string, string>) => R | string;

  statusLabels: Record<S, string>;
  statusTone: Record<S, keyof typeof TONE>;
  transitions: Record<S, readonly S[]>;
  consequences: Record<S, string>;
  filters: ReadonlyArray<{ value: S | "all"; label: string }>;

  columns: ColumnDef<R>[];
  seed: R[];
  /** Extra control beside the add pill, e.g. a CSV import. */
  aside?: React.ReactNode;
};

export function RecordSection<
  R extends { id: string; status: S },
  S extends string,
>({
  config,
  actingStaff,
}: {
  config: SectionConfig<R, S>;
  actingStaff: string;
}) {
  const [rows, setRows] = useState<R[]>(config.seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<S | "all">("all");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<string[]>([]);
  const action = usePendingAction<S>();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return config.searchable(r).some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, filter, config]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const built = config.build(draft);
    if (typeof built === "string") return setError(built);
    setRows((prev) => [built, ...prev]);
    setAudit((prev) => [
      `${actingStaff} created ${config.columns[0]?.primary?.(built) ?? built.id}`,
      ...prev,
    ]);
    setDraft({});
    setError(null);
    setAdding(false);
  }

  function applyAction(id: string, next: S) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
    );
    setAudit((prev) => [
      `${actingStaff} set ${id} to ${config.statusLabels[next]}`,
      ...prev,
    ]);
    action.clear();
  }

  const set = (name: string) => (v: string) =>
    setDraft((d) => ({ ...d, [name]: v }));

  return (
    <section>
      <SectionHeader
        group={config.group}
        title={config.title}
        lead={config.lead}
      />

      <div className="grid gap-6">
        <AddDrawer
          label={config.addLabel}
          heading={config.addHeading}
          submitLabel={config.submitLabel}
          open={adding}
          onOpen={() => setAdding(true)}
          onCancel={() => {
            setAdding(false);
            setDraft({});
            setError(null);
          }}
          onSubmit={submit}
          error={error}
          aside={config.aside}
        >
          <div className={FIELD_GRID}>
            {config.fields.map((f) => (
              <label key={f.name} className="block w-full">
                <span className={LABEL}>
                  {f.label}
                  {f.optional ? (
                    <span className="text-outline"> (optional)</span>
                  ) : null}
                </span>
                {f.type === "select" ? (
                  <select
                    className={`${FIELD} cursor-pointer appearance-none`}
                    value={draft[f.name] ?? ""}
                    onChange={(e) => set(f.name)(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className={FIELD}
                    rows={3}
                    placeholder={f.placeholder}
                    value={draft[f.name] ?? ""}
                    onChange={(e) => set(f.name)(e.target.value)}
                  />
                ) : (
                  <input
                    className={`${FIELD}${f.mono ? " font-label" : ""}`}
                    type={f.type === "date" ? "date" : "text"}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    placeholder={f.placeholder}
                    value={draft[f.name] ?? ""}
                    onChange={(e) => set(f.name)(e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </AddDrawer>

        <ListToolbar
          query={query}
          onQuery={setQuery}
          placeholder={config.searchPlaceholder}
          filters={config.filters}
          active={filter}
          onFilter={setFilter}
        />

        {visible.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Nothing matches these filters.
          </p>
        ) : (
          <div className={`${CARD} overflow-hidden`}>
            {visible.map((r, i) => (
              <div
                key={r.id}
                className={`${DATA_ROW} hover:bg-row-hover ${
                  i > 0 ? "border-t border-hairline-soft" : ""
                }`}
              >
                {config.columns.map((c, ci) => (
                  <div key={ci} className="min-w-0">
                    {c.ref ? (
                      <p className="font-label text-xs text-secondary-muted">
                        {c.ref(r)}
                      </p>
                    ) : null}
                    {c.primary ? (
                      <p className="mt-1 text-base font-medium text-on-surface">
                        {c.primary(r)}
                      </p>
                    ) : null}
                    {c.secondary ? (
                      <p className="text-sm text-on-surface-variant">
                        {c.secondary(r)}
                      </p>
                    ) : null}
                    {c.cell ? (
                      <>
                        {c.cell(r).label ? (
                          <p className="font-label text-xs text-outline">
                            {c.cell(r).label}
                          </p>
                        ) : null}
                        <p
                          className={`mt-1 ${
                            c.cell(r).mono
                              ? "font-label text-xs"
                              : "text-sm text-on-surface-variant"
                          }`}
                        >
                          {c.cell(r).value}
                        </p>
                      </>
                    ) : null}
                  </div>
                ))}

                <div className="min-w-0">
                  <p
                    className={`font-label text-xs ${
                      TONE[config.statusTone[r.status]]
                    }`}
                  >
                    {config.statusLabels[r.status]}
                  </p>
                </div>

                <div className="min-w-0 justify-self-start">
                  <ActionCell
                    options={config.transitions[r.status]}
                    labels={config.statusLabels}
                    consequence={config.consequences}
                    actingStaff={actingStaff}
                    pending={action.forRow(r.id)}
                    onPick={(next) => action.pick(r.id, next)}
                    onCancel={action.clear}
                    onConfirm={(next) => applyAction(r.id, next)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <AuditTrail entries={audit} />
      </div>
    </section>
  );
}
