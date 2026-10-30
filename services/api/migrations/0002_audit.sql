-- Hash-chained, append-only audit log. Kept at least 72 months.
-- hash(n) = sha256(hash(n-1) || canonical text of event n). The first event chains from a fixed genesis value.
-- Rows are written only through audit_append() and can never be updated or deleted.

create table audit_events (
  seq          bigint primary key,
  occurred_at  timestamptz not null,
  org_id       uuid references orgs(id),             -- tenant the event belongs to; null = platform-level
  actor_user_id uuid references users(id),           -- null = system
  actor_label  text not null,                         -- 'System', 'K. Iyer'
  actor_role   text not null,
  action       text not null,                         -- 'supplier.joined'
  doc          text,                                  -- 'VEN-000041', 'RFQ-000123'
  detail       jsonb not null default '{}'::jsonb,    -- { "summary": "...", ... }
  prev_hash    bytea not null,
  hash         bytea not null unique
);
create index audit_org_idx on audit_events (org_id, seq desc);
create index audit_doc_idx on audit_events (doc);

create function audit_genesis() returns bytea language sql immutable as
$$ select digest('ordershed-audit-genesis-v1', 'sha256') $$;

-- The exact text that is hashed. Changing this function breaks verification of existing rows; add a v2 instead.
create function audit_canonical(
  p_seq bigint, p_at timestamptz, p_org uuid, p_actor uuid, p_label text, p_role text,
  p_action text, p_doc text, p_detail jsonb
) returns text language sql immutable as $$
  select concat_ws('|',
    p_seq::text,
    (extract(epoch from p_at) * 1000000)::bigint::text,
    coalesce(p_org::text, '-'),
    coalesce(p_actor::text, '-'),
    p_label, p_role, p_action,
    coalesce(p_doc, '-'),
    p_detail::text)
$$;

-- Append one event. The actor and tenant come from the session context set by the API
-- (app.user_id / app.org_id), so a caller cannot write events on behalf of another org.
create function audit_append(
  p_org uuid, p_label text, p_role text, p_action text, p_doc text, p_detail jsonb
) returns audit_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cur_org  uuid := nullif(current_setting('app.org_id', true), '')::uuid;
  cur_kind text := coalesce(current_setting('app.org_kind', true), '');
  actor    uuid := nullif(current_setting('app.user_id', true), '')::uuid;
  last     audit_events;
  ev       audit_events;
begin
  if p_org is distinct from cur_org and cur_kind <> 'platform' then
    raise exception 'audit event org does not match the session org' using errcode = '42501';
  end if;
  if p_org is null and cur_kind not in ('platform', 'system') then
    raise exception 'platform-level audit events need a platform or system context' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(7424312);            -- one writer at a time keeps the chain linear
  select * into last from audit_events order by seq desc limit 1;

  ev.seq          := coalesce(last.seq, 0) + 1;
  ev.occurred_at  := date_trunc('microseconds', clock_timestamp());
  ev.org_id       := p_org;
  ev.actor_user_id := actor;
  ev.actor_label  := p_label;
  ev.actor_role   := p_role;
  ev.action       := p_action;
  ev.doc          := p_doc;
  ev.detail       := coalesce(p_detail, '{}'::jsonb);
  ev.prev_hash    := coalesce(last.hash, audit_genesis());
  ev.hash         := digest(ev.prev_hash || convert_to(audit_canonical(
                       ev.seq, ev.occurred_at, ev.org_id, ev.actor_user_id, ev.actor_label,
                       ev.actor_role, ev.action, ev.doc, ev.detail), 'UTF8'), 'sha256');
  insert into audit_events values (ev.*);
  return ev;
end $$;

-- Recompute the whole chain. Returns ok = false and the first broken seq if any row was altered,
-- removed or reordered.
create function audit_verify(out ok boolean, out checked bigint, out first_bad_seq bigint, out head_hash text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r        audit_events;
  prev     bytea := audit_genesis();
  expected bigint := 1;
begin
  ok := true; checked := 0;
  for r in select * from audit_events order by seq loop
    if r.seq <> expected or r.prev_hash <> prev or r.hash <> digest(prev || convert_to(audit_canonical(
         r.seq, r.occurred_at, r.org_id, r.actor_user_id, r.actor_label, r.actor_role,
         r.action, r.doc, r.detail), 'UTF8'), 'sha256') then
      ok := false; first_bad_seq := r.seq;
      return;
    end if;
    prev := r.hash; expected := expected + 1; checked := checked + 1;
  end loop;
  head_hash := encode(prev, 'hex');
end $$;

create function audit_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only' using errcode = '42501';
end $$;

create trigger audit_no_update before update or delete on audit_events
  for each row execute function audit_immutable();
create trigger audit_no_truncate before truncate on audit_events
  for each statement execute function audit_immutable();
