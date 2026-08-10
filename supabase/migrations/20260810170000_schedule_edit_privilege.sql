-- Field crew see the schedule; only some may change it.
--
-- A Maintenance tech and an Inspector reach the Schedule section so they can
-- see their week, but scheduling — who works when — is the office's call.
-- Every other role that reaches Schedule already manages it; the two field
-- roles are view-only by default, with a per-person override for a trusted
-- worker who genuinely runs their own board.
--
-- The flag only matters for those two roles (see canEditSchedule in
-- permissions.ts); for everyone else edit follows from the role, so the
-- default of false changes nothing for managers and admins.

alter table public.profiles
  add column if not exists can_edit_schedule boolean not null default false;
