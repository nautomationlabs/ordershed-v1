-- Supplier Join and verification.
-- A join application exists before the supplier org does (GST lookup → WhatsApp code). On a correct code
-- the org, its owner and a verification case are created in one transaction.

create table supplier_details (
  org_id          uuid primary key references orgs(id),
  gstin           text not null unique,
  legal_name      text not null,
  trade_name      text,
  constitution    text,                             -- Partnership, Private Limited Company, ...
  gst_status      text not null,                    -- Active / Cancelled / Suspended
  registered_on   date,
  address         text,
  state           text,
  business_types  text[] not null default '{}',     -- Foundry, Machining, ...
  language        text not null default 'en',
  gst_checked_at  timestamptz not null,
  gst_provider    text not null
);

-- Pre-tenant: no org yet, so no row-level security. Only the Join service touches this table.
create table join_applications (
  id            uuid primary key default gen_random_uuid(),
  gstin         text not null,
  phone         text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  gst_snapshot  jsonb not null,                     -- normalised lookup result shown to the supplier
  status        text not null default 'pending_code' check (status in ('pending_code', 'joined', 'expired', 'rejected')),
  challenge_id  uuid references otp_challenges(id),
  org_id        uuid references orgs(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index join_gstin_idx on join_applications (gstin, created_at desc);

create table verification_cases (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,            -- VER-000214
  org_id           uuid not null references orgs(id),
  from_tier        smallint not null check (from_tier between 0 and 3),
  to_tier          smallint not null check (to_tier between 1 and 3 and to_tier = from_tier + 1),
  evidence         jsonb not null default '[]'::jsonb,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at     timestamptz not null default now(),
  first_reviewer   uuid references users(id),
  first_reviewed_at timestamptz,
  second_reviewer  uuid references users(id),
  decided_at       timestamptz,
  decision_note    text,
  updated_at       timestamptz not null default now(),
  -- Four-eyes: the second reviewer must be a different person.
  check (second_reviewer is null or second_reviewer <> first_reviewer)
);
create index verification_open_idx on verification_cases (status, submitted_at);

-- WhatsApp message log (inbound and outbound) and opt-outs.
create table whatsapp_messages (
  id            bigserial primary key,
  direction     text not null check (direction in ('in', 'out')),
  wa_message_id text unique,
  phone         text not null,
  org_id        uuid references orgs(id),
  kind          text not null,                      -- text / template / interactive / status
  body          text,
  status        text,                               -- sent / delivered / read / failed
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index wa_phone_idx on whatsapp_messages (phone, created_at desc);

create table whatsapp_optouts (
  phone      text primary key,
  opted_out_at timestamptz not null default now()
);
