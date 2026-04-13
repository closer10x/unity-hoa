-- Unity HOA — apply entire schema in one go (Supabase SQL Editor)
-- Paste this whole file → Run once. Safe to re-run where IF NOT EXISTS / OR REPLACE applies.
-- After success: backfill + promote admin at the bottom (uncomment / edit UUID).

-- =============================================================================
-- 20260326120000_maintenance_work_orders.sql
-- =============================================================================

-- HOA maintenance: employees, work orders, attachments, storage bucket
-- Run in Supabase SQL editor or via CLI. Service role bypasses RLS for server-side access.

-- Extensions
create extension if not exists "pgcrypto";

-- Enums as check constraints (text columns)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists employees_active_idx on public.employees (active) where active = true;

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number text not null unique,
  title text not null,
  description text,
  location text,
  category text not null default 'other'
    check (category in ('plumbing', 'electrical', 'hvac', 'grounds', 'security', 'other')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'pending', 'completed', 'cancelled')),
  reported_by_name text,
  reported_by_unit text,
  reported_by_email text,
  assigned_to uuid references public.employees (id) on delete set null,
  due_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_status_idx on public.work_orders (status);
create index if not exists work_orders_assigned_idx on public.work_orders (assigned_to);

create table if not exists public.work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  storage_path text not null,
  content_type text,
  byte_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists work_order_attachments_wo_idx on public.work_order_attachments (work_order_id);

-- Work order number: WO-YYYY-NNNNNN (global sequence, year from insert time)
create sequence if not exists public.work_order_number_seq;

create or replace function public.set_work_order_number()
returns trigger
language plpgsql
as $$
declare
  seq_val bigint;
  yr text;
begin
  if new.work_order_number is not null and new.work_order_number <> '' then
    return new;
  end if;
  seq_val := nextval('public.work_order_number_seq');
  yr := to_char(timezone('utc', now()), 'YYYY');
  new.work_order_number := 'WO-' || yr || '-' || lpad(seq_val::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_work_order_number on public.work_orders;
create trigger trg_work_order_number
  before insert on public.work_orders
  for each row
  execute function public.set_work_order_number();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_work_orders_updated_at on public.work_orders;
create trigger trg_work_orders_updated_at
  before update on public.work_orders
  for each row
  execute function public.set_updated_at();

-- RLS: enabled; no policies for anon/authenticated = deny via Postgres for those roles.
-- Service role bypasses RLS.
alter table public.employees enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_attachments enable row level security;

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('work-order-images', 'work-order-images', false)
on conflict (id) do nothing;

-- Optional: restrict direct storage access; server uses service role for upload/signed URLs
-- Policies for authenticated users can be added when Supabase Auth is wired.

comment on table public.employees is 'HOA staff assignable to work orders';
comment on table public.work_orders is 'Maintenance / work orders';
comment on table public.work_order_attachments is 'Image metadata; files in storage bucket work-order-images';

-- =============================================================================
-- 20260326130000_profiles_settings.sql
-- =============================================================================

-- Auth profiles (admin vs basic), community settings, notification preferences.
-- After first user signs up, promote to admin:
--   update public.profiles set role = 'admin' where id = '<auth.users.id>';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'basic' check (role in ('admin', 'basic')),
  display_name text,
  phone text,
  unit_lot text,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'basic');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create table if not exists public.community_settings (
  id int primary key default 1 check (id = 1),
  association_name text,
  support_email text,
  timezone text default 'America/New_York',
  mailing_address text,
  allow_resident_directory boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.community_settings enable row level security;

insert into public.community_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create policy "community_settings_admin_select"
  on public.community_settings for select
  using (public.is_admin(auth.uid()));

create policy "community_settings_admin_update"
  on public.community_settings for update
  using (public.is_admin(auth.uid()));

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  announcements boolean not null default true,
  maintenance_updates boolean not null default true,
  billing_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_own_all"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.profiles is 'App roles; one row per auth user; default basic via trigger';
comment on table public.community_settings is 'Single-row HOA / association profile (id must be 1)';
comment on table public.notification_preferences is 'Per-user notification toggles';

-- =============================================================================
-- 20260326210000_community_admin_core.sql
-- =============================================================================

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

alter table public.finance_transactions
  add column if not exists entered_by_user_id uuid references public.profiles (id) on delete set null;

alter table public.finance_transactions
  add column if not exists entered_by_name text;

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

-- =============================================================================
-- 20260327130000_admin_notifications.sql
-- =============================================================================

-- In-app admin notification feed + per-user read state (reader_key = auth user id as text)
-- Uses existing public.notification_preferences from profiles_settings migration.
-- Service role (Next.js server) bypasses RLS.

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in (
      'work_order_created',
      'work_order_updated',
      'work_order_attachment_added',
      'work_order_due_soon',
      'work_order_overdue',
      'announcement_created',
      'announcement_updated',
      'community_event_created',
      'community_event_updated'
    )),
  title text not null,
  body text,
  href text,
  entity_type text
    check (entity_type is null or entity_type in ('work_order', 'announcement', 'community_event')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_entity_idx
  on public.admin_notifications (entity_type, entity_id)
  where entity_id is not null;

create table if not exists public.admin_notification_reads (
  notification_id uuid not null
    references public.admin_notifications (id) on delete cascade,
  reader_key text not null default 'default',
  read_at timestamptz not null default now(),
  primary key (notification_id, reader_key)
);

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;

comment on table public.admin_notifications is 'HOA admin in-app notification feed (server-enqueued)';
comment on table public.admin_notification_reads is 'Read state per admin (reader_key = auth.users.id::text)';

create or replace function public.admin_unread_notification_count(p_reader text default 'default')
returns bigint
language sql
stable
as $$
  select count(*)::bigint
  from public.admin_notifications n
  where not exists (
    select 1
    from public.admin_notification_reads r
    where r.notification_id = n.id
      and r.reader_key = coalesce(nullif(trim(p_reader), ''), 'default')
  );
$$;

create or replace function public.admin_mark_all_notifications_read(p_reader text default 'default')
returns void
language sql
as $$
  insert into public.admin_notification_reads (notification_id, reader_key)
  select n.id, coalesce(nullif(trim(p_reader), ''), 'default')
  from public.admin_notifications n
  where not exists (
    select 1
    from public.admin_notification_reads r
    where r.notification_id = n.id
      and r.reader_key = coalesce(nullif(trim(p_reader), ''), 'default')
  );
$$;

-- =============================================================================
-- 20260327140000_notification_prefs_events_email.sql
-- =============================================================================

-- Extend notification_preferences: community events + explicit email channel flags

alter table public.notification_preferences
  add column if not exists events boolean not null default true;

alter table public.notification_preferences
  add column if not exists email_announcements boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_maintenance_updates boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_events boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_billing_reminders boolean not null default false;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.set_updated_at();

-- =============================================================================
-- 20260328000000_finance_transactions_occurred_on_repair.sql
-- =============================================================================

alter table public.finance_transactions
  add column if not exists occurred_on date not null default ((timezone('utc', now()))::date);

create index if not exists finance_transactions_occurred_idx
  on public.finance_transactions (occurred_on desc);

-- =============================================================================
-- 20260329000000_finance_transactions_amount_cents_repair.sql
-- =============================================================================

alter table public.finance_transactions
  add column if not exists amount_cents bigint not null default 0;

-- =============================================================================
-- 20260330120000_finance_transactions_ledger_columns_repair.sql
-- =============================================================================

alter table public.finance_transactions
  add column if not exists kind text;

update public.finance_transactions
  set kind = 'expense'
  where kind is null;

alter table public.finance_transactions
  alter column kind set not null;

alter table public.finance_transactions
  add column if not exists category text;

update public.finance_transactions
  set category = 'other'
  where category is null;

alter table public.finance_transactions
  alter column category set not null;

alter table public.finance_transactions
  alter column category set default 'other';

alter table public.finance_transactions
  add column if not exists description text;

update public.finance_transactions
  set description = ''
  where description is null;

alter table public.finance_transactions
  alter column description set not null;

alter table public.finance_transactions
  add column if not exists created_at timestamptz;

update public.finance_transactions
  set created_at = now()
  where created_at is null;

alter table public.finance_transactions
  alter column created_at set not null;

alter table public.finance_transactions
  alter column created_at set default now();

alter table public.finance_transactions
  add column if not exists entered_by_user_id uuid references public.profiles (id) on delete set null;

alter table public.finance_transactions
  add column if not exists entered_by_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'finance_transactions'
      and c.conname = 'finance_transactions_kind_check'
  ) then
    alter table public.finance_transactions
      add constraint finance_transactions_kind_check
      check (kind in ('income', 'expense', 'transfer'));
  end if;
