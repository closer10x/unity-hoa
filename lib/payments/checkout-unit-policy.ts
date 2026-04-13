import { FINANCE_ACCOUNT_NUMBER_MAX } from "@/lib/constants/finance-ledger";

import { unitLotToIndex } from "./unit-lot-index";

export type CheckoutUnitPolicyResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Ensures checkout unit parses to the admin Units roster (1…max) and matches
 * the signed-in user's profile when a numeric unit is on file.
 */
export function validateCheckoutUnitAgainstProfile(
  payerUnitNumber: string,
  profileUnitLot: string | null | undefined,
  maxUnits: number = FINANCE_ACCOUNT_NUMBER_MAX,
): CheckoutUnitPolicyResult {
  const payerIdx = unitLotToIndex(payerUnitNumber, maxUnits);
  if (payerIdx == null) {
    return {
      ok: false,
      error: `Enter a numeric unit number between 1 and ${maxUnits} (same as the admin Units roster).`,
    };
  }

  const rawProfile =
    typeof profileUnitLot === "string" ? profileUnitLot.trim() : "";
  if (!rawProfile) {
    return { ok: true };
  }

  const profileIdx = unitLotToIndex(profileUnitLot, maxUnits);
  if (profileIdx != null) {
    if (profileIdx !== payerIdx) {
      return {
        ok: false,
        error: `Unit must match your registered unit (${rawProfile}). Contact the HOA if this is wrong.`,
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    error: `Your account unit "${rawProfile}" is not in the standard numeric format. Ask the HOA to update your profile unit to a number between 1 and ${maxUnits} before paying online.`,
  };
}
