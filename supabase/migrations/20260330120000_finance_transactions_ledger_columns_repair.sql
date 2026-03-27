-- Repair schema drift: finance_transactions with some columns (e.g. amount_cents) but missing
-- ledger fields required by the admin UI (PostgREST PGRST204 on insert for 'kind', etc.).
-- Safe to re-run: IF NOT EXISTS / idempotent updates.

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
