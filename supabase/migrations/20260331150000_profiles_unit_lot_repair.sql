-- Existing databases may have public.profiles from before unit_lot existed.
-- CREATE TABLE IF NOT EXISTS does not add new columns; repair with ALTER.

alter table public.profiles
  add column if not exists unit_lot text;
