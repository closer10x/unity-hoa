"use client";

import { submitHoaBillingSettings } from "@/app/admin/(dashboard)/hoa/actions";
import { DUES_FREQUENCY_LABELS } from "@/lib/community/billing-display";
import type { DuesFrequency, HoaDashboardMetricsRow } from "@/lib/types/community";
import { useActionState, useEffect, useState } from "react";

type Props = {
  metrics: HoaDashboardMetricsRow;
};

const FREQUENCY_ORDER: DuesFrequency[] = ["monthly", "quarterly", "annual", "custom"];
const FREQUENCY_OPTIONS = FREQUENCY_ORDER.map((value) => ({
  value,
  label: DUES_FREQUENCY_LABELS[value],
}));

const SAVED_MS = 2500;

export function HoaBillingSettingsTab({ metrics: m }: Props) {
  const [state, formAction, isPending] = useActionState(submitHoaBillingSettings, null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setShowSaved(true);
      const t = window.setTimeout(() => setShowSaved(false), SAVED_MS);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  const feeDollars =
    m.hoa_fee_amount_cents != null && m.hoa_fee_amount_cents > 0
      ? (m.hoa_fee_amount_cents / 100).toFixed(2)
      : "";

  let buttonLabel = "Save";
  if (isPending) buttonLabel = "Saving…";
  else if (showSaved) buttonLabel = "Saved";

  return (
    <>
      <p className="text-on-surface-variant text-sm max-w-2xl">
        Configure how dues appear on the finance summary, admin dashboard, and the public payment
        page. Headline dashboard numbers (residents, reserve, pulse) stay under Settings → Community
        profile.
      </p>

      <form
        action={formAction}
        className="space-y-4 bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10 max-w-2xl"
      >
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Total units
          </label>
          <input
            name="total_units"
            type="number"
            min={0}
            defaultValue={m.total_units ?? ""}
            placeholder="e.g. 120"
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          />
          <p className="text-xs text-on-surface-variant">
            Used on the finances summary and reports. Leave blank to fall back to the ledger unit
            range until you set a number.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              HOA fee (USD)
            </label>
            <input
              name="hoa_fee_dollars"
              defaultValue={feeDollars}
              placeholder="0.00"
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-on-surface-variant">
              Due day of month (1–28)
            </label>
            <input
              name="hoa_due_day_of_month"
              type="number"
              min={1}
              max={28}
              defaultValue={m.hoa_due_day_of_month ?? ""}
              placeholder="1"
              className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Dues frequency
          </label>
          <select
            name="dues_frequency"
            defaultValue={m.dues_frequency ?? ""}
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm"
          >
            <option value="">— Not set —</option>
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Schedule details (optional)
          </label>
          <textarea
            name="dues_schedule_note"
            rows={2}
            defaultValue={m.dues_schedule_note ?? ""}
            placeholder="e.g. Quarterly: Jan, Apr, Jul, Oct"
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Payment methods & instructions
          </label>
          <textarea
            name="payment_methods_note"
            rows={3}
            defaultValue={m.payment_methods_note ?? ""}
            placeholder="ACH routing, check payable to, mailing address, lockbox…"
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold text-on-surface-variant">
            Late fee / grace policy (optional)
          </label>
          <textarea
            name="late_fee_policy_note"
            rows={2}
            defaultValue={m.late_fee_policy_note ?? ""}
            placeholder="e.g. 10-day grace; late fee $25 after day 10"
            className="w-full bg-surface-container-highest rounded-md px-4 py-3 text-sm resize-y"
          />
        </div>

        <div className="flex flex-col items-end gap-2 pt-2">
          {state && !state.ok ? (
            <p className="text-sm text-error max-w-md text-right" role="alert">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold disabled:opacity-70"
          >
            {buttonLabel}
          </button>
        </div>
      </form>
    </>
  );
}
