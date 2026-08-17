-- Authenticated residents may read and reply to their own portal messages.
--
-- profiles.id references auth.users(id); resident_threads.user_id references
-- profiles(id). So auth.uid() is the thread owner.
--
-- The website still uses the service role (admin send, public-site reads,
-- resident-portal server actions). These policies are for the resident JWT
-- / iOS app, which queries PostgREST with the signed-in user's token.
--
-- No DELETE. No insert of threads. No reading another household's rows.
-- Residents may only insert messages marked is_resident = true.

-- ─── Threads ─────────────────────────────────────────────────────────
drop policy if exists "resident_threads_select_own" on public.resident_threads;
create policy "resident_threads_select_own"
  on public.resident_threads for select
  to authenticated
  using (user_id = auth.uid());

-- The app clears resident_unread when the resident opens a thread.
-- WITH CHECK keeps user_id from being reassigned.
drop policy if exists "resident_threads_update_own" on public.resident_threads;
create policy "resident_threads_update_own"
  on public.resident_threads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Messages ────────────────────────────────────────────────────────
drop policy if exists "resident_messages_select_own" on public.resident_messages;
create policy "resident_messages_select_own"
  on public.resident_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.resident_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "resident_messages_insert_own" on public.resident_messages;
create policy "resident_messages_insert_own"
  on public.resident_messages for insert
  to authenticated
  with check (
    is_resident = true
    and exists (
      select 1 from public.resident_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );
