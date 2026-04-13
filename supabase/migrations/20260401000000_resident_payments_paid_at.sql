-- When Stripe marks a checkout as paid, webhook sets paid_at from the event time.

alter table public.resident_payments
  add column if not exists paid_at timestamptz;
