-- Self-serve resident sign-up, approved by the office.
--
-- A household fills in a short form on the public site and picks their home
-- from the roster; nothing is linked and no account exists until somebody in
-- the office approves it. The row is therefore a *request*, not a record: it
-- holds what they typed, the home they claimed, and who reviewed it.
--
-- Deny-all RLS with no policies at all. The public form writes through a
-- server action on the service key, which bypasses RLS, so there is no anon
-- policy to get wrong — and nobody can read the queue from a browser.

create table if not exists public.resident_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  name text not null,
  email text not null,
  phone text,

  -- Consent is a record, not a checkbox: keep the exact words they agreed to
  -- and the moment they did, because "did they opt in?" gets asked months
  -- later, by somebody who was not there.
  sms_opt_in boolean not null default false,
  sms_consent_text text,
  sms_consent_at timestamptz,

  -- The home they say is theirs. A reference, so approving is linking rather
  -- than retyping an address somebody already keyed in once.
  lot_id uuid references public.lots (id) on delete set null,
  community text,
  note text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  decline_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_by_name text,
  -- Which sign-in the approval created or linked, so a later look can tell
  -- what became of the request.
  linked_profile_id uuid references public.profiles (id) on delete set null,

  -- Abuse triage only.
  submitted_ip text,
  user_agent text
);

create index if not exists resident_signups_pending_idx
  on public.resident_signups (created_at desc)
  where status = 'pending';

create index if not exists resident_signups_email_idx
  on public.resident_signups (lower(email));

alter table public.resident_signups enable row level security;
