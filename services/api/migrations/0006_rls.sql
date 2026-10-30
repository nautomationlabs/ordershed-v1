-- Row-level security. The API connects as `ordershed_app` (no superuser, no BYPASSRLS) and, inside every
-- transaction, sets:
--   app.org_id   – the org of the signed-in session (or the org being created during Join)
--   app.user_id  – the signed-in user
--   app.org_kind – buyer | supplier | platform | system   ('system' = pre-sign-in flows such as Join and login)
-- Rules enforced here, in the database, so a bug in a route cannot leak data:
--   * Buyer A never reads Buyer B's rows.
--   * A supplier sees an RFQ only if invited, and only its own quotes; never other suppliers' bids.
--   * Quotes stay unreadable to the buyer (and to admins) until the RFQ's sealed period has ended.
--   * The supplier's floor price is readable only by that supplier.
--   * Admins (platform) can read across orgs but cannot write order documents ("sees every price, edits none").

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'ordershed_app') then
    create role ordershed_app nologin;            -- the migration runner enables login and sets the password
  end if;
end $$;

create function app_org() returns uuid language sql stable as
$$ select nullif(current_setting('app.org_id', true), '')::uuid $$;
create function app_user() returns uuid language sql stable as
$$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
create function app_kind() returns text language sql stable as
$$ select coalesce(current_setting('app.org_kind', true), '') $$;
create function app_is_platform() returns boolean language sql stable as
$$ select app_kind() = 'platform' $$;

grant usage on schema public to ordershed_app;
grant execute on function next_doc_number(text), audit_append(uuid, text, text, text, text, jsonb), audit_verify(),
  app_org(), app_user(), app_kind(), app_is_platform() to ordershed_app;

-- ---------------------------------------------------------------- identity
grant select, insert, update on orgs, plants, users, memberships to ordershed_app;
grant select, insert, update on sessions, otp_challenges to ordershed_app;   -- auth service only; hashes, no tenant data

alter table orgs enable row level security;
create policy orgs_read on orgs for select using (id = app_org() or app_is_platform() or app_kind() = 'system');
create policy orgs_create on orgs for insert with check (id = app_org() and app_kind() = 'system');
create policy orgs_update on orgs for update using (id = app_org() or app_is_platform());

alter table plants enable row level security;
create policy plants_rw on plants using (org_id = app_org() or app_is_platform()) with check (org_id = app_org());

alter table users enable row level security;
create policy users_read on users for select using (
  id = app_user() or app_kind() in ('platform', 'system')
  or exists (select 1 from memberships m where m.user_id = users.id and m.org_id = app_org()));
create policy users_create on users for insert with check (app_kind() = 'system');
create policy users_update on users for update using (id = app_user() or app_kind() = 'system');

alter table memberships enable row level security;
create policy memberships_read on memberships for select using (
  org_id = app_org() or user_id = app_user() or app_kind() in ('platform', 'system'));
create policy memberships_create on memberships for insert with check (org_id = app_org());

-- ---------------------------------------------------------------- audit and metering
grant select on audit_events to ordershed_app;                 -- writes only through audit_append()
alter table audit_events enable row level security;
create policy audit_read on audit_events for select using (org_id = app_org() or app_is_platform());

grant select, insert on metering_events to ordershed_app;
grant usage on sequence metering_events_id_seq to ordershed_app;
grant select on rfq_costs to ordershed_app;
alter table metering_events enable row level security;
create policy metering_read on metering_events for select using (org_id = app_org() or app_is_platform());
create policy metering_write on metering_events for insert with check (
  org_id = app_org() or (org_id is null and app_kind() in ('platform', 'system')));

-- ---------------------------------------------------------------- supplier join and verification
grant select, insert, update on supplier_details, join_applications, verification_cases to ordershed_app;
grant select, insert, update on whatsapp_messages, whatsapp_optouts to ordershed_app;
grant usage on sequence whatsapp_messages_id_seq to ordershed_app;

alter table supplier_details enable row level security;
create policy supplier_details_read on supplier_details for select using (org_id = app_org() or app_is_platform());
create policy supplier_details_write on supplier_details for insert with check (org_id = app_org());
create policy supplier_details_update on supplier_details for update using (org_id = app_org());

