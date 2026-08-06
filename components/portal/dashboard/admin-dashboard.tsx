import Link from "next/link";

/**
 * Admin → Today → Dashboard ("master dashboard"), per docs/design/handoff.md §1.
 * Metric tiles plus a prioritized action queue; each queue item routes to its
 * own section.
 *
 * Data-driven: the page supplies real aggregates where a query exists and
 * marks the rest as not yet tracked, rather than showing invented numbers.
 */

export type Kpi = {
  label: string;
  value: string;
  note: string;
  /** True when no query backs this metric yet. */
  untracked?: boolean;
};

export type QueueItem = {
  kind: string;
  title: string;
  detail: string;
  age: string;
  href: string;
};

export type CollectionRow = {
  name: string;
  rate: string;
  pct: number;
  detail: string;
};

export type CalendarItem = { date: string; title: string; detail: string };

const CARD = "rounded-2xl border border-outline-variant bg-surface";
const CARD_HEAD =
  "flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant px-5 py-4 md:px-6";
const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";

export function AdminDashboard({
  scopeLabel,
  summary,
  kpis,
  queue,
  collections,
  calendar,
}: {
  scopeLabel: string;
  summary: string;
  kpis: Kpi[];
  queue: QueueItem[];
  collections: CollectionRow[];
  calendar: CalendarItem[];
}) {
  return (
    <div className="grid gap-6 md:gap-7">
      <div>
        <h1 className="text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
          {scopeLabel}
        </h1>
        <p className="mt-2 text-[15px] text-on-surface-variant">{summary}</p>
      </div>

      {/* Summary tiles use the same auto-fit rule as data rows, 180–320px floor. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`${CARD} p-5`}>
            <p className={EYEBROW}>{k.label}</p>
            <p
              className={`mt-2.5 text-[34px] leading-none font-semibold tracking-[-0.02em] ${
                k.untracked ? "text-outline" : ""
              }`}
            >
              {k.value}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-on-surface-variant">
              {k.note}
            </p>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className="text-[17px] font-semibold">Needs your attention</h2>
          <span className="font-label text-xs text-status-neutral">
            {queue.length} open items
          </span>
        </div>
        <div>
          {queue.map((q, i) => (
            <div
              key={q.title}
              className={`grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-baseline justify-items-start gap-x-[18px] gap-y-2 px-5 py-4 hover:bg-row-hover md:px-6 ${
                i > 0 ? "border-t border-hairline-soft" : ""
              }`}
            >
              <span className="font-label text-xs text-secondary-muted">
                {q.kind}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-medium">{q.title}</span>
                <span className="block text-sm text-on-surface-variant">
                  {q.detail}
                </span>
              </span>
              <span className="font-label text-xs text-status-attention">
                {q.age}
              </span>
              <Link
                href={q.href}
                className="rounded-lg border border-outline-strong px-4 py-2 text-sm text-on-surface hover:border-outline"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className="text-[17px] font-semibold">Collections by community</h2>
          </div>
          <div className="grid gap-5 px-5 py-5 md:px-6">
            {collections.map((c) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium">{c.name}</span>
                  <span className="font-label text-sm text-status-positive">
                    {c.rate}
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className="text-[17px] font-semibold">Calendar</h2>
            <span className="font-label text-xs text-outline">
              Next 30 days
            </span>
          </div>
          <div>
            {calendar.map((e, i) => (
              <div
                key={e.title}
                className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-4 md:px-6 ${
                  i > 0 ? "border-t border-hairline-soft" : ""
                }`}
              >
                <span className="flex-none font-label text-xs text-secondary-muted">
                  {e.date}
                </span>
                <span className="min-w-0 flex-[1_1_220px]">
                  <span className="block text-base font-medium">{e.title}</span>
                  <span className="block text-sm text-on-surface-variant">
                    {e.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
