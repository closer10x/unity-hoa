-- Where a sign-in came from, in words.
--
-- The auth log records the IP, which answers "the same place as last time?"
-- but not "where?". The office reading it wants a city, not four numbers, so
-- each event carries the location its IP resolves to — city, region (state)
-- and country — looked up once when the event is written and stored, rather
-- than re-resolved on every page load. Nulls are expected and fine: a private
-- or unresolvable address simply has no location, and the row falls back to
-- showing the IP.

alter table public.auth_events
  add column if not exists geo_city text,
  add column if not exists geo_region text,
  add column if not exists geo_country text;
