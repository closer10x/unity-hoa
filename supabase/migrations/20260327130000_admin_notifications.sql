-- In-app admin notification feed + per-user read state (reader_key = auth user id as text)
-- Uses existing public.notification_preferences from profiles_settings migration.
-- Service role (Next.js server) bypasses RLS.

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in (
      'work_order_created',
      'work_order_updated',
      'work_order_attachment_added',
      'work_order_due_soon',
      'work_order_overdue',
      'announcement_created',
      'announcement_updated',
      'community_event_created',
      'community_event_updated'
    )),
  title text not null,
  body text,
  href text,
  entity_type text
    check (entity_type is null or entity_type in ('work_order', 'announcement', 'community_event')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_entity_idx
  on public.admin_notifications (entity_type, entity_id)
  where entity_id is not null;

create table if not exists public.admin_notification_reads (
  notification_id uuid not null
    references public.admin_notifications (id) on delete cascade,
  reader_key text not null default 'default',
  read_at timestamptz not null default now(),
  primary key (notification_id, reader_key)
);

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;

comment on table public.admin_notifications is 'HOA admin in-app notification feed (server-enqueued)';
comment on table public.admin_notification_reads is 'Read state per admin (reader_key = auth.users.id::text)';

create or replace function public.admin_unread_notification_count(p_reader text default 'default')
returns bigint
language sql
stable
as $$
  select count(*)::bigint
  from public.admin_notifications n
  where not exists (
    select 1
    from public.admin_notification_reads r
    where r.notification_id = n.id
      and r.reader_key = coalesce(nullif(trim(p_reader), ''), 'default')
  );
$$;

create or replace function public.admin_mark_all_notifications_read(p_reader text default 'default')
returns void
language sql
as $$
  insert into public.admin_notification_reads (notification_id, reader_key)
  select n.id, coalesce(nullif(trim(p_reader), ''), 'default')
  from public.admin_notifications n
  where not exists (
    select 1
    from public.admin_notification_reads r
    where r.notification_id = n.id
      and r.reader_key = coalesce(nullif(trim(p_reader), ''), 'default')
  );
$$;
