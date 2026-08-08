-- Household member portal access: a member row with 'full' or 'view' access
-- gets a real auth account, invited by email and linked back here. The link
-- is how require-resident resolves a sub-account to the owner's lot and how
-- removal disables their sign-in.

alter table public.household_members
  -- The provisioned auth account, once the invite is created or an existing
  -- account is linked. Null for 'none' access or phone-only members.
  add column if not exists member_user_id uuid references public.profiles (id) on delete set null,
  -- 'none' (no account) | 'invited' (invite email sent) | 'linked' (existing
  -- account attached). Display state only; access checks use member_user_id.
  add column if not exists invite_status text not null default 'none',
  add column if not exists invited_at timestamptz,
  -- Removal is a soft delete: the row keeps the member ↔ owner history while
  -- removed_at shuts off portal access immediately.
  add column if not exists removed_at timestamptz;

-- A sub-account belongs to at most one active household.
create unique index if not exists household_members_member_user_active_idx
  on public.household_members (member_user_id)
  where member_user_id is not null and removed_at is null;
