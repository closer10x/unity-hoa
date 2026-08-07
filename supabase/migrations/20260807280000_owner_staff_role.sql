-- Allow the "Owner" staff role — the business owner's account, which always
-- reaches everything (see SECTION_ACCESS in lib/admin-portal/permissions.ts).

alter table public.profiles
  drop constraint if exists profiles_staff_role_check;

alter table public.profiles
  add constraint profiles_staff_role_check
  check (
    staff_role is null
    or staff_role in (
      'Owner',
      'Administrator',
      'Community manager',
      'Assistant manager',
      'Maintenance tech',
      'Inspector',
      'Accounting',
      'Front desk'
    )
  );
