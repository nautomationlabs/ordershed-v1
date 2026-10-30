-- Metering: one row per paid action, with its cost in INR, rolled up per RFQ and per org.
-- The alert threshold (₹150 per RFQ) lives in config, not here.

create table metering_events (
  id          bigserial primary key,
  org_id      uuid references orgs(id),             -- null = platform cost not yet tied to a customer (e.g. a Join lookup)
  rfq_id      uuid references rfqs(id),
  kind        text not null check (kind in (
                'rfq_created', 'document_extracted', 'quote_drafted', 'message_sent',
                'call_minute', 'document_generated', 'verification_check')),
  units       numeric(12,4) not null default 1,
  cost_inr    numeric(12,4) not null check (cost_inr >= 0),
  provider    text,                                 -- 'bedrock:claude-sonnet-5-5', 'whatsapp', 'cashfree'
  ref         text,                                 -- provider request / message id
  occurred_at timestamptz not null default now()
);
create index metering_rfq_idx on metering_events (rfq_id) where rfq_id is not null;
create index metering_org_idx on metering_events (org_id, occurred_at desc);

-- security_invoker keeps row-level security of the caller in force.
create view rfq_costs with (security_invoker = true) as
  select org_id, rfq_id,
         sum(cost_inr) as cost_inr,
         count(*) filter (where kind = 'document_extracted') as documents,
         count(*) filter (where kind = 'message_sent') as messages,
         sum(units) filter (where kind = 'call_minute') as call_minutes
    from metering_events
   where rfq_id is not null
   group by org_id, rfq_id;
