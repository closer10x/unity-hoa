-- Profile photos: storage path on profiles + private bucket (signed URLs from server).

alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Object path in profile-avatars bucket; app issues signed URLs for display';

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;
