-- What a payment came with: a note, the details that identify it (a check
-- number and the bank it was drawn on), and proof if the office was handed
-- any. Kept on the invoice because that is what the payment settled.

alter table public.invoices
  add column if not exists payment_method text,
  add column if not exists payment_memo text,
  add column if not exists payment_reference text,
  add column if not exists payment_bank text;

comment on column public.invoices.payment_reference is
  'Check number, wire reference or transaction id — whatever identifies the payment on a statement.';

create table if not exists public.invoice_attachments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  storage_path text not null,
  file_name text,
  content_type text,
  byte_size bigint,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists invoice_attachments_invoice_idx
  on public.invoice_attachments (invoice_id);

/* Private: a scanned check carries an account number along the bottom, so
   these are never served from a public URL. */
insert into storage.buckets (id, name, public)
values ('invoice-attachments', 'invoice-attachments', false)
on conflict (id) do nothing;