alter table verification_cases enable row level security;
create policy verification_read on verification_cases for select using (org_id = app_org() or app_is_platform());
create policy verification_open on verification_cases for insert with check (org_id = app_org() or app_is_platform());
create policy verification_review on verification_cases for update using (app_is_platform());

-- join_applications, whatsapp_messages, whatsapp_optouts: pre-tenant / messaging plumbing, used only by
-- the Join and WhatsApp services; no tenant business data.

-- ---------------------------------------------------------------- order documents
-- Party rule: a row is visible to its buyer org and its supplier org; admins read, never write.
do $$
declare t text;
begin
  foreach t in array array[
    'awards', 'purchase_orders', 'po_lines', 'po_acks', 'asns', 'asn_lines', 'grns', 'grn_lines',
    'invoices', 'invoice_lines', 'adjustment_notes', 'adjustment_note_lines', 'rfq_invitations'] loop
    execute format('grant select, insert, update on %I to ordershed_app', t);
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy party_read on %I for select using (
      buyer_org_id = app_org() or supplier_org_id = app_org() or app_is_platform())$p$, t);
    execute format($p$create policy party_write on %I for insert with check (
      buyer_org_id = app_org() or supplier_org_id = app_org())$p$, t);
    execute format($p$create policy party_update on %I for update using (
      buyer_org_id = app_org() or supplier_org_id = app_org())$p$, t);
  end loop;
end $$;

grant select, insert, update on rfqs, rfq_lines, quotes, quote_lines, quote_private, documents, document_lines to ordershed_app;

-- RFQs: the buyer, invited suppliers, admins.
alter table rfqs enable row level security;
create policy rfqs_read on rfqs for select using (
  buyer_org_id = app_org() or app_is_platform()
  or exists (select 1 from rfq_invitations i where i.rfq_id = rfqs.id and i.supplier_org_id = app_org()));
create policy rfqs_write on rfqs for insert with check (buyer_org_id = app_org());
create policy rfqs_update on rfqs for update using (buyer_org_id = app_org());

alter table rfq_lines enable row level security;
create policy rfq_lines_read on rfq_lines for select using (
  buyer_org_id = app_org() or app_is_platform()
  or exists (select 1 from rfq_invitations i where i.rfq_id = rfq_lines.rfq_id and i.supplier_org_id = app_org()));
create policy rfq_lines_write on rfq_lines for insert with check (buyer_org_id = app_org());
create policy rfq_lines_update on rfq_lines for update using (buyer_org_id = app_org());

-- Sealed bidding: the buyer and admins see a quote only after the RFQ's sealed period has ended.
create function rfq_unsealed(p_rfq uuid) returns boolean language sql stable security definer
set search_path = public, pg_temp as
$$ select exists (select 1 from rfqs r where r.id = p_rfq and r.sealed_until is not null and r.sealed_until <= now()) $$;
grant execute on function rfq_unsealed(uuid) to ordershed_app;

alter table quotes enable row level security;
create policy quotes_read on quotes for select using (
  supplier_org_id = app_org()
  or ((buyer_org_id = app_org() or app_is_platform()) and status <> 'draft' and rfq_unsealed(rfq_id)));
create policy quotes_write on quotes for insert with check (supplier_org_id = app_org());
create policy quotes_update on quotes for update using (supplier_org_id = app_org() or buyer_org_id = app_org());

alter table quote_lines enable row level security;
create policy quote_lines_read on quote_lines for select using (
  supplier_org_id = app_org()
  or exists (select 1 from quotes q where q.id = quote_lines.quote_id));   -- inherits the quote's visibility
create policy quote_lines_write on quote_lines for insert with check (supplier_org_id = app_org());
create policy quote_lines_update on quote_lines for update using (supplier_org_id = app_org());

alter table quote_private enable row level security;
create policy quote_private_own on quote_private using (supplier_org_id = app_org()) with check (supplier_org_id = app_org());

alter table documents enable row level security;
create policy documents_read on documents for select using (
  buyer_org_id = app_org() or supplier_org_id = app_org() or app_is_platform());
create policy documents_write on documents for insert with check (buyer_org_id = app_org() or supplier_org_id = app_org());

alter table document_lines enable row level security;
create policy document_lines_read on document_lines for select using (
  buyer_org_id = app_org() or supplier_org_id = app_org() or app_is_platform());
create policy document_lines_write on document_lines for insert with check (buyer_org_id = app_org() or supplier_org_id = app_org());
