-- Document Library: tables, indexes, RLS policies, default category seed data.

-- Access-level enum
do $$ begin
  create type public.document_access_level as enum ('public', 'resident', 'board', 'manager_only');
exception when duplicate_object then null;
end $$;

-- ─── Document Categories ────────────────────────────────────────────
create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text not null default 'folder',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.document_categories enable row level security;

create policy "document_categories_anyone_select"
  on public.document_categories for select using (true);

create policy "document_categories_admin_insert"
  on public.document_categories for insert
  with check (public.is_admin(auth.uid()));

create policy "document_categories_admin_update"
  on public.document_categories for update
  using (public.is_admin(auth.uid()));

create policy "document_categories_admin_delete"
  on public.document_categories for delete
  using (public.is_admin(auth.uid()));

-- Seed default categories
insert into public.document_categories (name, description, icon, sort_order) values
  ('Governing Documents',       'CC&Rs, Bylaws, Articles of Incorporation',           'gavel',            1),
  ('Rules & Regulations',       'Community rules and enforcement policies',            'rule',             2),
  ('Meeting Minutes',           'Board, Annual, and Committee meeting minutes',        'groups',           3),
  ('Meeting Agendas',           'Upcoming and past meeting agendas',                   'event_note',       4),
  ('Financial Reports',         'Budgets, Reserve Studies, Audits',                    'account_balance',  5),
  ('Architectural Review',      'ARC Applications, Guidelines, Approved Plans',        'architecture',     6),
  ('Newsletters & Announcements','Community newsletters and bulletins',                'newspaper',        7),
  ('Forms',                     'Pool Key Request, Pet Registration, Move-In/Out',     'description',      8),
  ('Vendor Contracts & Insurance','Vendor agreements and insurance certificates',      'handshake',        9),
  ('Maintenance Records',       'Maintenance logs and service records',                'build',           10),
  ('Election Materials',        'Ballots, proxy forms, candidate info',                'how_to_vote',     11),
  ('Community Maps & Site Plans','Property maps, site plans, and plats',               'map',             12)
on conflict (name) do nothing;

-- ─── Documents ──────────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid not null references public.document_categories (id) on delete restrict,
  file_path text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0,
  file_type text not null default 'application/pdf',
  version text not null default 'v1.0',
  effective_date date,
  expiration_date date,
  tags text[] not null default '{}',
  access_level public.document_access_level not null default 'resident',
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  requires_acknowledgment boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_downloaded_at timestamptz,
  download_count integer not null default 0,
  view_count integer not null default 0,
  superseded_by uuid references public.documents (id) on delete set null
);

create index if not exists documents_category_idx on public.documents (category_id);
create index if not exists documents_access_level_idx on public.documents (access_level);
create index if not exists documents_uploaded_at_idx on public.documents (uploaded_at desc);
create index if not exists documents_is_pinned_idx on public.documents (is_pinned) where is_pinned = true;
create index if not exists documents_is_archived_idx on public.documents (is_archived);
create index if not exists documents_tags_idx on public.documents using gin (tags);

alter table public.documents enable row level security;

create policy "documents_authenticated_select"
  on public.documents for select
  using (auth.uid() is not null);

create policy "documents_admin_insert"
  on public.documents for insert
  with check (public.is_admin(auth.uid()));

create policy "documents_admin_update"
  on public.documents for update
  using (public.is_admin(auth.uid()));

create policy "documents_admin_delete"
  on public.documents for delete
  using (public.is_admin(auth.uid()));

create or replace function public.set_documents_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_documents_updated_at();

-- ─── Document Acknowledgments ───────────────────────────────────────
create table if not exists public.document_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  ip_address inet,
  unique (document_id, user_id)
);

create index if not exists doc_ack_document_idx on public.document_acknowledgments (document_id);
create index if not exists doc_ack_user_idx on public.document_acknowledgments (user_id);

alter table public.document_acknowledgments enable row level security;

create policy "doc_ack_select_own"
  on public.document_acknowledgments for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "doc_ack_insert_own"
  on public.document_acknowledgments for insert
  with check (auth.uid() = user_id);

-- ─── Document Downloads (audit) ─────────────────────────────────────
create table if not exists public.document_downloads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

create index if not exists doc_dl_document_idx on public.document_downloads (document_id);
create index if not exists doc_dl_user_idx on public.document_downloads (user_id);

alter table public.document_downloads enable row level security;

create policy "doc_dl_admin_select"
  on public.document_downloads for select
  using (public.is_admin(auth.uid()));

create policy "doc_dl_insert_own"
  on public.document_downloads for insert
  with check (auth.uid() = user_id);

-- ─── Storage bucket ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

comment on table public.document_categories is 'Admin-configurable document categories for the library';
comment on table public.documents is 'Central document library — CC&Rs, minutes, budgets, forms, etc.';
comment on table public.document_acknowledgments is 'Track which residents acknowledged required-read documents';
comment on table public.document_downloads is 'Audit log of every document download';
