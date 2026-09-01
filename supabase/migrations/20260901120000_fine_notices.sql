-- Fine notices: the letter the office sends and the money it demands.
--
-- A violation file already records what was seen and what was mailed. What it
-- could not do was produce the notice itself, so the letter was written by
-- hand in Word and the fine was remembered rather than billed. This table is
-- the notice as issued — every sentence the recipient read, frozen at the
-- moment it went out — and the invoice it raised.
--
-- Two things it deliberately does NOT hold:
--
--   * The amount owed. That lives on the invoice, which lives in front of the
--     ledger. A notice that carried its own paid/unpaid flag would be a second
--     set of books running beside the first, disagreeing by the second week.
--     `invoice_id` points at the bill; payment state is read from there.
--
--   * The fine schedule. Fine amounts are fee_schedule rows (category
--     'Fines'), because a posted schedule is what makes an amount defensible
--     when a builder pushes back, and because the fee already knows which
--     company's revenue it is. Seeded at the bottom of this file.

create table if not exists public.fine_notices (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,

  /* The case it came out of, and the home it is billed to. Both nullable and
     both set null rather than cascading: a notice that has gone out has to
     keep saying what it said even if the case is later deleted. */
  violation_id uuid references public.violations (id) on delete set null,
  lot_id uuid references public.lots (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,

  community text,
  /* Copied at issue time, all of it. The roster changes hands; the letter
     does not get to change with it. */
  property_address text not null,
  lot_number text,
  block text,
  recipient_name text not null,
  recipient_email text,
  recipient_address text,

  delivery_method text not null default 'Certified mail',
  /* 1st notice / 2nd notice / 3rd notice / Final notice. Suggested from the
     count of prior notices at this address, then confirmed by the office. */
  notice_level text not null default '1st notice',

  notice_date date not null default current_date,
  inspection_date date,
  inspector text,
  cure_date date,

  observed text,
  governing_section text,
  cleanup_frequency text,

  total_cents bigint not null default 0 check (total_cents >= 0),
  /* The continuing fine, if the governing documents authorise one. */
  continuing_cents bigint check (continuing_cents is null or continuing_cents >= 0),
  continuing_unit text,
  admin_fee_pct numeric(5, 2),
  pay_days int,
  dispute_days int,
  remit_to text,
  pay_link text,
  copies_to text,

  /* The association levies fines; this is not the management company's
     revenue. Stamped here as well as on the invoice so the notice can be
     read on its own. */
  entity_key text references public.billing_entities (key),

  status text not null default 'Drafted'
    check (status in ('Drafted', 'Sent', 'Cured', 'Escalated', 'Waived')),
  sent_on date,
  cured_on date,
  waived_reason text,

  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fine_notices_violation_idx on public.fine_notices (violation_id);
create index if not exists fine_notices_lot_idx on public.fine_notices (lot_id);
create index if not exists fine_notices_status_idx on public.fine_notices (status);
create index if not exists fine_notices_address_idx on public.fine_notices (property_address);

/* One row per violation charged on the notice — the table the letter prints.
   A separate table rather than jsonb so the same reads the invoice gets are
   available here: what a lot was fined for, and how often. */
create table if not exists public.fine_notice_items (
  id uuid primary key default gen_random_uuid(),
  fine_notice_id uuid not null references public.fine_notices (id) on delete cascade,
  /* The schedule row this amount came from, when it came from one. Set null
     rather than cascading, so retiring a fine never rewrites a sent notice. */
  fee_id uuid references public.fee_schedule (id) on delete set null,
  observed_on date,
  description text not null,
  notice_level text,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  sort int not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists fine_notice_items_notice_idx
  on public.fine_notice_items (fine_notice_id);

/* Header total kept in step with its items, the same way an invoice is. */
create or replace function public.refresh_fine_notice_total()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.fine_notice_id, old.fine_notice_id);
begin
  update public.fine_notices
     set total_cents = coalesce(
           (select sum(amount_cents) from public.fine_notice_items
             where fine_notice_id = target), 0),
         updated_at = now()
   where id = target;
  return null;
end;
$$;

drop trigger if exists trg_fine_notice_items_total on public.fine_notice_items;
create trigger trg_fine_notice_items_total
  after insert or update or delete on public.fine_notice_items
  for each row
  execute function public.refresh_fine_notice_total();

drop trigger if exists trg_fine_notices_updated_at on public.fine_notices;
create trigger trg_fine_notices_updated_at
  before update on public.fine_notices
  for each row
  execute function public.set_updated_at();

/* Reference numbers are quoted back on a cheque and read out at a hearing,
   so they are sequential and never reused. */
create sequence if not exists public.fine_notice_seq;

create or replace function public.next_fine_notice_reference()
returns text
language sql
as $$
  select 'FN-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.fine_notice_seq')::text, 4, '0');
$$;

create or replace function public.set_fine_notice_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := public.next_fine_notice_reference();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fine_notice_reference on public.fine_notices;
create trigger trg_fine_notice_reference
  before insert on public.fine_notices
  for each row
  execute function public.set_fine_notice_reference();

-- ─── RLS on, no public policies ──────────────────────────────────────
-- Same posture as the rest of compliance: the office reaches these through
-- the service role, and a resident has no business reading the file.
alter table public.fine_notices enable row level security;
alter table public.fine_notice_items enable row level security;

-- ─── The posted fine schedule ────────────────────────────────────────
-- Amounts the board adopted, as fee_schedule rows so the office can edit them
-- in Accounting → Fee schedule without a deploy, and so each one already
-- knows whose revenue it is. Fines are levied under the deed restrictions:
-- they are the association's income, never the management company's.
--
-- Idempotent on name: re-running never duplicates, and never overwrites an
-- amount the office has since changed.
insert into public.fee_schedule (name, amount_cents, category, entity_key, sort, note)
select v.name, v.amount_cents, 'Fines', 'sofilakes', v.sort,
       'Posted fine schedule — quoted on fine notices'
from (values
  ('Fine — trash or construction debris not contained on the lot', 25000::bigint, 610),
  ('Fine — no covered dumpster or receptacle on site',             25000::bigint, 620),
  ('Fine — debris blown onto adjacent lots, common area or road',  35000::bigint, 630),
  ('Fine — mud or dirt tracked onto the street, not cleaned',      30000::bigint, 640),
  ('Fine — silt fence damaged, missing or not maintained',         40000::bigint, 650),
  ('Fine — no portable toilet on site, or not serviced',           20000::bigint, 660),
  ('Fine — materials, equipment or parking on adjacent lots',      25000::bigint, 670),
  ('Fine — work performed outside approved construction hours',    50000::bigint, 680),
  ('Fine — construction started without ARC approval',            100000::bigint, 690),
  ('Fine — damage to curb, sidewalk or common area not repaired',  50000::bigint, 700),
  ('Fine — lawn or landscaping not maintained',                    10000::bigint, 710),
  ('Fine — trash bins left at the curb',                            5000::bigint, 720),
  ('Fine — unapproved exterior alteration',                        25000::bigint, 730),
  ('Fine — inoperable or improperly parked vehicle',               10000::bigint, 740)
) as v(name, amount_cents, sort)
where not exists (
  select 1 from public.fee_schedule f where lower(f.name) = lower(v.name)
);

comment on table public.fine_notices is
  'A fine notice as issued. The amount owed lives on invoice_id, not here.';
comment on column public.fine_notices.invoice_id is
  'The bill this notice raised. Payment state is read from the invoice — a notice never carries its own.';
