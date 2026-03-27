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
