-- Repair schema drift: finance_transactions created without amount_cents (e.g. partial manual setup).
-- Fixes 42703: column finance_transactions.amount_cents does not exist
-- Fixes PGRST204: Could not find the 'amount_cents' column ... in the schema cache

alter table public.finance_transactions
  add column if not exists amount_cents bigint not null default 0;
