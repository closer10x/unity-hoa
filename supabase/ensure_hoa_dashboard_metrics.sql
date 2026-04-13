-- Minimal fix when the app errors: "Could not find the table 'public.hoa_dashboard_metrics' in the schema cache"
-- Run once in Supabase Dashboard → SQL → New query. Idempotent (safe to re-run).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.hoa_dashboard_metrics (
  id smallint primary key default 1 check (id = 1),
  total_residents int not null default 1284,
  resident_growth_pct numeric(5, 2),
  outstanding_dues_cents bigint not null default 2415000,
  overdue_accounts int not null default 8,
  fiscal_period_label text default 'Fiscal Year 2024-Q3',
  reserve_fund_cents bigint not null default 184000000,
  satisfaction_pct int not null default 92
    check (satisfaction_pct >= 0 and satisfaction_pct <= 100),
  pulse_note text,
  updated_at timestamptz not null default now()
);

insert into public.hoa_dashboard_metrics (id) values (1)
on conflict (id) do nothing;

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

drop trigger if exists trg_hoa_dashboard_metrics_updated_at on public.hoa_dashboard_metrics;
create trigger trg_hoa_dashboard_metrics_updated_at
  before update on public.hoa_dashboard_metrics
  for each row
  execute function public.set_updated_at();

alter table public.hoa_dashboard_metrics enable row level security;

comment on table public.hoa_dashboard_metrics is 'Singleton row (id=1) for admin dashboard headline numbers';
