-- Received and deposited are two different days. A check handed over at the
-- office sits in a drawer until someone takes it to the bank, and until it
-- clears the money is recorded but not yet in the account — which is exactly
-- the gap that makes a statement stop matching the ledger.
--
-- Null means the question was never asked (every payment recorded before
-- this column existed), which is not the same as "no".

alter table public.invoices
  add column if not exists payment_deposited boolean,
  add column if not exists payment_deposited_on date;

comment on column public.invoices.payment_deposited is
  'Whether the payment has reached the bank. Null for payments recorded before this was tracked.';

comment on column public.invoices.payment_deposited_on is
  'The day it was deposited — set only when payment_deposited is true.';
