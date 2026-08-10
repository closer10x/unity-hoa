-- Two companies, one office.
--
-- The association and the management company are separate legal entities
-- with separate books. The HOA fee and fines are the association's income —
-- they are levied under the deed restrictions and belong to the homeowners
-- collectively. An HOA certificate is a service the management company sells
-- to a title company at closing, and its fee is the management company's
-- revenue. Booking both into one pot overstates the association's income and
-- understates the management company's, which is a tax problem, not a
-- reporting preference.
--
-- Entities are a table rather than an enum: a second association is the
-- expected direction of travel, and adding one should be a row.

create table if not exists public.billing_entities (
  id uuid primary key default gen_random_uuid(),
  /* Stable handle used in code and URLs; the display names may be edited. */
  key text not null unique,
  name text not null,
  /* The name that belongs on an invoice and a tax return. */
  legal_name text not null,
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_entities enable row level security;

drop trigger if exists trg_billing_entities_updated_at on public.billing_entities;
create trigger trg_billing_entities_updated_at
  before update on public.billing_entities
  for each row
  execute function public.set_updated_at();

insert into public.billing_entities (key, name, legal_name, sort)
values
  ('sofilakes',  'Sofi Lakes',  'Sofi Lakes Residential Association Inc.', 10),
  ('unity-grid', 'Unity Grid',  'Unity Grid Management LLC',               20)
on conflict (key) do nothing;

/* ── Where each fee's revenue belongs ──────────────────────────────────
   Set on the fee, because the fee is what generates the charge. Nullable
   so a fee added before this decision is visibly unassigned rather than
   silently defaulted to the wrong company. */
alter table public.fee_schedule
  add column if not exists entity_key text references public.billing_entities (key);

comment on column public.fee_schedule.entity_key is
  'Which company this fee''s revenue belongs to. Null means nobody has said yet.';

update public.fee_schedule set entity_key = 'sofilakes'
  where entity_key is null and category = 'HOA fees';

update public.fee_schedule set entity_key = 'unity-grid'
  where entity_key is null and category <> 'HOA fees';

/* ── Stamped on the money itself ───────────────────────────────────────
   Copied from the fee when the invoice is raised, and from the invoice
   when the payment posts. Stored rather than derived: re-pointing a fee at
   the other company next year must not rewrite last year's books. */
alter table public.invoices
  add column if not exists entity_key text references public.billing_entities (key);

alter table public.finance_transactions
  add column if not exists entity_key text references public.billing_entities (key);

comment on column public.invoices.entity_key is
  'The company this invoice bills for, copied from its fees when raised.';

comment on column public.finance_transactions.entity_key is
  'The company this money belongs to, copied from the invoice or the fee.';

create index if not exists invoices_entity_idx on public.invoices (entity_key);
create index if not exists finance_transactions_entity_idx
  on public.finance_transactions (entity_key);

/* Existing invoices: take the entity from the fee behind their lines. An
   invoice whose lines all point at one company gets it; a mixed one is left
   null rather than guessed at. */
update public.invoices i
set entity_key = sub.entity_key
from (
  select l.invoice_id, min(f.entity_key) as entity_key
  from public.invoice_lines l
  join public.fee_schedule f on f.id = l.fee_id
  where f.entity_key is not null
  group by l.invoice_id
  having count(distinct f.entity_key) = 1
) as sub
where i.id = sub.invoice_id and i.entity_key is null;

/* Existing ledger rows: an invoice payment inherits its invoice. Anything
   else stays null — no rule can tell whose a hand-entered row was. */
update public.finance_transactions t
set entity_key = i.entity_key
from public.invoices i
where t.id = i.payment_transaction_id
  and i.entity_key is not null
  and t.entity_key is null;
