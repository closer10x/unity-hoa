-- Community admin: dashboard metrics, finance ledger, events, announcements
-- Service role (Next.js server) bypasses RLS.

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

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default ((timezone('utc', now()))::date),
  kind text not null
    check (kind in ('income', 'expense', 'transfer')),
  category text not null default 'other',
  description text not null,
  amount_cents bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists finance_transactions_occurred_idx
  on public.finance_transactions (occurred_on desc);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  category text not null default 'other'
    check (category in ('social', 'official', 'wellness', 'other')),
  image_url text,
  rsvp_count int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_events_starts_idx
  on public.community_events (starts_at);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_status_idx on public.announcements (status);
create index if not exists announcements_published_at_idx on public.announcements (published_at desc nulls last);

drop trigger if exists trg_community_events_updated_at on public.community_events;
create trigger trg_community_events_updated_at
  before update on public.community_events
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_hoa_dashboard_metrics_updated_at on public.hoa_dashboard_metrics;
create trigger trg_hoa_dashboard_metrics_updated_at
  before update on public.hoa_dashboard_metrics
  for each row
  execute function public.set_updated_at();

alter table public.hoa_dashboard_metrics enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.community_events enable row level security;
alter table public.announcements enable row level security;

comment on table public.hoa_dashboard_metrics is 'Singleton row (id=1) for admin dashboard headline numbers';
comment on table public.finance_transactions is 'Ledger lines for admin finances view and charts';
comment on table public.community_events is 'Community calendar events';
comment on table public.announcements is 'Broadcast announcements for residents';
