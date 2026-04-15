-- Upload Links: password-protected external upload portal
-- Depends on: 20260415000000_document_library.sql

-- ─── Pending-document status enum ────────────────────────────────────
do $$ begin
  create type public.pending_document_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- ─── Upload Links ────────────────────────────────────────────────────
create table if not exists public.upload_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  password_hash text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uploads integer,
  upload_count integer not null default 0,
  allowed_categories uuid[] not null default '{}',
  requires_review boolean not null default true,
  is_active boolean not null default true,
  last_used_at timestamptz
);

create index if not exists upload_links_active_idx
  on public.upload_links (is_active) where is_active = true;

alter table public.upload_links enable row level security;

create policy "upload_links_admin_select"
  on public.upload_links for select
  using (public.is_admin(auth.uid()));

create policy "upload_links_admin_insert"
  on public.upload_links for insert
  with check (public.is_admin(auth.uid()));

create policy "upload_links_admin_update"
  on public.upload_links for update
  using (public.is_admin(auth.uid()));

create policy "upload_links_admin_delete"
  on public.upload_links for delete
  using (public.is_admin(auth.uid()));

-- ─── Upload Link Sessions (audit trail) ──────────────────────────────
create table if not exists public.upload_link_sessions (
  id uuid primary key default gen_random_uuid(),
  upload_link_id uuid not null references public.upload_links (id) on delete cascade,
  ip_address text,
  user_agent text,
  accessed_at timestamptz not null default now(),
  success boolean not null default false
);

create index if not exists uls_link_idx
  on public.upload_link_sessions (upload_link_id);
create index if not exists uls_accessed_at_idx
  on public.upload_link_sessions (accessed_at desc);

alter table public.upload_link_sessions enable row level security;

create policy "uls_admin_select"
  on public.upload_link_sessions for select
  using (public.is_admin(auth.uid()));

-- Service-role inserts bypass RLS so public password attempts can be logged

-- ─── Pending Documents (review queue) ────────────────────────────────
create table if not exists public.pending_documents (
  id uuid primary key default gen_random_uuid(),
  upload_link_id uuid not null references public.upload_links (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0,
  file_type text not null default 'application/octet-stream',
  submitted_title text not null,
  submitted_description text,
  submitted_category uuid references public.document_categories (id) on delete set null,
  submitter_name text,
  submitter_email text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  status public.pending_document_status not null default 'pending',
  rejection_reason text
);

create index if not exists pd_link_idx
  on public.pending_documents (upload_link_id);
create index if not exists pd_status_idx
  on public.pending_documents (status) where status = 'pending';
create index if not exists pd_submitted_at_idx
  on public.pending_documents (submitted_at desc);

alter table public.pending_documents enable row level security;

create policy "pd_admin_select"
  on public.pending_documents for select
  using (public.is_admin(auth.uid()));

create policy "pd_admin_update"
  on public.pending_documents for update
  using (public.is_admin(auth.uid()));

create policy "pd_admin_delete"
  on public.pending_documents for delete
  using (public.is_admin(auth.uid()));

-- Service-role inserts bypass RLS for public uploads

-- ─── Pending-uploads storage bucket ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('pending-uploads', 'pending-uploads', false)
on conflict (id) do nothing;

comment on table public.upload_links is 'Password-protected upload portal links for external users';
comment on table public.upload_link_sessions is 'Audit log of every upload link access attempt';
comment on table public.pending_documents is 'Documents uploaded via upload links, awaiting admin review';
