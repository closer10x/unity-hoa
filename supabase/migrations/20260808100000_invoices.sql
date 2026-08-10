-- Invoices: what the association billed a household, itemised, before any
-- money moves. Issuing one posts the charge against the owner; collecting it
-- posts the payment. Both land in finance_transactions, so an invoice never
-- becomes a second set of books running alongside the ledger.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  lot_id uuid references public.lots (id) on delete set null,
  community text,
  /* Copied at issue time. The roster can change hands later; a notice has to
     keep saying who it was sent to. */
  bill_to_name text,
  issued_on date not null default current_date,
  due_on date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'void')),
  memo text,
  total_cents bigint not null default 0,
  sent_at timestamptz,
  paid_on date,
  void_reason text,
  /* The two ledger rows this invoice produced, so the trail runs both ways. */
  charge_transaction_id uuid references public.finance_transactions (id) on delete set null,
  payment_transaction_id uuid references public.finance_transactions (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_lot_idx on public.invoices (lot_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_issued_idx on public.invoices (issued_on desc);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  /* Named fee it came from, when it came from one. Kept nullable so a
     one-off charge does not need a fee schedule entry, and set null rather
     than cascading so retiring a fee never rewrites an issued invoice. */
  fee_id uuid references public.fee_schedule (id) on delete set null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_cents bigint not null,
  amount_cents bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

/* Numbers are sequential per year and never reused — an invoice number is a
   reference on a notice and in the books. */
create sequence if not exists public.invoice_number_seq;

create or replace function public.next_invoice_number()
returns text
language sql
as $$
  select 'INV-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.next_invoice_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_number on public.invoices;
create trigger trg_invoice_number
  before insert on public.invoices
  for each row
  execute function public.set_invoice_number();

/* Keeping the header total in step with its lines, so nothing can quietly
   disagree about what was billed. */
create or replace function public.refresh_invoice_total()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set total_cents = coalesce(
           (select sum(amount_cents) from public.invoice_lines where invoice_id = target), 0),
         updated_at = now()
   where id = target;
  return null;
end;
$$;

drop trigger if exists trg_invoice_lines_total on public.invoice_lines;
create trigger trg_invoice_lines_total
  after insert or update or delete on public.invoice_lines
  for each row
  execute function public.refresh_invoice_total();
