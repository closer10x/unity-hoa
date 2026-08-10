-- A lot-linked ledger row could be either a fee billed to the owner or a
-- payment received from them, and "kind" carries neither reliably: the
-- transfer flow posts fees as income, and payments received are income too.
-- Without this, an owner balance cannot be computed — which is exactly what
-- the public dues lookup has to show.
alter table public.finance_transactions
  add column if not exists owner_entry text
  check (owner_entry in ('charge', 'payment'));

comment on column public.finance_transactions.owner_entry is
  'For lot-linked rows: charge = billed to the owner, payment = received from them. Null on rows that are not part of an owner balance.';

-- Existing lot-linked rows: anything describing a payment is one, the rest
-- are fees that were posted.
update public.finance_transactions
   set owner_entry = case
         when description ilike '%payment%' then 'payment'
         else 'charge'
       end
 where lot_id is not null
   and owner_entry is null;

create index if not exists finance_transactions_lot_owner_entry_idx
  on public.finance_transactions (lot_id, owner_entry);
