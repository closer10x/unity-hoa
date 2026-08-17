-- Photos on the records the iPhone already captures: pets, vehicles, and
-- maintenance requests. Files live in resident-message-files under
-- {user_id}/pets|vehicles|work-orders/… — the same private bucket messages
-- use, so existing storage RLS (own folder write, own-or-staff read) covers
-- them without a second bucket.
--
-- resident_pets already existed (structured fields + service-role-only RLS)
-- but the website never wrote it. This adds the columns the phone uses
-- (detail, ok, photo_path, lot_id), relaxes the structured NOT NULLs so a
-- phone row that only has a name and a sentence still inserts, and opens
-- authenticated CRUD on the owner's own rows so the iOS app can follow.

-- ─── Pets: phone-aligned columns ─────────────────────────────────────
alter table public.resident_pets
  add column if not exists detail text,
  add column if not exists ok boolean not null default true,
  add column if not exists photo_path text,
  add column if not exists lot_id uuid references public.lots (id) on delete set null;

alter table public.resident_pets
  alter column pet_type drop not null,
  alter column rabies_tag drop not null;

create index if not exists resident_pets_lot_idx
  on public.resident_pets (lot_id);

comment on column public.resident_pets.detail is
  'One-line description the list shows. The website composes it from type/breed/tag; the phone may write it directly.';
comment on column public.resident_pets.photo_path is
  'Object path in resident-message-files, {user_id}/pets/…';
comment on column public.resident_pets.ok is
  'Whether the registration is current. The list uses this for the status tone.';

-- ─── Vehicles ────────────────────────────────────────────────────────
alter table public.resident_vehicles
  add column if not exists photo_path text;

comment on column public.resident_vehicles.photo_path is
  'Object path in resident-message-files, {user_id}/vehicles/…';

-- ─── Work orders ─────────────────────────────────────────────────────
alter table public.work_orders
  add column if not exists photo_path text;

comment on column public.work_orders.photo_path is
  'Resident-supplied photo in resident-message-files, {user_id}/work-orders/…. Optional; a request still files if the upload fails.';

-- ─── RLS: resident CRUD own pets; staff may read ─────────────────────
-- The table already has RLS on with no authenticated policies (service role
-- only). The website still writes through the service client; these policies
-- are for the signed-in JWT, which is how the phone will persist pets.
drop policy if exists "resident_pets_select_own" on public.resident_pets;
create policy "resident_pets_select_own"
  on public.resident_pets for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "resident_pets_insert_own" on public.resident_pets;
create policy "resident_pets_insert_own"
  on public.resident_pets for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "resident_pets_update_own" on public.resident_pets;
create policy "resident_pets_update_own"
  on public.resident_pets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "resident_pets_delete_own" on public.resident_pets;
create policy "resident_pets_delete_own"
  on public.resident_pets for delete
  to authenticated
  using (user_id = auth.uid());

-- Vehicles already persist via the service role. The same JWT policies let
-- the phone write a photo_path onto a car the owner registered.
drop policy if exists "resident_vehicles_select_own" on public.resident_vehicles;
create policy "resident_vehicles_select_own"
  on public.resident_vehicles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "resident_vehicles_insert_own" on public.resident_vehicles;
create policy "resident_vehicles_insert_own"
  on public.resident_vehicles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "resident_vehicles_update_own" on public.resident_vehicles;
create policy "resident_vehicles_update_own"
  on public.resident_vehicles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "resident_vehicles_delete_own" on public.resident_vehicles;
create policy "resident_vehicles_delete_own"
  on public.resident_vehicles for delete
  to authenticated
  using (user_id = auth.uid());
