-- Who created each ledger line (admin UI); optional FK to profiles for integrity.

alter table public.finance_transactions
  add column if not exists entered_by_user_id uuid references public.profiles (id) on delete set null;

alter table public.finance_transactions
  add column if not exists entered_by_name text;

comment on column public.finance_transactions.entered_by_user_id is 'Auth profile id of the admin who saved the row';
comment on column public.finance_transactions.entered_by_name is 'Display label at entry time (name or email)';
