-- Internal lot registry: every property in the community, imported from the
-- office's inventory. New residents are assigned to a lot from this list
-- (typeahead in the admin portal), which links their profile to the property.

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  community text not null default 'sofi-lakes',
  lot_number text not null,
  block text not null,
  section text not null,
  -- Structured address, never free text (product rule)
  street_number text not null,
  street_name text not null,
  city text not null default 'Katy',
  state text not null default 'Texas',
  zip text not null default '77493',
  sq_ft int,
  -- Set when a resident is assigned to this lot
  owner_profile_id uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community, lot_number, block, section),
  unique (community, street_number, street_name)
);

create index if not exists lots_street_idx
  on public.lots (street_number, street_name);
create index if not exists lots_owner_idx
  on public.lots (owner_profile_id) where owner_profile_id is not null;

alter table public.lots enable row level security;

-- Residents may read their own lot; everything else goes through the
-- service role (admin portal, imports, dues lookup API).
drop policy if exists "lots_select_own" on public.lots;
create policy "lots_select_own"
  on public.lots for select
  using (auth.uid() = owner_profile_id);

drop trigger if exists trg_lots_updated_at on public.lots;
create trigger trg_lots_updated_at
  before update on public.lots
  for each row
  execute function public.set_updated_at();
