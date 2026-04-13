import { DUES_FREQUENCY_LABELS, formatDuesScheduleLine } from "@/lib/community/billing-display";
import { formatUsdFromCents } from "@/lib/format/money";
import type { PublicDuesDisplay } from "@/lib/types/community";

type Props = {
  dues: PublicDuesDisplay;
};

export function PaymentBillingSummary({ dues }: Props) {
  const schedule = formatDuesScheduleLine(dues);
  const feeOk = dues.hoa_fee_amount_cents != null && dues.hoa_fee_amount_cents > 0;
  const methods = dues.payment_methods_note?.trim();
  const late = dues.late_fee_policy_note?.trim();
  if (!feeOk && !schedule && !methods && !late) return null;

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-secondary/25 bg-secondary-container/15 p-5 text-on-surface">
      <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-secondary">
        Association billing
      </p>
      {feeOk ? (
        <p className="font-headline text-xl font-bold text-on-surface">
          {formatUsdFromCents(dues.hoa_fee_amount_cents!)}
          {dues.dues_frequency ? (
            <span className="ml-2 text-sm font-semibold text-on-surface-variant normal-case">
              ({DUES_FREQUENCY_LABELS[dues.dues_frequency].toLowerCase()})
            </span>
          ) : (
            <span className="ml-2 text-sm font-semibold text-on-surface-variant">
              regular assessment
            </span>
          )}
        </p>
      ) : null}
      {schedule ? <p className="text-sm text-on-surface-variant">{schedule}</p> : null}
      {methods ? (
        <div className="text-sm">
          <span className="font-semibold text-on-surface">How to pay: </span>
          <span className="text-on-surface-variant whitespace-pre-wrap">{methods}</span>
        </div>
      ) : null}
      {late ? (
        <div className="text-sm border-t border-outline-variant/15 pt-3">
          <span className="font-semibold text-on-surface">Late fees: </span>
          <span className="text-on-surface-variant whitespace-pre-wrap">{late}</span>
        </div>
      ) : null}
    </div>
  );
}
