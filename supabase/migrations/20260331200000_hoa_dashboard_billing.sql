-- HOA billing display fields (singleton row id=1). Nullable until admin configures.

alter table public.hoa_dashboard_metrics
  add column if not exists total_units int
    check (total_units is null or total_units >= 0);

alter table public.hoa_dashboard_metrics
  add column if not exists hoa_fee_amount_cents bigint
    check (hoa_fee_amount_cents is null or hoa_fee_amount_cents >= 0);

alter table public.hoa_dashboard_metrics
  add column if not exists hoa_due_day_of_month smallint
    check (
      hoa_due_day_of_month is null
      or (hoa_due_day_of_month >= 1 and hoa_due_day_of_month <= 28)
    );

alter table public.hoa_dashboard_metrics
  add column if not exists dues_frequency text
    check (
      dues_frequency is null
      or dues_frequency in ('monthly', 'quarterly', 'annual', 'custom')
    );

alter table public.hoa_dashboard_metrics
  add column if not exists dues_schedule_note text;

alter table public.hoa_dashboard_metrics
  add column if not exists payment_methods_note text;

alter table public.hoa_dashboard_metrics
  add column if not exists late_fee_policy_note text;

comment on column public.hoa_dashboard_metrics.total_units is 'Official unit count for dashboards; optional';
comment on column public.hoa_dashboard_metrics.hoa_fee_amount_cents is 'Regular assessment amount in cents; optional';
comment on column public.hoa_dashboard_metrics.hoa_due_day_of_month is 'Day of month dues are due (1-28); optional';
comment on column public.hoa_dashboard_metrics.dues_frequency is 'monthly | quarterly | annual | custom';
comment on column public.hoa_dashboard_metrics.dues_schedule_note is 'Free-text schedule details when frequency is custom or complex';
comment on column public.hoa_dashboard_metrics.payment_methods_note is 'ACH, check, lockbox, etc. shown on payment page';
comment on column public.hoa_dashboard_metrics.late_fee_policy_note is 'Optional grace period / late fee language';
