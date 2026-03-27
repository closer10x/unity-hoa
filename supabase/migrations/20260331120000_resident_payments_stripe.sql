-- Resident HOA payments via Stripe Checkout + webhook idempotency.

create table if not exists public.resident_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'expired', 'canceled')),
  unit_lot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resident_payments_user_id_idx
  on public.resident_payments (user_id);

create index if not exists resident_payments_checkout_session_idx
  on public.resident_payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.resident_payments enable row level security;

create policy "resident_payments_select_own"
  on public.resident_payments for select
  using (auth.uid() = user_id);

create or replace function public.set_resident_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_resident_payments_updated_at on public.resident_payments;
create trigger trg_resident_payments_updated_at
  before update on public.resident_payments
  for each row
  execute function public.set_resident_payments_updated_at();

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No client access; service role bypasses RLS for webhook processing.
create policy "stripe_webhook_events_deny_all"
  on public.stripe_webhook_events
  for all
  using (false)
  with check (false);
