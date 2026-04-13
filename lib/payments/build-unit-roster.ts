import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";
import type {
  ProfileUnitDirectoryRow,
  ResidentPaymentAdminRow,
} from "@/lib/types/resident-payments-admin";

import { unitLotToIndex } from "./unit-lot-index";

export type UnitRosterRow = {
  unit: number;
  profiles: ProfileUnitDirectoryRow[];
  payments: ResidentPaymentAdminRow[];
  /** Latest payment by `updated_at` (any status). */
  lastPayment: ResidentPaymentAdminRow | null;
  /** Latest `paid` row by `paid_at` then `updated_at`. */
  lastPaidPayment: ResidentPaymentAdminRow | null;
};

export function buildUnitRoster(
  profiles: ProfileUnitDirectoryRow[],
  payments: ResidentPaymentAdminRow[],
  maxUnits: number = FINANCE_ACCOUNT_NUMBER_MAX,
): UnitRosterRow[] {
  const byUnitProfiles = new Map<number, ProfileUnitDirectoryRow[]>();
  for (const p of profiles) {
    const idx = unitLotToIndex(p.unit_lot, maxUnits);
    if (idx == null) continue;
    const list = byUnitProfiles.get(idx) ?? [];
    list.push(p);
    byUnitProfiles.set(idx, list);
  }

  const byUnitPayments = new Map<number, ResidentPaymentAdminRow[]>();
  for (const pay of payments) {
    const idx = unitLotToIndex(pay.unit_lot, maxUnits);
    if (idx == null) continue;
    const list = byUnitPayments.get(idx) ?? [];
    list.push(pay);
    byUnitPayments.set(idx, list);
  }

  const rows: UnitRosterRow[] = [];
  for (let unit = 1; unit <= maxUnits; unit++) {
    const plist = byUnitProfiles.get(unit) ?? [];
    const paylist = (byUnitPayments.get(unit) ?? []).slice();
    paylist.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    const paidOnly = paylist.filter((p) => p.status === "paid");
    let lastPaidPayment: ResidentPaymentAdminRow | null = null;
    if (paidOnly.length > 0) {
      const sortedPaid = [...paidOnly].sort((a, b) => {
        const ta = new Date(a.paid_at ?? a.updated_at).getTime();
        const tb = new Date(b.paid_at ?? b.updated_at).getTime();
        return tb - ta;
      });
      lastPaidPayment = sortedPaid[0] ?? null;
    }
    rows.push({
      unit,
      profiles: plist,
      payments: paylist,
      lastPayment: paylist[0] ?? null,
      lastPaidPayment,
    });
  }
  return rows;
}
