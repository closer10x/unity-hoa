-- Authenticated residents may start their own portal threads.
--
-- Complements 20260817010000 (select/update own threads; select/insert own
-- messages). The iOS New message button inserts a resident_threads row with
-- user_id = auth.uid() before inserting the first resident_messages row.
--
-- No DELETE. No other tables. No reading another household's rows.

drop policy if exists "resident_threads_insert_own" on public.resident_threads;
create policy "resident_threads_insert_own"
  on public.resident_threads for insert
  to authenticated
  with check (user_id = auth.uid());