end $$;

-- =============================================================================
-- 20260331120000_resident_payments_stripe.sql
-- =============================================================================

-- Resident HOA payments via Stripe Checkout + webhook idempotency.

create table if not exists public.resident_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'expired', 'canceled')),
  unit_lot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resident_payments_user_id_idx
  on public.resident_payments (user_id);

create index if not exists resident_payments_checkout_session_idx
  on public.resident_payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.resident_payments enable row level security;

create policy "resident_payments_select_own"
  on public.resident_payments for select
  using (auth.uid() = user_id);

create or replace function public.set_resident_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_resident_payments_updated_at on public.resident_payments;
create trigger trg_resident_payments_updated_at
  before update on public.resident_payments
  for each row
  execute function public.set_resident_payments_updated_at();

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

create policy "stripe_webhook_events_deny_all"
  on public.stripe_webhook_events
  for all
  using (false)
  with check (false);

-- =============================================================================
-- 20260331130000_resident_payments_payer_fields.sql
-- =============================================================================

alter table public.resident_payments
  add column if not exists payer_first_name text;

alter table public.resident_payments
  add column if not exists payer_last_name text;

alter table public.resident_payments
  add column if not exists payer_phone text;

-- =============================================================================
-- 20260331140000_finance_transactions_customer_fields.sql
-- =============================================================================

alter table public.finance_transactions
  add column if not exists unit_no text;

alter table public.finance_transactions
  add column if not exists customer_first_name text;

alter table public.finance_transactions
  add column if not exists customer_last_name text;

-- =============================================================================
-- 20260331150000_profiles_unit_lot_repair.sql
-- =============================================================================

alter table public.profiles
  add column if not exists unit_lot text;

-- =============================================================================
-- 20260331200000_hoa_dashboard_billing.sql
-- =============================================================================

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

-- =============================================================================
-- 20260401000000_resident_payments_paid_at.sql
-- =============================================================================

alter table public.resident_payments
  add column if not exists paid_at timestamptz;

-- =============================================================================
-- 20260402000000_profile_avatars.sql
-- =============================================================================

alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Object path in profile-avatars bucket; app issues signed URLs for display';

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

-- =============================================================================
-- After migrations: existing Auth users need a profiles row (trigger only runs on new signups)
-- =============================================================================

insert into public.profiles (id, role)
select u.id, 'basic'::text
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- =============================================================================
-- Make yourself admin: paste your UUID from Dashboard → Authentication → Users
-- =============================================================================

-- update public.profiles set role = 'admin' where id = 'PASTE-YOUR-USER-UUID-HERE';
