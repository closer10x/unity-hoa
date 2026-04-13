import { Fragment } from "react";
import Link from "next/link";

import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import { formatDateTimeInTimezone } from "@/lib/format/datetime-community";
import { formatUsdFromCents } from "@/lib/format/money";
import type { UnitRosterRow } from "@/lib/payments/build-unit-roster";

import { ResidentPaymentDeleteControl } from "./resident-payment-delete-control";

type Props = {
  roster: UnitRosterRow[];
  timeZone: string | null;
};

export function UnitsRosterTab({ roster, timeZone }: Props) {
  const withActivity = roster.filter(
    (r) => r.profiles.length > 0 || r.payments.length > 0,
  ).length;

  return (
    <>
      <p className="text-on-surface-variant text-sm max-w-2xl">
        One row per unit 1–{FINANCE_ACCOUNT_NUMBER_MAX}. Profiles match when{" "}
        <code className="text-xs bg-surface-container-high px-1 rounded">unit_lot</code> is a numeric
        unit number (leading zeros allowed). Payment history lists Stripe Checkout attempts for that
        unit.
      </p>
      <p className="text-xs text-on-surface-variant">
        {withActivity} units have at least one profile or payment on file.
      </p>

      <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-lowest max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-surface-container-high/95 text-left text-[10px] uppercase tracking-wider text-on-surface-variant backdrop-blur-sm">
            <tr>
              <th className="px-3 py-3 font-bold w-16">Unit</th>
              <th className="px-3 py-3 font-bold min-w-[8rem]">Resident(s)</th>
              <th className="px-3 py-3 font-bold">Phone</th>
              <th className="px-3 py-3 font-bold">Last payment</th>
              <th className="px-3 py-3 font-bold w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((row) => {
              const namesFromProfiles = row.profiles
                .map((p) => p.display_name?.trim())
                .filter(Boolean)
                .join("; ");
              const namesFromPayer =
                row.profiles.length === 0 && row.lastPaidPayment
                  ? [
                      row.lastPaidPayment.payer_first_name,
                      row.lastPaidPayment.payer_last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "";
              const names = namesFromProfiles || namesFromPayer;
              const phonesFromProfiles = row.profiles
                .map((p) => p.phone?.trim())
                .filter(Boolean)
                .join("; ");
              const phonesFromPayer =
                row.profiles.length === 0 &&
                row.lastPaidPayment?.payer_phone?.trim()
                  ? row.lastPaidPayment.payer_phone.trim()
                  : "";
              const phones = phonesFromProfiles || phonesFromPayer;
              const paid = row.lastPaidPayment;
              const act = row.lastPayment;
              return (
                <Fragment key={row.unit}>
                  <tr className="border-t border-outline-variant/10 hover:bg-surface-container-high/30">
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{row.unit}</td>
                    <td className="px-3 py-2 max-w-[14rem]">
                      <div className="truncate" title={names || undefined}>
                        {names || "—"}
                      </div>
                      {row.profiles.some((p) => p.role === "admin") ? (
                        <span className="text-[10px] uppercase font-bold text-secondary">Admin</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant text-xs max-w-[10rem] truncate" title={phones || undefined}>
                      {phones || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {paid ? (
                        <>
                          <div className="font-medium capitalize text-secondary">Paid</div>
                          <div className="text-on-surface-variant whitespace-nowrap">
                            {formatDateTimeInTimezone(paid.paid_at ?? paid.updated_at, timeZone)}
                          </div>
                          <div className="font-medium">{formatUsdFromCents(paid.amount_cents)}</div>
                        </>
                      ) : act ? (
                        <>
                          <div className="text-[10px] uppercase font-bold text-on-surface-variant">
                            No paid checkout yet
                          </div>
                          <div className="font-medium capitalize">{act.status}</div>
                          <div className="text-on-surface-variant whitespace-nowrap">
                            {formatDateTimeInTimezone(act.updated_at, timeZone)}
                          </div>
                          <div className="font-medium">{formatUsdFromCents(act.amount_cents)}</div>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">No payments</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link
                        href={`/admin/finances?tab=payments&unit=${row.unit}`}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        Payments
                      </Link>
                    </td>
                  </tr>
                  {row.payments.length > 0 ? (
                    <tr className="bg-surface-container-low/40">
                      <td colSpan={5} className="px-3 py-2">
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-semibold text-secondary hover:underline list-none flex items-center gap-2">
                            <span className="material-symbols-outlined text-base group-open:rotate-90 transition-transform">
                              chevron_right
                            </span>
                            Payment history ({row.payments.length})
                          </summary>
                          <div className="mt-2 ml-6 rounded-lg border border-outline-variant/15 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-surface-container-high/60 text-on-surface-variant text-left">
                                <tr>
                                  <th className="px-2 py-1.5 font-bold">Paid on</th>
                                  <th className="px-2 py-1.5 font-bold">Updated</th>
                                  <th className="px-2 py-1.5 font-bold">Status</th>
                                  <th className="px-2 py-1.5 font-bold text-right">Amount</th>
                                  <th className="px-2 py-1.5 font-bold">Payer</th>
                                  <th className="px-2 py-1.5 font-bold w-20"> </th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.payments.map((p) => (
                                  <tr key={p.id} className="border-t border-outline-variant/10">
                                    <td className="px-2 py-1.5 whitespace-nowrap text-on-surface-variant">
                                      {p.status === "paid"
                                        ? formatDateTimeInTimezone(p.paid_at ?? p.updated_at, timeZone)
                                        : "—"}
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-on-surface-variant">
                                      {formatDateTimeInTimezone(p.updated_at, timeZone)}
                                    </td>
                                    <td className="px-2 py-1.5 capitalize">{p.status}</td>
                                    <td className="px-2 py-1.5 text-right font-medium">
                                      {formatUsdFromCents(p.amount_cents)}
                                    </td>
                                    <td className="px-2 py-1.5 max-w-[12rem] truncate">
                                      {[p.payer_first_name, p.payer_last_name].filter(Boolean).join(" ") || "—"}
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap align-middle">
                                      <ResidentPaymentDeleteControl paymentId={p.id} compact />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
