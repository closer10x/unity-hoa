-- Private storage for files residents attach to portal messages.
--
-- Path convention: {user_id}/{thread_id}/{filename}
-- The first folder is the resident's auth.uid(), so RLS can grant
-- resident-own write/read and admin-read without a second lookup.
--
-- The iPhone app uploads with the signed-in user's JWT and writes
-- resident_messages.attachment_path. The website still uses the
-- service role for message rows; this bucket is for the file itself.
-- No public (anon) policies — the bucket is private.

insert into storage.buckets (id, name, public)
values ('resident-message-files', 'resident-message-files', false)
on conflict (id) do nothing;

-- ─── SELECT: own folder, or any file if the reader is staff ──────────
drop policy if exists "resident_message_files_select" on storage.objects;
create policy "resident_message_files_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resident-message-files'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

-- ─── INSERT: only into the caller's own folder ───────────────────────
drop policy if exists "resident_message_files_insert" on storage.objects;
create policy "resident_message_files_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resident-message-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ─── DELETE: own folder only ─────────────────────────────────────────
drop policy if exists "resident_message_files_delete" on storage.objects;
create policy "resident_message_files_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resident-message-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );
