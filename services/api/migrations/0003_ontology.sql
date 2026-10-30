-- Order ontology: RFQ → quote → award → PO → acknowledgement → ASN → GRN → invoice (+ credit/debit notes, documents).
-- Every document carries buyer_org_id and, once a supplier is involved, supplier_org_id; row-level security
-- (0006) keys on those two columns. Every document line after the PO holds the po_line_id it fulfils.
-- Money: numeric(18,4) with an explicit currency and a value_source. Money is computed in code, never by a model.

create table rfqs (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique,
  buyer_org_id  uuid not null references orgs(id),
  plant_id      uuid references plants(id),
  title         text not null,
  status        text not null default 'draft' check (status in ('draft', 'sent', 'quoting', 'under_review', 'awarded', 'closed', 'cancelled')),
  currency      char(3) not null default 'INR',
  incoterm      text,
  sealed_until  timestamptz,                    -- quotes stay unreadable to the buyer until this moment
  created_by    uuid references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index rfqs_buyer_idx on rfqs (buyer_org_id, created_at desc);

create table rfq_lines (
  id            uuid primary key default gen_random_uuid(),
  rfq_id        uuid not null references rfqs(id),
  buyer_org_id  uuid not null references orgs(id),
  line_no       int not null,
  part_no       text,
  description   text not null,
  qty           numeric(18,4) not null check (qty > 0),
  unit          text not null default 'pcs',
  annual_qty    numeric(18,4),
  unique (rfq_id, line_no)
);

create table rfq_invitations (
  id              uuid primary key default gen_random_uuid(),
  rfq_id          uuid not null references rfqs(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  status          text not null default 'invited' check (status in ('invited', 'viewed', 'quoted', 'declined', 'expired')),
  decline_reason  text,
  invited_at      timestamptz not null default now(),
  unique (rfq_id, supplier_org_id)
);
create index rfq_inv_supplier_idx on rfq_invitations (supplier_org_id);

create table quotes (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  rfq_id          uuid not null references rfqs(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  status          text not null default 'draft' check (status in ('draft', 'submitted', 'revised', 'withdrawn', 'awarded', 'lost')),
  currency        char(3) not null default 'INR',
  incoterm        text,
  valid_until     date,
  submitted_at    timestamptz,
  sealed_hash     bytea,                          -- sha256 of the canonical quote at submit time
  created_at      timestamptz not null default now()
);
create index quotes_rfq_idx on quotes (rfq_id);

create table quote_lines (
  id                uuid primary key default gen_random_uuid(),
  quote_id          uuid not null references quotes(id),
  rfq_line_id       uuid not null references rfq_lines(id),
  buyer_org_id      uuid not null references orgs(id),
  supplier_org_id   uuid not null references orgs(id),
  unit_price        numeric(18,4) not null check (unit_price >= 0),
  unit_price_source value_source not null default 'supplier',
  tooling           numeric(18,4) not null default 0,
  tooling_source    value_source not null default 'supplier',
  moq               numeric(18,4),
  lead_days         int,
  unique (quote_id, rfq_line_id)
);

-- The supplier's private floor price. Never readable by buyers or admins, never used for ranking.
create table quote_private (
  quote_id        uuid primary key references quotes(id),
  supplier_org_id uuid not null references orgs(id),
  floor_price     numeric(18,4) not null
);

create table awards (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  rfq_id          uuid not null references rfqs(id),
  quote_id        uuid not null references quotes(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  status          text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected', 'cancelled')),
  doa_level       text not null,                  -- L1 / L2 / L3
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  award_id        uuid references awards(id),
  plant_id        uuid references plants(id),
  currency        char(3) not null default 'INR',
  incoterm        text,
  status          text not null default 'draft' check (status in ('draft', 'issued', 'acknowledged', 'in_production', 'shipped', 'received', 'closed', 'cancelled')),
  issued_at       timestamptz,
  created_at      timestamptz not null default now()
);
create index po_buyer_idx on purchase_orders (buyer_org_id, created_at desc);
create index po_supplier_idx on purchase_orders (supplier_org_id, created_at desc);

create table po_lines (
  id                uuid primary key default gen_random_uuid(),
  po_id             uuid not null references purchase_orders(id),
  buyer_org_id      uuid not null references orgs(id),
  supplier_org_id   uuid not null references orgs(id),
  line_no           int not null,
  rfq_line_id       uuid references rfq_lines(id),
  part_no           text,
  description       text not null,
  qty               numeric(18,4) not null check (qty > 0),
  unit              text not null default 'pcs',
  unit_price        numeric(18,4) not null check (unit_price >= 0),
  unit_price_source value_source not null,
  hsn               text,
  tax_pct           numeric(5,2),
  unique (po_id, line_no)
);

create table po_acks (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  po_id           uuid not null references purchase_orders(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  channel         text not null check (channel in ('web', 'whatsapp', 'email')),
  acknowledged_at timestamptz not null default now()
);

create table asns (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  po_id           uuid not null references purchase_orders(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  status          text not null default 'draft' check (status in ('draft', 'blocked', 'shipped', 'in_transit', 'delivered')),
  eway_bill_no    text,
  shipped_at      timestamptz,
  created_at      timestamptz not null default now()
);

create table asn_lines (
  id              uuid primary key default gen_random_uuid(),
  asn_id          uuid not null references asns(id),
  po_line_id      uuid not null references po_lines(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  qty             numeric(18,4) not null check (qty > 0)
);

create table grns (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  po_id           uuid not null references purchase_orders(id),
  asn_id          uuid references asns(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  received_at     timestamptz not null default now(),
  created_by      uuid references users(id)
);

create table grn_lines (
  id              uuid primary key default gen_random_uuid(),
  grn_id          uuid not null references grns(id),
  po_line_id      uuid not null references po_lines(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  received_qty    numeric(18,4) not null check (received_qty >= 0),
  accepted_qty    numeric(18,4) not null check (accepted_qty >= 0),
  rejected_qty    numeric(18,4) not null default 0 check (rejected_qty >= 0),
  check (accepted_qty + rejected_qty <= received_qty)
);

create table invoices (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique,
  po_id               uuid not null references purchase_orders(id),
  buyer_org_id        uuid not null references orgs(id),
  supplier_org_id     uuid not null references orgs(id),
  supplier_invoice_no text not null,
  irn                 text,                       -- e-invoice reference, verified in M4
  invoice_date        date not null,
  currency            char(3) not null default 'INR',
  status              text not null default 'received' check (status in ('received', 'matched', 'held', 'approved', 'paid', 'rejected')),
  created_at          timestamptz not null default now(),
  unique (supplier_org_id, supplier_invoice_no)
);

create table invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null references invoices(id),
  po_line_id        uuid not null references po_lines(id),
  buyer_org_id      uuid not null references orgs(id),
  supplier_org_id   uuid not null references orgs(id),
  qty               numeric(18,4) not null check (qty > 0),
  unit_price        numeric(18,4) not null check (unit_price >= 0),
  unit_price_source value_source not null default 'supplier',
  hsn               text,
  tax_pct           numeric(5,2)
);

create table adjustment_notes (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,           -- CN-… / DN-…
  kind            text not null check (kind in ('credit', 'debit')),
  po_id           uuid not null references purchase_orders(id),
  invoice_id      uuid references invoices(id),
  buyer_org_id    uuid not null references orgs(id),
  supplier_org_id uuid not null references orgs(id),
  status          text not null default 'proposed' check (status in ('proposed', 'issued', 'accepted', 'disputed')),
  created_at      timestamptz not null default now()
);

create table adjustment_note_lines (
  id                uuid primary key default gen_random_uuid(),
  note_id           uuid not null references adjustment_notes(id),
  po_line_id        uuid not null references po_lines(id),
  buyer_org_id      uuid not null references orgs(id),
  supplier_org_id   uuid not null references orgs(id),
  qty               numeric(18,4) not null,
  amount            numeric(18,4) not null,
  amount_source     value_source not null default 'computed',
  reason            text not null
);

-- Files: drawings, certificates, shipping documents. The object lives in S3; we keep its hash.
create table documents (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  buyer_org_id    uuid references orgs(id),
  supplier_org_id uuid references orgs(id),
  doc_type        text not null,
  title           text not null,
  po_id           uuid references purchase_orders(id),
  rfq_id          uuid references rfqs(id),
  s3_key          text,
  sha256          bytea,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  check (buyer_org_id is not null or supplier_org_id is not null)
);

create table document_lines (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents(id),
  po_line_id      uuid not null references po_lines(id),
  buyer_org_id    uuid references orgs(id),
  supplier_org_id uuid references orgs(id),
  qty             numeric(18,4),
  note            text
);
