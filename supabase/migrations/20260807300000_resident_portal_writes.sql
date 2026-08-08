-- Resident-portal domains that had no schema: message threads, guest passes,
-- vehicles, pets, household members, leases and concern reports — plus the
-- columns the Account section needs to persist contact and notification saves.
--
-- Every table is service-role only, like the rest of the portal: RLS is on
-- with no anon/authenticated policies. Reads and writes go through server
-- code that scopes every query to the signed-in resident's user id.

-- ─── Messages ────────────────────────────────────────────────────────
create table if not exists public.resident_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'Management office' | 'Billing' | 'Architectural Committee' | 'Board liaison'
  party text not null,
  subject text not null,
  status text not null default 'Open',
  -- Set when the office replies; cleared when the resident opens the thread.
  resident_unread boolean not null default false,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists resident_threads_user_idx
  on public.resident_threads (user_id, last_activity_at desc);

create table if not exists public.resident_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.resident_threads (id) on delete cascade,
  author_name text not null,
  -- Distinguishes the resident's own bubbles from the office's.
  is_resident boolean not null default true,
  body text not null,
  attachment_path text,
  created_at timestamptz not null default now()
);

create index if not exists resident_messages_thread_idx
  on public.resident_messages (thread_id, created_at);

-- ─── Access & guests ─────────────────────────────────────────────────
create table if not exists public.guest_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  guest_name text not null,
  -- As the resident wrote it: "Apr 12–14", "standing". Not legally significant.
  dates text not null,
  plate text,
  code text not null,
  -- Passes are revoked, never deleted — the gate log may reference the code.
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guest_passes_user_idx
  on public.guest_passes (user_id) where revoked_at is null;

create table if not exists public.resident_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  plate text not null,
  -- 'pending' until the office hands over the windshield tag.
  tag_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists resident_vehicles_user_idx
  on public.resident_vehicles (user_id);

-- ─── Household, pets, leases ─────────────────────────────────────────
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  relationship text not null,
  -- 'full' | 'view' | 'none' — the portal-access level offered in the form.
  access_level text not null default 'view',
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists household_members_user_idx
  on public.household_members (user_id);

create table if not exists public.resident_pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  pet_type text not null,
  breed text,
  weight_lb text,
  color text,
  rabies_tag text not null,
  vet text,
  status text not null default 'Registered',
  created_at timestamptz not null default now()
);

create index if not exists resident_pets_user_idx
  on public.resident_pets (user_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lot_id uuid references public.lots (id) on delete set null,
  tenant_names text not null,
  contact text not null,
  term text not null,
  occupants text,
  -- 'Active' | 'Ended'. Ended leases are kept — occupancy history matters.
  status text not null default 'Active',
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leases_user_idx
  on public.leases (user_id) where status = 'Active';

-- ─── Compliance concern reports ──────────────────────────────────────
-- A resident reporting a concern elsewhere in the neighborhood. Kept apart
-- from public.violations: a report becomes a violation only after an
-- inspector confirms it. Anonymous reports store no reporter at all —
-- the portal promises the office doesn't keep the name either.
create table if not exists public.concern_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles (id) on delete set null,
  reporter_name text,
  concern_type text not null,
  location text not null,
  detail text,
  anonymous boolean not null default false,
  status text not null default 'Received',
  created_at timestamptz not null default now()
);

create index if not exists concern_reports_status_idx
  on public.concern_reports (status);

-- ─── Account: mailing address on the profile ─────────────────────────
-- Structured per product rule 6; a "same as property" toggle leads.
alter table public.profiles
  add column if not exists mailing_same boolean not null default true,
  add column if not exists mailing_street_number text,
  add column if not exists mailing_street_name text,
  add column if not exists mailing_unit text,
  add column if not exists mailing_city text,
  add column if not exists mailing_state text default 'Texas',
  add column if not exists mailing_zip text;

-- ─── Notification preferences: the full channel matrix ───────────────
-- The Account screen is a matrix of notice types × (email, text) plus an
-- explicit SMS consent. Stored whole as jsonb; the legacy booleans stay in
-- sync so existing email senders keep working unchanged.
alter table public.notification_preferences
  add column if not exists channels jsonb,
  add column if not exists sms_opt_in boolean not null default false;

-- ─── RLS on, no public policies ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'resident_threads','resident_messages','guest_passes','resident_vehicles',
    'household_members','resident_pets','leases','concern_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
