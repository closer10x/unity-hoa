-- Crew links: a personal, tokenised job board for field staff.
-- Depends on: 20260326120000_maintenance_work_orders.sql
--
-- A tech gets one long-lived link, texted to them. Opening it shows only the
-- work orders assigned to that employee — no login, no access to the portal.
-- The token is the credential, so it is long, revocable and single-purpose.

create table if not exists public.crew_links (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  -- URL-safe, 32 bytes of entropy. Not guessable, not sequential.
  token text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Null means it does not expire; revoking is the normal way to end access.
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz
);

-- One live link per employee; revoked ones stay for the audit record.
create unique index if not exists crew_links_one_active_per_employee
  on public.crew_links (employee_id) where revoked_at is null;

create index if not exists crew_links_token_idx on public.crew_links (token);

alter table public.crew_links enable row level security;

-- No anon or authenticated policies: the public board is served by the
-- service role after the route validates the token. Nothing reaches this
-- table directly from a browser.

-- ─── Field notes ─────────────────────────────────────────────────────
-- work_orders.internal_notes is a single staff-only text field. Notes from
-- the field are a distinct, append-only stream with an author, so they get
-- their own table rather than being concatenated into that column.

create table if not exists public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  body text not null,
  -- Who wrote it. Free text because a crew-link author is an employee, not
  -- an auth user, and we want the name preserved even if the row is removed.
  author_name text not null,
  author_employee_id uuid references public.employees (id) on delete set null,
  -- True when written from a crew link rather than the admin portal.
  from_field boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists work_order_notes_wo_idx
  on public.work_order_notes (work_order_id, created_at desc);

alter table public.work_order_notes enable row level security;

-- Admins read and write through the service role; the crew board writes
-- through a server action that has already validated the token.
