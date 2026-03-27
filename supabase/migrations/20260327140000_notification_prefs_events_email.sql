-- Extend notification_preferences: community events + explicit email channel flags

alter table public.notification_preferences
  add column if not exists events boolean not null default true;

alter table public.notification_preferences
  add column if not exists email_announcements boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_maintenance_updates boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_events boolean not null default false;

alter table public.notification_preferences
  add column if not exists email_billing_reminders boolean not null default false;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.set_updated_at();
