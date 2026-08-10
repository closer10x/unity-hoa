-- Account numbers read as SLXXXXX — the community prefix and five digits, no
-- separator. Still drawn at random so one account never hints at the next.

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
    -- 10000-99999: five digits, never leading with a zero.
    candidate := prefix || (10000 + floor(random() * 90000)::bigint)::text;
    exit when not exists (
      select 1 from public.lots where account_number = candidate
    );
    attempts := attempts + 1;
    if attempts > 500 then
      raise exception 'Could not find a free account number for %', community;
    end if;
  end loop;
  return candidate;
end;
$$;

do $$
declare
  r record;
begin
  update public.lots set account_number = null;

  for r in select id, community from public.lots order by id loop
    update public.lots
       set account_number = public.generate_lot_account_number(r.community)
     where id = r.id;
  end loop;
end;
$$;
