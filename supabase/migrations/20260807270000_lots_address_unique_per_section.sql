-- The closed-lots roster shows the same street address in two different
-- sections (2081 Hidden Hills Ln: Sec 1 Blk 3 Lot 9 and Sec 2 Blk 4 Lot 74),
-- so address uniqueness must be scoped per section. Lot identity stays
-- unique on (community, lot_number, block, section).

alter table public.lots
  drop constraint if exists lots_community_street_number_street_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'lots'
      and c.conname = 'lots_community_section_street_key'
  ) then
    alter table public.lots
      add constraint lots_community_section_street_key
      unique (community, section, street_number, street_name);
  end if;
end $$;
