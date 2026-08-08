-- Disabling a staff account has to survive a page refresh and actually block
-- sign-in, so it needs a column rather than living in client state.
alter table public.profiles
  add column if not exists disabled boolean not null default false;

comment on column public.profiles.disabled is
  'Staff account switched off from Team. Blocks portal access; reversible (unlike Remove).';
