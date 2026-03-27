-- Payer identity captured on the payment form (mirrored to Stripe metadata).

alter table public.resident_payments
  add column if not exists payer_first_name text;

alter table public.resident_payments
  add column if not exists payer_last_name text;

alter table public.resident_payments
  add column if not exists payer_phone text;
