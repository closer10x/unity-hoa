-- Auth profiles (admin vs basic), community settings, notification preferences.
-- After first user signs up, promote to admin:
--   update public.profiles set role = 'admin' where id = '<auth.users.id>';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'basic' check (role in ('admin', 'basic')),
  display_name text,
  phone text,
  unit_lot text,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'basic');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create table if not exists public.community_settings (
  id int primary key default 1 check (id = 1),
  association_name text,
  support_email text,
  timezone text default 'America/New_York',
  mailing_address text,
  allow_resident_directory boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.community_settings enable row level security;

insert into public.community_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create policy "community_settings_admin_select"
  on public.community_settings for select
  using (public.is_admin(auth.uid()));

create policy "community_settings_admin_update"
  on public.community_settings for update
  using (public.is_admin(auth.uid()));

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  announcements boolean not null default true,
  maintenance_updates boolean not null default true,
  billing_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_own_all"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.profiles is 'App roles; one row per auth user; default basic via trigger';
comment on table public.community_settings is 'Single-row HOA / association profile (id must be 1)';
comment on table public.notification_preferences is 'Per-user notification toggles';
