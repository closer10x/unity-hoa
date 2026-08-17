-- Plans on architectural applications, and a photo on a concern report.
-- Files live in resident-message-files under {user_id}/arc|compliance/…
-- — the same private bucket messages and record photos use, so existing
-- storage RLS (own folder write, own-or-staff read) covers them without
-- a second bucket. The iPhone writes the same folders.
--
-- A failed upload must not block filing: attachment_paths defaults to
-- empty, and photo_path is nullable.

-- ─── Architectural plans ─────────────────────────────────────────────
alter table public.arc_applications
  add column if not exists attachment_paths text[] not null default '{}';

comment on column public.arc_applications.attachment_paths is
  'Object paths in resident-message-files, {user_id}/arc/…. Empty when no plans were attached.';

-- ─── Concern report photo ────────────────────────────────────────────
alter table public.concern_reports
  add column if not exists photo_path text;

comment on column public.concern_reports.photo_path is
  'Optional photo in resident-message-files, {user_id}/compliance/….';

-- JWT policies so the iPhone can write the same concern_reports row the
-- website writes through the service role. Anonymous reports store no
-- reporter — the portal promises the office does not keep the name either.
drop policy if exists "concern_reports_select_own_or_staff" on public.concern_reports;
create policy "concern_reports_select_own_or_staff"
  on public.concern_reports for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or reporter_user_id = auth.uid()
  );

drop policy if exists "concern_reports_insert_own" on public.concern_reports;
create policy "concern_reports_insert_own"
  on public.concern_reports for insert
  to authenticated
  with check (
    reporter_user_id is null
    or reporter_user_id = auth.uid()
  );
