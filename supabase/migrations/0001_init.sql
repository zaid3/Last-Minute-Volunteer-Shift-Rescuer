-- Last-Minute Volunteer Shift Rescuer - initial schema
-- Run in the Supabase SQL editor (or via supabase db push).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists volunteers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists shifts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  location   text,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     text not null default 'open'
             check (status in ('open', 'claimed', 'cancelled', 'expired')),
  claimed_by uuid references volunteers (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- One single-use claim token per (shift, volunteer).
create table if not exists claim_tokens (
  token        uuid primary key default gen_random_uuid(),
  shift_id     uuid not null references shifts (id) on delete cascade,
  volunteer_id uuid not null references volunteers (id) on delete cascade,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (shift_id, volunteer_id)
);

create index if not exists idx_claim_tokens_shift on claim_tokens (shift_id);
create index if not exists idx_shifts_status on shifts (status);

-- ---------------------------------------------------------------------------
-- Row Level Security: deny-all. The app talks to the database exclusively
-- through the service role on the server; no anon/client access.
-- ---------------------------------------------------------------------------

alter table volunteers   enable row level security;
alter table shifts       enable row level security;
alter table claim_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- claim_shift: race-safe shift claiming.
--
-- Concurrency model: all claims for a shift serialize on a row-level lock
-- (SELECT ... FOR UPDATE). The first transaction to acquire the lock sees
-- status = 'open', commits the claim, and releases the lock. Transactions
-- that were waiting then read the committed row, see status = 'claimed',
-- and return 'already_claimed'. Two volunteers clicking in the same
-- millisecond can never both win.
-- ---------------------------------------------------------------------------

create or replace function claim_shift(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token claim_tokens%rowtype;
  v_shift shifts%rowtype;
begin
  select * into v_token from claim_tokens where token = p_token;

  if not found then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  if v_token.used_at is not null then
    return jsonb_build_object('status', 'token_used');
  end if;

  if v_token.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;

  -- Acquire the row lock: this is the serialization point.
  select * into v_shift from shifts where id = v_token.shift_id for update;

  if v_shift.status <> 'open' then
    return jsonb_build_object('status', 'already_claimed', 'shift_title', v_shift.title);
  end if;

  update shifts
     set status     = 'claimed',
         claimed_by = v_token.volunteer_id,
         claimed_at = now()
   where id = v_shift.id;

  update claim_tokens set used_at = now() where token = p_token;

  return jsonb_build_object(
    'status',      'claimed',
    'shift_id',    v_shift.id,
    'shift_title', v_shift.title,
    'starts_at',   v_shift.starts_at
  );
end;
$$;

-- Only the service role may execute the RPC.
revoke all on function claim_shift(uuid) from public, anon, authenticated;
