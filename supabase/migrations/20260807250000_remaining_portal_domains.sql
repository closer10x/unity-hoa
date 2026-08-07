-- The eight portal domains that had no schema: violations, architectural
-- review, bookings, vendors, legal cases, meetings, directors and portfolios.
--
-- Until now these sections rendered empty because nothing backed them. Shapes
-- follow lib/admin-portal/types.ts so the loader maps straight across.
--
-- Every table is service-role only, like the rest of the portal: RLS is on
-- with no anon/authenticated policies, and reads go through the admin session.

-- ─── Portfolios ──────────────────────────────────────────────────────
-- Product rule 8: portfolios are created and scoped, never deleted. There is
-- deliberately no delete affordance in the UI, and none needed here.
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_communities (
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  community_id text not null,
  primary key (portfolio_id, community_id)
);

-- ─── Vendors ─────────────────────────────────────────────────────────
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  contact_name text,
  contact_phone text,
  contact_email text,
  -- Structured per product rule 6.
  street_number text,
  street_name text,
  unit text,
  city text,
  state text default 'Texas',
  zip text,
  contract_start date,
  contract_end date,
  insurance_expires_on date,
  ytd_spend_cents bigint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Violations ──────────────────────────────────────────────────────
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  reference text,
  community text,
  address text not null,
  violation_type text not null,
  source text,
  inspector text,
  -- Whole days; legally significant, so stored as an integer not free text.
  cure_days integer,
  opened_on date not null default current_date,
  status text not null default 'Reported',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists violations_status_idx on public.violations (status);

-- Every notice sent, per the handoff's mailing record.
create table if not exists public.violation_mailings (
  id uuid primary key default gen_random_uuid(),
  violation_id uuid not null references public.violations (id) on delete cascade,
  kind text not null,
  method text not null,
  sent_on date not null default current_date,
  tracking text,
  delivery_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.violation_notes (
  id uuid primary key default gen_random_uuid(),
  violation_id uuid not null references public.violations (id) on delete cascade,
  body text not null,
  author_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.violation_photos (
  id uuid primary key default gen_random_uuid(),
  violation_id uuid not null references public.violations (id) on delete cascade,
  storage_path text not null,
  content_type text,
  byte_size bigint,
  created_at timestamptz not null default now()
);

-- ─── Architectural review ────────────────────────────────────────────
create table if not exists public.arc_applications (
  id uuid primary key default gen_random_uuid(),
  reference text,
  title text not null,
  owner_name text,
  address text,
  project_type text,
  contractor text,
  submitted_on date not null default current_date,
  -- The 30-day statutory clock. Computed server-side from submitted_on so a
  -- client cannot move a legal deadline.
  due_on date generated always as (submitted_on + interval '30 days') stored,
  status text not null default 'Awaiting decision',
  decision_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.arc_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.arc_applications (id) on delete cascade,
  body text not null,
  author_name text not null,
  -- 'owner' | 'committee' | 'staff' | 'internal'. Internal notes are never
  -- shown to the owner; the column is what enforces that downstream.
  audience text not null default 'owner',
  attachment_path text,
  created_at timestamptz not null default now()
);

-- ─── Bookings ────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  resident_name text not null,
  amenity text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  guest_count integer,
  event_type text,
  deposit_status text default 'Not required',
  -- Alcohol requires a certificate of insurance on file; the UI blocks
  -- submission without it and this records the pair.
  alcohol boolean not null default false,
  insurance_on_file boolean not null default false,
  status text not null default 'Requested',
  office_notes text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_starts_idx on public.bookings (starts_at);

-- ─── Legal cases ─────────────────────────────────────────────────────
create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  address text,
  balance_cents bigint not null default 0,
  stage text not null default 'Referred to counsel',
  counsel text,
  -- Liens, suits and foreclosures require a recorded board vote; storing the
  -- date makes that requirement auditable rather than a UI convention.
  board_vote_on date,
  opened_on date not null default current_date,
  closed_on date,
  created_at timestamptz not null default now()
);

-- ─── Board and meetings ──────────────────────────────────────────────
create table if not exists public.directors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  street_number text,
  street_name text,
  unit text,
  city text,
  state text default 'Texas',
  zip text,
  term_start date,
  term_end date,
  created_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  community text,
  meeting_type text,
  -- The handoff rejected a combined "time & place" field; these stay separate.
  starts_at timestamptz not null,
  location text,
  address text,
  status text not null default 'Scheduled',
  -- 144 hours for a regular meeting, 10 days for the annual.
  notice_required_hours integer,
  notice_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_minutes (
  meeting_id uuid primary key references public.meetings (id) on delete cascade,
  attendance text,
  body text,
  motions text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─── RLS on, no public policies ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'portfolios','portfolio_communities','vendors','violations','violation_mailings',
    'violation_notes','violation_photos','arc_applications','arc_messages','bookings',
    'legal_cases','directors','meetings','meeting_minutes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
