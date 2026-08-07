-- Sign-in activity: who tried to get in, from where, when, and whether it worked.
--
-- Separate from admin_audit_log on purpose. That log records what an
-- authenticated account *did*; this records attempts to authenticate at all,
-- including ones that failed and ones from accounts that do not exist. Mixing
-- them would let a failed probe masquerade as an action.

create table if not exists public.auth_events (
  id uuid primary key default gen_random_uuid(),
  -- 'sign_in' | 'sign_out' | 'password_reset_requested'
  event text not null,
  -- Recorded even when the address matches no account, so probing is visible.
  email text,
  -- Null on failure and on unknown accounts.
  user_id uuid references auth.users (id) on delete set null,
  succeeded boolean not null,
  -- Present only on failure; never the password or anything derived from it.
  failure_reason text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists auth_events_created_idx
  on public.auth_events (created_at desc);

create index if not exists auth_events_email_idx
  on public.auth_events (lower(email), created_at desc);

-- Service role only. This table names people and their IP addresses, so
-- nothing reads it from a browser; the portal fetches it through the session.
alter table public.auth_events enable row level security;
