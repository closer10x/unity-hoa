-- Accounting ledger + bank sync.
--
-- The ledger itself is finance_transactions (already live); this migration
-- adds what bank import needs — where a row came from, which bank account it
-- belongs to, and the processor's transaction id for idempotent re-syncs —
-- plus the two Plaid tables and the portal's server-side audit trail.

-- ─── Bank connections (Plaid items) ──────────────────────────────────
-- One row per linked institution login. The access token is a server-side
-- secret: RLS is enabled with no policies, so only the service role reads it.

create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  item_id text not null unique,
  access_token text not null,
  institution_name text not null default '',
  -- transactions/sync cursor; empty string means "never synced"
  transactions_cursor text not null default '',
  status text not null default 'active'
    check (status in ('active', 'disconnected', 'login_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plaid_items enable row level security;

-- ─── Bank accounts ───────────────────────────────────────────────────
-- One row per checking/savings account under an item. Balances are cached
-- from the last sync; the ledger is the source of truth for books.

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  plaid_item_id uuid references public.plaid_items (id) on delete set null,
  plaid_account_id text unique,
  name text not null,
  institution_name text not null default '',
  mask text not null default '',
  account_type text not null default 'checking',
  current_balance_cents bigint,
  available_balance_cents bigint,
  status text not null default 'active'
    check (status in ('active', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;

-- ─── Ledger columns for bank import ──────────────────────────────────

alter table public.finance_transactions
  add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'finance_transactions'
      and c.conname = 'finance_transactions_source_check'
  ) then
    alter table public.finance_transactions
      add constraint finance_transactions_source_check
      check (source in ('manual', 'bank'));
  end if;
end $$;

alter table public.finance_transactions
  add column if not exists bank_account_id uuid
    references public.bank_accounts (id) on delete set null;

-- Plaid transaction id; unique keeps re-syncs idempotent (NULLs don't collide)
alter table public.finance_transactions
  add column if not exists external_id text unique;

alter table public.finance_transactions
  add column if not exists pending boolean not null default false;

create index if not exists finance_transactions_bank_account_idx
  on public.finance_transactions (bank_account_id)
  where bank_account_id is not null;

create index if not exists finance_transactions_occurred_on_idx
  on public.finance_transactions (occurred_on desc);

-- ─── Audit trail (Team → Audit trail) ────────────────────────────────
-- Product rule: every mutation is stamped with the acting account, written
-- server-side in the same request as the mutation. Non-editable by design:
-- no update/delete path exists in the app and RLS blocks everything but the
-- service role.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_name text not null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

-- updated_at triggers (set_updated_at already exists from earlier migrations)
drop trigger if exists trg_plaid_items_updated_at on public.plaid_items;
create trigger trg_plaid_items_updated_at
  before update on public.plaid_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_bank_accounts_updated_at on public.bank_accounts;
create trigger trg_bank_accounts_updated_at
  before update on public.bank_accounts
  for each row
  execute function public.set_updated_at();
