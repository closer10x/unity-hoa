-- Why a job is parked.
--
-- 'pending' was already a valid work_orders.status, but nothing recorded the
-- reason — so a paused job looked identical to a forgotten one. A tech who
-- is waiting on a part, a vendor, or access to the property can now say so
-- from the field, and the office sees the reason on the row itself rather
-- than having to read down the notes.

alter table public.work_orders
  add column if not exists pending_reason text;

comment on column public.work_orders.pending_reason is
  'Why the job is paused, set when a tech puts it on hold; cleared when it moves on';
