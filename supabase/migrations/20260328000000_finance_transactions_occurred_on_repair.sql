-- Repair schema drift: finance_transactions created without occurred_on (e.g. partial manual setup).
-- Fixes PostgREST error 42703: column finance_transactions.occurred_on does not exist.

alter table public.finance_transactions
  add column if not exists occurred_on date not null default ((timezone('utc', now()))::date);

create index if not exists finance_transactions_occurred_idx
  on public.finance_transactions (occurred_on desc);
