import Link from "next/link";

import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { formatDateTimeInTimezone } from "@/lib/format/datetime-community";
import { formatUsdFromCents } from "@/lib/format/money";
import { unitLotToIndex } from "@/lib/payments/unit-lot-index";
import { stripeDashboardPaymentUrl } from "@/lib/stripe/dashboard-links";
import type {
  ResidentPaymentAdminRow,
  ResidentPaymentStatus,
} from "@/lib/types/resident-payments-admin";

import { CopyFieldButton } from "./copy-field-button";
import { ResidentPaymentDeleteControl } from "./resident-payment-delete-control";

const STATUS_OPTIONS: (ResidentPaymentStatus | "all")[] = [
  "all",
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "canceled",
];

function paymentsTabHref(args: {
  status?: ResidentPaymentStatus | "all";
  q?: string;
  unit?: number | null;
}): string {
  const p = new URLSearchParams();
  p.set("tab", "payments");
  if (args.status && args.status !== "all") p.set("status", args.status);
  if (args.q?.trim()) p.set("q", args.q.trim());
  if (args.unit != null && args.unit >= 1 && args.unit <= FINANCE_ACCOUNT_NUMBER_MAX) {
    p.set("unit", String(args.unit));
  }
  const qs = p.toString();
  return qs ? `/admin/finances?${qs}` : "/admin/finances";
}

function paymentDuplicateKeys(rows: ResidentPaymentAdminRow[]): string[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    const u = unitLotToIndex(r.unit_lot, FINANCE_ACCOUNT_NUMBER_MAX);
    const key = `${u ?? "?"}-${r.amount_cents}-${day}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

type Props = {
  items: ResidentPaymentAdminRow[];
  listError: string | null;
  timeZone: string | null;
  statusFilter: ResidentPaymentStatus | "all";
  searchDefault: string;
  unitFilter: number | null;
};

export function HoaPaymentsTab({
  items,
  listError,
  timeZone,
  statusFilter,
  searchDefault,
  unitFilter,
}: Props) {
  const dupKeys = paymentDuplicateKeys(items);
  const paid = items.filter((r) => r.status === "paid");
  const inFlight = items.filter((r) => r.status === "pending" || r.status === "processing");
  const troubled = items.filter(
    (r) => r.status === "failed" || r.status === "expired" || r.status === "canceled",
  );
  const paidSum = paid.reduce((s, r) => s + r.amount_cents, 0);

  return (
    <>
      <p className="text-on-surface-variant text-sm max-w-2xl">
        Resident HOA card payments from Stripe Checkout. Use unit numbers 1–{FINANCE_ACCOUNT_NUMBER_MAX}{" "}
        consistently on the payment form and in profiles for accurate roster matching. Times use the
        association timezone from Settings when set.
      </p>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Paid (visible rows)
          </p>
          <p className="text-xl font-headline font-bold text-on-surface mt-1">
            {paid.length} · {formatUsdFromCents(paidSum)}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Pending / processing
          </p>
          <p className="text-xl font-headline font-bold text-on-surface mt-1">{inFlight.length}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Failed / expired / canceled
          </p>
          <p className="text-xl font-headline font-bold text-on-surface mt-1">{troubled.length}</p>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        KPIs reflect the filtered list below (up to 500 rows). Narrow filters for a precise period.
      </p>

      {dupKeys.length > 0 ? (
        <div
          className="rounded-lg border border-outline-variant/20 bg-amber-500/10 px-4 py-3 text-sm text-on-surface"
          role="status"
        >
          <span className="font-semibold">Possible duplicate checkouts: </span>
          {dupKeys.length} group(s) share the same unit (or unknown), amount, and calendar day—confirm
          in Stripe if needed.
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((st) => {
            const active = st === statusFilter;
            return (
              <Link
                key={st}
                href={paymentsTabHref({
                  status: st,
                  q: searchDefault,
                  unit: unitFilter,
                })}
                className={
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " +
                  (active
                    ? "bg-secondary text-on-secondary border-secondary"
                    : "border-outline-variant/25 text-on-surface-variant hover:bg-surface-container-high/50")
                }
              >
                {st === "all" ? "All statuses" : st}
              </Link>
            );
          })}
        </div>
        <form method="get" action="/admin/finances" className="flex flex-wrap gap-2 items-center">
          <input type="hidden" name="tab" value="payments" />
          {statusFilter !== "all" ? <input type="hidden" name="status" value={statusFilter} /> : null}
          {unitFilter != null ? <input type="hidden" name="unit" value={String(unitFilter)} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={searchDefault}
            placeholder="Search name, unit, Stripe id…"
            className="min-w-[12rem] flex-1 bg-surface-container-highest rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-sm font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {unitFilter != null ? (
        <p className="text-sm text-on-surface-variant">
          Filtered to unit{" "}
          <span className="font-semibold text-on-surface">{unitFilter}</span>.{" "}
          <Link href={paymentsTabHref({ status: statusFilter, q: searchDefault })} className="text-secondary font-semibold hover:underline">
            Clear unit filter
          </Link>
        </p>
      ) : null}

      {listError ? (
        <p className="text-sm text-error" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest overflow-x-auto">
        <table className="w-full text-sm min-w-[64rem]">
          <thead className="bg-surface-container-high/80 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-3 py-3 font-bold">Created</th>
              <th className="px-3 py-3 font-bold">Paid on</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">Unit</th>
              <th className="px-3 py-3 font-bold">Payer</th>
              <th className="px-3 py-3 font-bold text-right">Amount</th>
              <th className="px-3 py-3 font-bold">Stripe</th>
              <th className="px-3 py-3 font-bold w-24"> </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                  No payments match these filters.
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const pi = row.stripe_payment_intent_id;
                const dashUrl = pi ? stripeDashboardPaymentUrl(pi) : null;
                const payer = [row.payer_first_name, row.payer_last_name].filter(Boolean).join(" ");
                return (
                  <tr
                    key={row.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-high/40"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-on-surface-variant">
                      {formatDateTimeInTimezone(row.created_at, timeZone)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-on-surface-variant">
                      {row.status === "paid"
                        ? formatDateTimeInTimezone(row.paid_at ?? row.updated_at, timeZone)
                        : "—"}
                    </td>
                    <td className="px-3 py-3 capitalize">{row.status}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{row.unit_lot?.trim() || "—"}</td>
                    <td className="px-3 py-3 max-w-[14rem]">
                      <div className="truncate" title={payer || undefined}>
                        {payer || "—"}
                      </div>
                      {row.payer_phone?.trim() ? (
                        <div className="text-xs text-on-surface-variant truncate">{row.payer_phone}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                      {formatUsdFromCents(row.amount_cents)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {dashUrl ? (
                          <a
                            href={dashUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-secondary hover:underline"
                          >
                            Dashboard
                          </a>
                        ) : null}
                        {pi ? (
                          <div className="flex items-center gap-1 max-w-[11rem]">
                            <code className="text-[10px] truncate text-on-surface-variant" title={pi}>
                              {pi}
                            </code>
                            <CopyFieldButton value={pi} label="Copy PI" />
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap align-middle">
                      <ResidentPaymentDeleteControl paymentId={row.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
