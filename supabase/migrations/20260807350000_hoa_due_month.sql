-- Annual (and other non-monthly) billing needs a due month, not just a day.
alter table public.hoa_dashboard_metrics
  add column if not exists hoa_due_month smallint
  check (hoa_due_month between 1 and 12);

comment on column public.hoa_dashboard_metrics.hoa_due_month is
  'Month the HOA fee is due (1-12); pairs with hoa_due_day_of_month for annual billing.';
