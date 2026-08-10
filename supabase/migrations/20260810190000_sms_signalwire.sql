-- Text messaging through SignalWire: a message log, and a master on/off switch.
--
-- Two callbacks hang off this. An inbound webhook records a resident's text and
-- lands it in their portal conversation; a status webhook updates the delivery
-- state of one the office sent. Both need a row keyed by the provider's message
-- id to write against — that is what sms_messages is. Outbound sends log a row
-- here too, so a delivery receipt has something to update.
--
-- Service-role only, like the rest of the office tables: RLS on, no policies,
-- every read and write goes through server code.

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  -- SignalWire's MessageSid. Unique so a status callback updates the right row
  -- and a retried webhook does not duplicate. Null only for a row written
  -- before the provider assigned one.
  provider_sid text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_number text,
  to_number text,
  body text,
  -- queued | sending | sent | delivered | undelivered | failed | received
  status text,
  error_code text,
  -- The resident matched by phone, and the conversation this landed in, when
  -- inbound could be tied to an account. Nulled if either is later removed.
  user_id uuid references public.profiles (id) on delete set null,
  thread_id uuid references public.resident_threads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_messages_created_idx
  on public.sms_messages (created_at desc);

alter table public.sms_messages enable row level security;

drop trigger if exists trg_sms_messages_updated_at on public.sms_messages;
create trigger trg_sms_messages_updated_at
  before update on public.sms_messages
  for each row
  execute function public.set_updated_at();

-- The master switch. Off by default: nothing texts anyone until the office
-- turns it on, and turning it off is the one-click way to stop all sends.
alter table public.community_settings
  add column if not exists sms_enabled boolean not null default false;
