-- Announcements that wait: scheduling and Owner approval.
--
-- Until now an announcement was written and sent in one motion, and only a
-- portal notice left a row behind. Scheduling and approval both need the
-- opposite: the whole intent — audience, channels, image, and when it should
-- go — persisted up front, then carried out later by a cron sweep or by an
-- Owner's approval. So every announcement becomes a row the moment it is
-- composed, and status tracks where it sits in that life:
--
--   draft      composed, not submitted (reserved; unused for now)
--   pending    waiting for an Owner to approve (the author is not an Owner)
--   scheduled  approved / Owner-authored, waiting for scheduled_for to arrive
--   published  a portal notice that is live on the resident site
--   sent       an email/text-only announcement that has already gone out
--   archived   taken down
--
-- getPublishedAnnouncements still reads only 'published', so nothing in
-- flight — pending, scheduled, draft — ever leaks onto the public site.

alter table public.announcements
  drop constraint if exists announcements_status_check;

alter table public.announcements
  add constraint announcements_status_check
  check (status in ('draft', 'pending', 'scheduled', 'published', 'sent', 'archived'));

alter table public.announcements
  -- Who it is meant for, resolved to a count at send time, not stored as a list.
  add column if not exists audience text,
  add column if not exists audience_label text,
  -- How it should travel. All three can be on at once.
  add column if not exists channel_email boolean not null default false,
  add column if not exists channel_sms boolean not null default false,
  add column if not exists channel_portal boolean not null default false,
  -- Null means "as soon as it clears approval"; a timestamp holds it until then.
  add column if not exists scheduled_for timestamptz,
  -- The acting account, stamped at compose time so approval can tell whose
  -- work is waiting. Plain uuid, mirroring admin_audit_log.actor_user_id.
  add column if not exists author_id uuid,
  add column if not exists author_name text,
  -- The Owner who released it, filled only when approval was actually needed.
  add column if not exists approved_by_id uuid,
  add column if not exists approved_by_name text,
  add column if not exists approved_at timestamptz,
  -- When the channels actually fired, and a plain-language record of what
  -- happened (how many emails, whether it hit the portal, what was skipped).
  add column if not exists sent_at timestamptz,
  add column if not exists send_summary text;

-- The cron sweep asks one question — "what is due?" — so index exactly that.
create index if not exists announcements_scheduled_idx
  on public.announcements (scheduled_for)
  where status = 'scheduled';

-- The approval queue asks the other — "what is waiting?"
create index if not exists announcements_pending_idx
  on public.announcements (created_at desc)
  where status = 'pending';

-- A public home for announcement images.
--
-- Every other bucket in this project is private, read through short-lived
-- signed URLs. Announcement images are the deliberate exception: they show on
-- the public marketing home page and inside emails opened days later, where a
-- signed URL would already have expired. The bucket is public-read; only the
-- office writes to it (the upload action runs with the service key behind the
-- admin gate), so nothing user-supplied lands here without a staff account.
insert into storage.buckets (id, name, public)
values ('announcement-images', 'announcement-images', true)
on conflict (id) do update set public = excluded.public;
