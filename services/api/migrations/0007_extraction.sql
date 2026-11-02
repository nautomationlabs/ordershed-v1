-- M2: drawing upload and AI extraction. A buyer uploads a drawing; the model proposes field values, each with a
-- confidence and where on the drawing it was read; nothing reaches suppliers until the buyer confirms the
-- fields below 0.75 ("agents propose, people approve").

alter table documents add column media_type text;
alter table documents add column byte_size  bigint check (byte_size is null or byte_size >= 0);
alter table documents add column file_name  text;

create table extractions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id),
  rfq_id        uuid references rfqs(id),
  buyer_org_id  uuid not null references orgs(id),
  status        text not null check (status in ('ready', 'failed')),
  model         text not null,                  -- 'bedrock:anthropic.claude-sonnet-4-6', 'stub'
  fallback_model text,                          -- set when low-confidence fields were re-read
  title         text,                           -- short part title proposed by the model
  cost_inr      numeric(12,4) not null default 0 check (cost_inr >= 0),
  duration_ms   int,
  error         text,
  created_at    timestamptz not null default now()
);
create index extractions_rfq_idx on extractions (rfq_id, created_at desc);

create table extracted_fields (
  id            uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references extractions(id),
  buyer_org_id  uuid not null references orgs(id),
  key           text not null,
  label         text not null,
  tech          text not null,
  value         text not null,
  unit          text,
  confidence    numeric(4,3) not null check (confidence between 0 and 1),
  span          text not null,                  -- where on the drawing the value was read
  source        text not null default 'model' check (source in ('model', 'fallback', 'buyer')),
  confirmed_by  uuid references users(id),
  confirmed_at  timestamptz,
  unique (extraction_id, key)
);

-- Buyer org reads and writes its own; admins read only.
grant select, insert, update on extractions, extracted_fields to ordershed_app;

alter table extractions enable row level security;
create policy extractions_read on extractions for select using (buyer_org_id = app_org() or app_is_platform());
create policy extractions_write on extractions for insert with check (buyer_org_id = app_org());
create policy extractions_update on extractions for update using (buyer_org_id = app_org());

alter table extracted_fields enable row level security;
create policy extracted_fields_read on extracted_fields for select using (buyer_org_id = app_org() or app_is_platform());
create policy extracted_fields_write on extracted_fields for insert with check (buyer_org_id = app_org());
create policy extracted_fields_update on extracted_fields for update using (buyer_org_id = app_org());
