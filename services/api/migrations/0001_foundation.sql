-- Foundation: organisations, users, roles, plants, sessions, sign-in codes, document numbering.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type org_kind as enum ('buyer', 'supplier', 'platform');

-- Where a number came from. Every stored price, total, duty or landed cost carries one.
create type value_source as enum ('supplier', 'hts', 'freight_quote', 'computed', 'history');

-- Per-type document numbers: RFQ-000123, PO-000456, VEN-000041, ...
create table doc_sequences (
  doc_type   text primary key,
  next_value bigint not null default 1 check (next_value > 0)
);

insert into doc_sequences (doc_type) values
  ('RFQ'), ('Q'), ('AWD'), ('PO'), ('ACK'), ('ASN'), ('GRN'), ('INV'), ('CN'), ('DN'),
  ('DOC'), ('MAT'), ('VEN'), ('ORG'), ('VER');

-- Returns the next number for a type, e.g. next_doc_number('RFQ') = 'RFQ-000124'.
-- The row lock makes concurrent callers queue; a rolled-back transaction gives its number back.
create function next_doc_number(p_type text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v bigint;
begin
  update doc_sequences set next_value = next_value + 1
   where doc_type = p_type
  returning next_value - 1 into v;
  if v is null then
    raise exception 'unknown document type %', p_type using errcode = '22023';
  end if;
  return p_type || '-' || lpad(v::text, 6, '0');
end $$;

create table orgs (
  id         uuid primary key,
  number     text not null unique,                 -- VEN-000041 (supplier), ORG-000003 (buyer)
  kind       org_kind not null,
  name       text not null,                        -- trade / display name
  legal_name text,
  country    char(2) not null default 'IN',
  gstin      text unique,                          -- supplier org key in India
  tier       smallint not null default 0 check (tier between 0 and 3), -- suppliers only; never a rank
  status     text not null default 'active' check (status in ('active', 'trial', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table plants (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id),
  code       text not null,                        -- PNQ-01
  name       text not null,
  city       text,
  country    char(2) not null default 'IN',
  unique (org_id, code)
);

create table users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      citext unique,
  phone      text unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),  -- E.164
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

-- Roles per org kind. Permissions are enforced in the API (src/auth/permissions.ts) and the database (RLS).
create table memberships (
  user_id    uuid not null references users(id),
  org_id     uuid not null references orgs(id),
  role       text not null check (role in (
               'buyer', 'purchase_head', 'plant_head', 'finance', 'viewer',     -- buyer orgs
               'owner', 'quoting', 'dispatch',                                  -- supplier orgs
               'ops', 'verifier', 'platform_finance', 'super_admin')),          -- platform
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  token_hash  bytea not null unique,               -- sha256 of the cookie value; the value itself is never stored
  user_id     uuid not null references users(id),
  org_id      uuid not null references orgs(id),
  role        text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  ip          inet,
  user_agent  text
);
create index sessions_user_idx on sessions (user_id);

-- One-time codes for sign-in and supplier Join. Only an HMAC of the code is stored.
create table otp_challenges (
  id           uuid primary key default gen_random_uuid(),
  purpose      text not null check (purpose in ('login', 'join')),
  portal       org_kind,                             -- login: which portal the code signs in to
  channel      text not null check (channel in ('email', 'whatsapp')),
  destination  text not null,
  code_hash    bytea not null,
  attempts     smallint not null default 0,
  max_attempts smallint not null default 5,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  user_id      uuid references users(id),            -- login: the user the code is for (null = unknown destination)
  created_at   timestamptz not null default now()
);
create index otp_destination_idx on otp_challenges (destination, created_at desc);
