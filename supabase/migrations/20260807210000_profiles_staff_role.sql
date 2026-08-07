-- Staff role drives per-section permissions in the admin portal
-- (lib/admin-portal/permissions.ts). Accounts predating this column are
-- treated as full Administrators by the code, but backfill explicitly so
-- the data says what it means.

alter table public.profiles
  add column if not exists staff_role text
    check (
      staff_role is null
      or staff_role in (
        'Administrator', 'Community manager', 'Assistant manager',
        'Maintenance tech', 'Inspector', 'Accounting', 'Front desk'
      )
    );

update public.profiles
  set staff_role = 'Administrator'
  where role = 'admin' and staff_role is null;
