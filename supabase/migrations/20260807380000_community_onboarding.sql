-- Communities are derived from the lots roster rather than stored in their own
-- table, so the onboarding stage had nowhere to live and snapped back to
-- "Active" on every page load. This holds the per-community facts the roster
-- cannot imply, keyed by the same community id the roster uses.
create table if not exists public.community_onboarding (
  community text primary key,
  stage text not null default 'Active',
  portfolio_id uuid references public.portfolios (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.community_onboarding is
  'Onboarding stage and portfolio for each community in the lots roster.';
