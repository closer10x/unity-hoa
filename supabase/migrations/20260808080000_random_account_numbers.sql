-- Sequential account numbers told you where a home sat on the roster, and the
-- next one along was always a guess away. Real account numbers are arbitrary,
-- so these are drawn at random from a six-digit range with no leading zero.
-- Nothing has been printed or mailed yet, so renumbering now costs nothing.

create or replace function public.generate_lot_account_number(community text)
returns text
language plpgsql
as $$
declare
  prefix text := public.community_account_prefix(community);
  candidate text;
  attempts int := 0;
begin
  loop
    -- 100000-999999: six digits, never leading with a zero.
    candidate := prefix || '-' || (100000 + floor(random() * 900000)::bigint)::text;
    exit when not exists (
      select 1 from public.lots where account_number = candidate
    );
    attempts := attempts + 1;
    if attempts > 200 then
      raise exception 'Could not find a free account number for %', community;
    end if;
  end loop;
  return candidate;
end;
$$;

/* Reassign every existing home. One at a time so the uniqueness check inside
   the generator sees the numbers handed out earlier in the same run. */
do $$
declare
  r record;
begin
  -- Cleared first so the old sequential values cannot collide with new draws.
  update public.lots set account_number = null;

  for r in select id, community from public.lots order by id loop
    update public.lots
       set account_number = public.generate_lot_account_number(r.community)
     where id = r.id;
  end loop;
end;
$$;

create or replace function public.assign_lot_account_number()
returns trigger
language plpgsql
as $$
begin
  if new.account_number is null or btrim(new.account_number) = '' then
    new.account_number := public.generate_lot_account_number(new.community);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lots_account_number on public.lots;
create trigger trg_lots_account_number
  before insert on public.lots
  for each row
  execute function public.assign_lot_account_number();
