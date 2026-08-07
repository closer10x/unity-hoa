-- Staff account editing, per-account section access, and owner-linked ledger
-- entries.
--
-- section_access: null means "derive from staff_role" (the default); a
-- non-null array is a per-person override an Administrator granted or
-- trimmed. The server resolves it in require-admin, so the client never
-- decides its own permissions.

alter table public.profiles
  add column if not exists section_access text[];

comment on column public.profiles.section_access is
  'Per-account portal sections; null = derived from staff_role';

-- Communities a staff member covers (community ids from the lots roster).
alter table public.profiles
  add column if not exists communities text[] not null default '{}';

alter table public.employees
  add column if not exists communities text[] not null default '{}';

-- A ledger entry can belong to an owner (their lot): HOA fee income, late
-- fees, a refund. Optional — utility bills belong to no one.
alter table public.finance_transactions
  add column if not exists lot_id uuid references public.lots (id) on delete set null;

create index if not exists finance_transactions_lot_idx
  on public.finance_transactions (lot_id)
  where lot_id is not null;
