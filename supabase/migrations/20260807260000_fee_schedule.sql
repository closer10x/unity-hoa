-- The association's fee schedule: the named fees the office charges, shown
-- as quick-picks when recording income or taking a payment. Fees are never
-- deleted — they retire (active = false) so old ledger references keep
-- meaning.

create table if not exists public.fee_schedule (
  id uuid primary key default gen_random_uuid(),
  community text not null default 'sofi-lakes',
  name text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  category text not null default 'Other income',
  note text not null default '',
  active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fee_schedule enable row level security;

drop trigger if exists trg_fee_schedule_updated_at on public.fee_schedule;
create trigger trg_fee_schedule_updated_at
  before update on public.fee_schedule
  for each row
  execute function public.set_updated_at();

-- Seed with the two fees the office confirmed (2026-08-07). Idempotent:
-- only lands on an empty table, so re-running never duplicates.
insert into public.fee_schedule (name, amount_cents, category, sort)
select v.name, v.amount_cents, v.category, v.sort
from (values
  ('HOA fee', 135000::bigint, 'HOA fees', 10),
  ('HOA certificate fee', 35000::bigint, 'Other income', 20)
) as v(name, amount_cents, category, sort)
where not exists (select 1 from public.fee_schedule);
