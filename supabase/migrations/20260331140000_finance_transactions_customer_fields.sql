-- Optional resident/customer context on ledger lines (admin-entered).

alter table public.finance_transactions
  add column if not exists unit_no text;

alter table public.finance_transactions
  add column if not exists customer_first_name text;

alter table public.finance_transactions
  add column if not exists customer_last_name text;
