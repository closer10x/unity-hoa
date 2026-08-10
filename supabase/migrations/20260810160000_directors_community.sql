-- A board belongs to a community.
--
-- Each community elects and seats its own board of directors, so a director is
-- seated on a specific one — the roster is per-community, not association-wide.
-- Meetings already carried a community column; directors did not. Every seat on
-- the books today predates the column and belongs to the only community that
-- exists so far, so they are backfilled to it rather than left unassigned
-- (an unassigned director would drop out of a per-community roster view).

alter table public.directors
  add column if not exists community text;

update public.directors
  set community = 'Sofi Lakes'
  where community is null;

create index if not exists directors_community_idx
  on public.directors (community);
