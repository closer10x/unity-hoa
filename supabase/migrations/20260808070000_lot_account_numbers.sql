-- Account numbers were being made up at render time from a row's position in
-- the query result, so they were never stored, renumbered whenever the roster
-- changed, and did not match what the public dues lookup expected. A number
-- printed on a statement has to mean the same home forever, so it lives on
-- the lot.

alter table public.lots
  add column if not exists account_number text;

comment on column public.lots.account_number is
  'Community-prefixed account number, e.g. SL-000001. Stable for the life of the lot; what residents read off a statement.';

/* Two letters for the community, so a second association does not collide
   with Sofi Lakes' numbering. */
create or replace function public.community_account_prefix(community text)
returns text
language sql
immutable
as $$
  select case
    when community = 'sofi-lakes' then 'SL'
    when community is null or btrim(community) = '' then 'UG'
    else upper(substr(regexp_replace(community, '[^a-zA-Z]', '', 'g'), 1, 2))
  end;
$$;

/* Existing homes keep an order that reads naturally on a roster: lot number
   as a number where it is one, then whatever is left, then id as a tiebreak
   so the result is deterministic. */
with numbered as (
  select
    id,
    public.community_account_prefix(community) || '-' || lpad(
      (row_number() over (
        partition by community
        order by
          nullif(regexp_replace(coalesce(lot_number, ''), '\D', '', 'g'), '')::bigint
            nulls last,
          lot_number nulls last,
          id
      ))::text, 6, '0') as acct
  from public.lots
)
update public.lots l
   set account_number = n.acct
  from numbered n
 where l.id = n.id
   and l.account_number is null;

create unique index if not exists lots_account_number_key
  on public.lots (account_number)
  where account_number is not null;

/* Every insert path gets one — the roster form, a transfer, a bulk import —
   without each having to remember. */
create or replace function public.assign_lot_account_number()
returns trigger
language plpgsql
as $$
declare
  prefix text;
  next_serial bigint;
begin
  if new.account_number is not null and btrim(new.account_number) <> '' then
    return new;
  end if;

  prefix := public.community_account_prefix(new.community);

  select coalesce(max(
           nullif(regexp_replace(split_part(account_number, '-', 2), '\D', '', 'g'), '')::bigint
         ), 0) + 1
    into next_serial
    from public.lots
   where account_number like prefix || '-%';

  new.account_number := prefix || '-' || lpad(next_serial::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_lots_account_number on public.lots;
create trigger trg_lots_account_number
  before insert on public.lots
  for each row
  execute function public.assign_lot_account_number();
