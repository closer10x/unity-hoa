-- When a job was handed to a tech, and when they closed it.
--
-- The crew board showed "assigned" from updated_at, which is really "last
-- touched by anything" — a note or a photo moved it. And there was nowhere
-- to read a completion time from at all. Both are their own columns now,
-- maintained by a trigger so every write path gets them for free.

alter table public.work_orders
  add column if not exists assigned_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Backfill what can be honestly inferred: rows already assigned or already
-- closed get updated_at, the closest thing to the real moment on record.
update public.work_orders
   set assigned_at = coalesce(assigned_at, updated_at, created_at)
 where assigned_to is not null;

update public.work_orders
   set completed_at = coalesce(completed_at, updated_at, created_at)
 where status in ('completed', 'cancelled');

create or replace function public.stamp_work_order_milestones()
returns trigger
language plpgsql
as $$
begin
  -- Assigned: first hand-off, and every re-assignment to a different tech.
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
  then
    new.assigned_at := timezone('utc', now());
  end if;
  -- Unassigned again: the job is back in the pool, so the stamp is void.
  if new.assigned_to is null then
    new.assigned_at := null;
  end if;

  if new.status in ('completed', 'cancelled')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    new.completed_at := timezone('utc', now());
  end if;
  -- Reopened: clear it rather than leave a stale completion date.
  if new.status not in ('completed', 'cancelled') then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_work_orders_milestones on public.work_orders;
create trigger trg_work_orders_milestones
  before insert or update on public.work_orders
  for each row
  execute function public.stamp_work_order_milestones();
