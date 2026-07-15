-- Multi-tenant foundation: each charity has isolated coordinators, volunteers,
-- shifts, claim tokens, notifications and audit records.

create table if not exists organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(trim(name)) between 2 and 160),
  contact_email text not null,
  status        text not null default 'active'
                check (status in ('active', 'suspended', 'closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists coordinators (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations (id) on delete cascade,
  name            text not null check (char_length(trim(name)) between 2 and 120),
  email           text not null,
  password_hash   text not null,
  role            text not null default 'owner'
                  check (role in ('owner', 'coordinator', 'viewer')),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create unique index if not exists coordinators_email_unique
  on coordinators (lower(email));
create index if not exists idx_coordinators_organisation
  on coordinators (organisation_id, active);

alter table volunteers
  add column if not exists organisation_id uuid references organisations (id) on delete cascade;
alter table shifts
  add column if not exists organisation_id uuid references organisations (id) on delete cascade;
alter table claim_tokens
  add column if not exists organisation_id uuid references organisations (id) on delete cascade;
alter table audit_events
  add column if not exists organisation_id uuid references organisations (id) on delete cascade;
alter table notification_log
  add column if not exists organisation_id uuid references organisations (id) on delete cascade;

-- Preserve any records created before this migration by placing them in one
-- clearly labelled legacy organisation. New installations normally have no
-- records at this point, so no legacy organisation is created.
do $$
declare
  v_legacy_id uuid;
begin
  if exists (select 1 from volunteers where organisation_id is null)
     or exists (select 1 from shifts where organisation_id is null)
     or exists (select 1 from claim_tokens where organisation_id is null)
     or exists (select 1 from audit_events where organisation_id is null)
     or exists (select 1 from notification_log where organisation_id is null) then
    insert into organisations (name, contact_email)
    values ('Legacy organisation', 'legacy@example.invalid')
    returning id into v_legacy_id;

    update volunteers set organisation_id = v_legacy_id where organisation_id is null;
    update shifts set organisation_id = v_legacy_id where organisation_id is null;
    update claim_tokens set organisation_id = v_legacy_id where organisation_id is null;
    update audit_events set organisation_id = v_legacy_id where organisation_id is null;
    update notification_log set organisation_id = v_legacy_id where organisation_id is null;
  end if;
end;
$$;

alter table volunteers alter column organisation_id set not null;
alter table shifts alter column organisation_id set not null;
alter table claim_tokens alter column organisation_id set not null;
alter table audit_events alter column organisation_id set not null;
alter table notification_log alter column organisation_id set not null;

alter table volunteers drop constraint if exists volunteers_email_key;
create unique index if not exists volunteers_organisation_email_unique
  on volunteers (organisation_id, lower(email));

create index if not exists idx_volunteers_organisation_active
  on volunteers (organisation_id, active);
create index if not exists idx_shifts_organisation_status
  on shifts (organisation_id, status, starts_at desc);
create index if not exists idx_claim_tokens_organisation_shift
  on claim_tokens (organisation_id, shift_id);
create index if not exists idx_audit_events_organisation_created
  on audit_events (organisation_id, created_at desc);
create index if not exists idx_notification_log_organisation_created
  on notification_log (organisation_id, created_at desc);

alter table organisations enable row level security;
alter table coordinators enable row level security;

revoke all on table organisations, coordinators, volunteers, shifts, claim_tokens,
  audit_events, notification_log from anon, authenticated;

-- Atomic organisation registration. Password hashing is performed by the
-- Next.js server before this function is called.
create or replace function register_organisation(
  p_organisation_name text,
  p_contact_email text,
  p_coordinator_name text,
  p_coordinator_email text,
  p_password_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organisation_id uuid;
  v_coordinator_id uuid;
begin
  insert into organisations (name, contact_email)
  values (trim(p_organisation_name), lower(trim(p_contact_email)))
  returning id into v_organisation_id;

  insert into coordinators (
    organisation_id,
    name,
    email,
    password_hash,
    role
  )
  values (
    v_organisation_id,
    trim(p_coordinator_name),
    lower(trim(p_coordinator_email)),
    p_password_hash,
    'owner'
  )
  returning id into v_coordinator_id;

  return jsonb_build_object(
    'status', 'created',
    'organisation_id', v_organisation_id,
    'coordinator_id', v_coordinator_id,
    'role', 'owner'
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'email_in_use');
end;
$$;

revoke all on function register_organisation(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function register_organisation(text, text, text, text, text)
  to service_role;

-- Keep first-claim-wins behaviour while also returning and validating the
-- owning organisation.
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
  select *
    into v_token
    from claim_tokens
   where token = p_token
   for update;

  if not found then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  if v_token.used_at is not null then
    return jsonb_build_object('status', 'token_used');
  end if;

  if v_token.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select *
    into v_shift
    from shifts
   where id = v_token.shift_id
   for update;

  if not found
     or v_shift.organisation_id <> v_token.organisation_id
     or not exists (
       select 1
         from volunteers
        where id = v_token.volunteer_id
          and organisation_id = v_token.organisation_id
     ) then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  if v_shift.status <> 'open' then
    return jsonb_build_object(
      'status', 'already_claimed',
      'shift_id', v_shift.id,
      'shift_title', v_shift.title,
      'organisation_id', v_shift.organisation_id
    );
  end if;

  if v_shift.starts_at <= now() then
    update shifts set status = 'expired' where id = v_shift.id;
    return jsonb_build_object(
      'status', 'expired',
      'shift_id', v_shift.id,
      'organisation_id', v_shift.organisation_id
    );
  end if;

  update shifts
     set status = 'claimed',
         claimed_by = v_token.volunteer_id,
         claimed_at = now()
   where id = v_shift.id;

  update claim_tokens
     set used_at = now()
   where token = p_token;

  insert into audit_events (
    organisation_id,
    event_type,
    shift_id,
    volunteer_id,
    metadata
  )
  values (
    v_shift.organisation_id,
    'shift_claimed',
    v_shift.id,
    v_token.volunteer_id,
    jsonb_build_object('token_created_at', v_token.created_at)
  );

  return jsonb_build_object(
    'status', 'claimed',
    'shift_id', v_shift.id,
    'volunteer_id', v_token.volunteer_id,
    'shift_title', v_shift.title,
    'starts_at', v_shift.starts_at,
    'organisation_id', v_shift.organisation_id
  );
end;
$$;

revoke all on function claim_shift(uuid) from public, anon, authenticated;
grant execute on function claim_shift(uuid) to service_role;
