-- Per-community policy flags. Not every community offers every feature:
-- some prohibit leasing, some have no gates, some don't issue guest passes.
-- The resident portal hides what a community doesn't offer; the admin
-- Communities section owns the toggles.
--
-- Keyed by the community slug used throughout the lots roster. Rows are
-- created lazily — a community with no row gets the defaults.

create table if not exists public.community_policies (
  community text primary key,
  allow_leases boolean not null default true,
  allow_gate_codes boolean not null default true,
  allow_guest_passes boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.community_policies enable row level security;

-- Residents may read the policy for any community (it gates their own UI);
-- writes go through the service role from the admin portal.
drop policy if exists "community_policies_select_all" on public.community_policies;
create policy "community_policies_select_all"
  on public.community_policies for select
  using (auth.uid() is not null);

drop trigger if exists trg_community_policies_updated_at on public.community_policies;
create trigger trg_community_policies_updated_at
  before update on public.community_policies
  for each row
  execute function public.set_updated_at();
