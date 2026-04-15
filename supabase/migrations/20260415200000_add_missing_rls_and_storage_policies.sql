-- RLS for tables that had RLS enabled but no policies (defense-in-depth when using user JWT).
-- Plus storage.objects policies for private buckets (user JWT / future client uploads).
-- Service role continues to bypass RLS.

-- ─── Core admin tables ───────────────────────────────────────────────

create policy "employees_admin_all"
  on public.employees for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "work_orders_admin_all"
  on public.work_orders for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "work_order_attachments_admin_all"
  on public.work_order_attachments for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "hoa_dashboard_metrics_admin_select"
  on public.hoa_dashboard_metrics for select
  using (public.is_admin(auth.uid()));

create policy "hoa_dashboard_metrics_admin_update"
  on public.hoa_dashboard_metrics for update
  using (public.is_admin(auth.uid()));

create policy "finance_transactions_admin_all"
  on public.finance_transactions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Community events: admins manage all rows; anyone may read published rows (marketing site + residents).
create policy "community_events_admin_all"
  on public.community_events for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "community_events_public_read_published"
  on public.community_events for select
  using (published = true);

-- Announcements: admins manage all; public read for published only.
create policy "announcements_admin_all"
  on public.announcements for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "announcements_public_read_published"
  on public.announcements for select
  using (status = 'published');

-- Admin notification feed
create policy "admin_notifications_admin_all"
  on public.admin_notifications for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admin_notification_reads_admin_all"
  on public.admin_notification_reads for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ─── Storage: work-order-images (admin only) ─────────────────────────

create policy "work_order_images_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'work-order-images' and public.is_admin(auth.uid()));

create policy "work_order_images_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'work-order-images' and public.is_admin(auth.uid()));

create policy "work_order_images_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'work-order-images' and public.is_admin(auth.uid()));

create policy "work_order_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'work-order-images' and public.is_admin(auth.uid()));

-- ─── Storage: profile-avatars (owner folder + admin read) ─────────────
-- Object name format: "{user_id}/avatar.ext"

create policy "profile_avatars_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile_avatars_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-avatars' and public.is_admin(auth.uid()));

create policy "profile_avatars_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile_avatars_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile_avatars_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ─── Storage: documents library (admin write; authenticated read) ─────

create policy "documents_bucket_authenticated_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

create policy "documents_bucket_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin(auth.uid()));

create policy "documents_bucket_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_admin(auth.uid()));

create policy "documents_bucket_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin(auth.uid()));

-- ─── Storage: pending-uploads (admin only; public uploads use service role) ─

create policy "pending_uploads_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'pending-uploads' and public.is_admin(auth.uid()));

create policy "pending_uploads_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pending-uploads' and public.is_admin(auth.uid()));

create policy "pending_uploads_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'pending-uploads' and public.is_admin(auth.uid()));

create policy "pending_uploads_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pending-uploads' and public.is_admin(auth.uid()));

comment on policy "community_events_public_read_published" on public.community_events is
  'Allows anon/authenticated reads of published events (e.g. marketing /events page with user-scoped client).';
