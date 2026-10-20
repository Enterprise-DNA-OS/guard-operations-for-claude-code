-- Guard Operations for Claude Code: the guarding business in plain tables.
-- Clients and their sites, officers and their licences, the roster, checkpoints and scans,
-- incidents, invoices, and an append-only activity log.
-- Shift times are wall-clock times at the site (timestamp without time zone); region_zone()
-- turns a site's region into its time zone so "now" is always the site's own now.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function region_zone(region text) returns text language sql immutable as $$
  select case region
    when 'NZ' then 'Pacific/Auckland' when 'NSW' then 'Australia/Sydney' when 'ACT' then 'Australia/Sydney'
    when 'VIC' then 'Australia/Melbourne' when 'TAS' then 'Australia/Hobart' when 'QLD' then 'Australia/Brisbane'
    when 'SA' then 'Australia/Adelaide' when 'NT' then 'Australia/Darwin' when 'WA' then 'Australia/Perth'
  end
$$;

create or replace function region_now(region text) returns timestamp language sql stable as $$
  select (now() at time zone region_zone(region))
$$;

-- House rules: the business's own limits, changed with `set`. Laws live in docs/compliance.md.
create table settings (
  key text primary key,
  value text not null,
  note text not null default ''
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  country text not null check (country in ('NZ', 'AU')),
  currency text not null check (currency in ('NZD', 'AUD')),
  contact_name text,
  contact_email text,
  invoice_days int not null default 20 check (invoice_days between 0 and 120),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((country = 'NZ' and currency = 'NZD') or (country = 'AU' and currency = 'AUD'))
);

create table subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  region text not null check (region_zone(region) is not null),
  master_licence text,
  contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  client_id uuid not null references clients(id),
  name text not null check (length(trim(name)) > 0),
  address text,
  region text not null check (region_zone(region) is not null),
  service text not null default 'static' check (service in ('static', 'mobile-patrol', 'alarm-response', 'crowd-control', 'concierge')),
  contracted_hours_week numeric(6,2) not null default 0 check (contracted_hours_week >= 0),
  bill_rate_cents int not null check (bill_rate_cents > 0),
  induction_required boolean not null default true,
  -- The day the client agreed in writing that this site may be staffed by a subcontractor.
  subcontract_agreed_on date,
  -- The day the client was given written notice of the subcontractor's name and master licence.
  subcontract_notice_on date,
  instructions text,
  active boolean not null default true,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table officers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  phone text,
  email text,
  employment text not null default 'employee' check (employment in ('employee', 'subcontractor')),
  subcontractor_id uuid references subcontractors(id),
  pay_rate_cents int not null default 0 check (pay_rate_cents >= 0),
  status text not null default 'active' check (status in ('active', 'suspended', 'left')),
  started_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((employment = 'subcontractor') = (subcontractor_id is not null))
);

-- NZ: a certificate of approval (5 years) or a temporary one (3 months) from the PSPLA.
-- AU: the state security licence for the region the officer works in.
create table licences (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references officers(id),
  region text not null check (region_zone(region) is not null),
  kind text not null check (kind in ('coa', 'temporary-coa', 'security-licence')),
  classes text not null default '',
  number text not null check (length(trim(number)) > 0),
  issued_on date not null,
  expires_on date not null,
  training_done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region, kind, number),
  check (expires_on > issued_on),
  check ((region = 'NZ') = (kind in ('coa', 'temporary-coa'))),
  check (kind <> 'temporary-coa' or expires_on <= issued_on + interval '3 months'),
  check (kind <> 'coa' or expires_on <= issued_on + interval '5 years')
);

create table inductions (
  officer_id uuid not null references officers(id),
  site_id uuid not null references sites(id),
  inducted_on date not null,
  inducted_by text not null,
  created_at timestamptz not null default now(),
  primary key (officer_id, site_id)
);

create sequence shift_ref_seq start 1001;

create table shifts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('S-' || nextval('shift_ref_seq')),
  site_id uuid not null references sites(id),
  officer_id uuid references officers(id),
  starts_at timestamp not null,
  ends_at timestamp not null,
  role text not null default 'guard',
  status text not null default 'open' check (status in ('open', 'assigned', 'on-duty', 'completed', 'cancelled', 'no-show')),
  signed_on_at timestamp,
  signed_off_at timestamp,
  -- NZ s 61: a person who has applied for a certificate may cover an emergency for up to 2 weeks.
  emergency_cover boolean not null default false,
  cancel_reason text,
  override_reason text,
  note text,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '24 hours'),
  check ((status = 'open') = (officer_id is null) or status = 'cancelled'),
  check (signed_off_at is null or signed_on_at is not null),
  check (signed_off_at is null or signed_off_at > signed_on_at),
  check (status <> 'completed' or signed_off_at is not null)
);
create index shifts_officer_time on shifts (officer_id, starts_at);
create index shifts_site_time on shifts (site_id, starts_at);

create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  name text not null,
  every_minutes int not null check (every_minutes between 10 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (site_id, name)
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints(id),
  shift_id uuid not null references shifts(id),
  scanned_at timestamp not null,
  created_at timestamptz not null default now(),
  unique (checkpoint_id, scanned_at)
);

create sequence incident_ref_seq start 601;

create table incidents (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INC-' || nextval('incident_ref_seq')),
  site_id uuid not null references sites(id),
  shift_id uuid references shifts(id),
  officer_id uuid references officers(id),
  occurred_at timestamp not null,
  kind text not null check (kind in ('trespass', 'theft', 'damage', 'alarm', 'medical', 'fire', 'assault', 'suspicious', 'hazard', 'other')),
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null check (length(trim(summary)) > 0),
  detail text,
  police_event text,
  injury boolean not null default false,
  -- A notifiable event under HSWA 2015 (NZ) or the WHS Act 2011 (AU): death, notifiable injury or illness, dangerous incident.
  notifiable boolean not null default false,
  regulator_notified_at timestamp,
  client_notified_at timestamp,
  closed_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_on is null or outcome is not null)
);

create sequence invoice_ref_seq start 2001;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INV-' || nextval('invoice_ref_seq')),
  client_id uuid not null references clients(id),
  period_from date not null,
  period_to date not null,
  currency text not null check (currency in ('NZD', 'AUD')),
  hours numeric(9,2) not null,
  subtotal_cents bigint not null,
  gst_cents bigint not null,
  total_cents bigint not null,
  raised_on date not null default current_date,
  due_on date not null,
  sent_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to >= period_from),
  check (total_cents = subtotal_cents + gst_cents)
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  shift_id uuid not null unique references shifts(id),
  hours numeric(6,2) not null,
  rate_cents int not null,
  amount_cents bigint not null
);

create table activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  ref text,
  detail text not null default ''
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'activity is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

create trigger clients_touch before update on clients for each row execute function touch_updated_at();
create trigger subcontractors_touch before update on subcontractors for each row execute function touch_updated_at();
create trigger sites_touch before update on sites for each row execute function touch_updated_at();
create trigger officers_touch before update on officers for each row execute function touch_updated_at();
create trigger licences_touch before update on licences for each row execute function touch_updated_at();
create trigger shifts_touch before update on shifts for each row execute function touch_updated_at();
create trigger incidents_touch before update on incidents for each row execute function touch_updated_at();
create trigger invoices_touch before update on invoices for each row execute function touch_updated_at();

-- Read-only to everyone but the owner: a shared installation adds its own grants.
do $$
declare t text;
begin
  foreach t in array array['settings','clients','subcontractors','sites','officers','licences','inductions','shifts','checkpoints','scans','incidents','invoices','invoice_lines','activity']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

-- Every shift with its site, client, officer, planned and worked hours.
create view v_shifts as
select s.id, s.ref, s.status, si.code as site, si.name as site_name, si.region, c.code as client, c.currency,
  o.code as officer_code, o.name as officer, o.employment, sc.name as subcontractor, sc.master_licence,
  s.starts_at, s.ends_at, s.signed_on_at, s.signed_off_at, s.role, s.emergency_cover,
  round(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0, 2) as planned_hours,
  case when s.signed_off_at is not null then round(extract(epoch from (s.signed_off_at - s.signed_on_at)) / 3600.0, 2) end as worked_hours,
  si.bill_rate_cents, o.pay_rate_cents, s.site_id, s.officer_id, si.client_id, region_now(si.region) as site_now
from shifts s
join sites si on si.id = s.site_id
join clients c on c.id = si.client_id
left join officers o on o.id = s.officer_id
left join subcontractors sc on sc.id = o.subcontractor_id;

-- The licence that covers an officer in each region today, and when it runs out.
create view v_licences as
select o.code as officer_code, o.name as officer, o.status as officer_status, l.region, l.kind, l.classes, l.number,
  l.issued_on, l.expires_on, l.training_done_on, (l.expires_on - current_date) as days_left,
  case when l.expires_on < current_date then 'expired'
       when l.expires_on - current_date <= 30 then 'expires within 30 days'
       when l.expires_on - current_date <= 60 then 'expires within 60 days'
       else 'current' end as standing,
  (select min(s.starts_at) from shifts s join sites si on si.id = s.site_id
    where s.officer_id = o.id and si.region = l.region and s.status in ('assigned') and s.starts_at > region_now(si.region)) as next_shift,
  l.id, l.officer_id
from licences l join officers o on o.id = l.officer_id;

-- Every rule a rostered shift can break. One row per problem. law = a legal rule (docs/compliance.md),
-- clash = the officer is already on another shift, house = the business's own limit (overridable with a reason).
create view v_shift_problems as
with live as (
  select s.*, si.region, si.induction_required, si.subcontract_agreed_on, si.subcontract_notice_on, o.status as officer_status, o.employment, o.subcontractor_id
  from shifts s join sites si on si.id = s.site_id join officers o on o.id = s.officer_id
  where s.status in ('assigned', 'on-duty', 'completed', 'no-show')
)
select l.id as shift_id, l.ref, 'law' as kind, 'no current licence' as problem,
  case when l.region = 'NZ' then 'PSPPI Act 2010 s 44: a responsible employee must hold a certificate of approval'
       else 'State security licensing: the officer must hold a current licence for ' || l.region end as rule
from live l
where not (l.region = 'NZ' and l.emergency_cover)
  and not exists (select 1 from licences x where x.officer_id = l.officer_id and x.region = l.region
    and x.issued_on <= l.starts_at::date and x.expires_on >= l.ends_at::date)
union all
select l.id, l.ref, 'law', 'emergency cover past 2 weeks', 'PSPPI Act 2010 s 61: emergency appointment for no more than 2 continuous weeks'
from live l
where l.region = 'NZ' and l.emergency_cover
  and l.starts_at >= (select min(e.starts_at) from shifts e where e.officer_id = l.officer_id and e.emergency_cover and e.status <> 'cancelled') + interval '14 days'
union all
select l.id, l.ref, 'law', 'subcontracted without the client''s written agreement', 'Security Industry Act 1997 (NSW) s 38A(1)(a)'
from live l
where l.region = 'NSW' and l.employment = 'subcontractor' and (l.subcontract_agreed_on is null or l.subcontract_agreed_on > l.starts_at::date)
union all
select l.id, l.ref, 'law', 'no written notice of the subcontractor''s name and master licence', 'Security Industry Act 1997 (NSW) s 38A(1)(b)'
from live l
where l.region = 'NSW' and l.employment = 'subcontractor' and (l.subcontract_notice_on is null or l.subcontract_notice_on > l.starts_at::date)
union all
select l.id, l.ref, 'house', 'not inducted at this site', 'House rule: site induction before the first shift (duty of care, HSWA 2015 s 36 / WHS Act 2011 s 19)'
from live l
where l.induction_required and not exists (select 1 from inductions i where i.officer_id = l.officer_id and i.site_id = l.site_id and i.inducted_on <= l.starts_at::date)
union all
select l.id, l.ref, 'house', 'officer is ' || l.officer_status, 'House rule: only active officers are rostered'
from live l where l.officer_status <> 'active' and l.status in ('assigned', 'on-duty')
union all
select l.id, l.ref, 'house', 'shift over ' || setting_num('max_shift_hours', 12) || ' hours', 'House rule: max_shift_hours'
from live l where extract(epoch from (l.ends_at - l.starts_at)) / 3600.0 > setting_num('max_shift_hours', 12)
union all
select l.id, l.ref, 'house', 'under ' || setting_num('min_rest_hours', 10) || ' hours rest since ' || p.ref, 'House rule: min_rest_hours'
from live l
join lateral (select x.ref, (x.ends_at at time zone region_zone(xs.region)) as ends_utc from shifts x join sites xs on xs.id = x.site_id
  where x.officer_id = l.officer_id and x.id <> l.id and x.status not in ('cancelled', 'no-show')
  and (x.ends_at at time zone region_zone(xs.region)) <= (l.starts_at at time zone region_zone(l.region)) order by 2 desc limit 1) p on true
where extract(epoch from ((l.starts_at at time zone region_zone(l.region)) - p.ends_utc)) / 3600.0 < setting_num('min_rest_hours', 10)
union all
select l.id, l.ref, 'house', 'week over ' || setting_num('max_week_hours', 60) || ' hours (' || round(w.hours, 1) || ')', 'House rule: max_week_hours'
from live l
join lateral (select sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0) as hours from shifts x
  where x.officer_id = l.officer_id and x.status not in ('cancelled', 'no-show')
  and date_trunc('week', x.starts_at) = date_trunc('week', l.starts_at)) w on true
where w.hours > setting_num('max_week_hours', 60)
union all
select l.id, l.ref, 'clash', 'double booked with ' || x.ref, 'One officer, one shift at a time'
from live l join shifts x on x.officer_id = l.officer_id and x.id <> l.id and x.status not in ('cancelled', 'no-show')
join sites xs on xs.id = x.site_id
where (x.starts_at at time zone region_zone(xs.region)) < (l.ends_at at time zone region_zone(l.region))
  and (x.ends_at at time zone region_zone(xs.region)) > (l.starts_at at time zone region_zone(l.region));

-- Checkpoint scans against what each worked shift should have produced.
create view v_patrols as
select s.ref, si.code as site, o.name as officer, s.starts_at::date as day, cp.name as checkpoint, cp.every_minutes,
  floor(extract(epoch from (coalesce(s.signed_off_at, least(region_now(si.region), s.ends_at)) - s.signed_on_at)) / 60.0 / cp.every_minutes)::int as expected,
  (select count(*) from scans x where x.checkpoint_id = cp.id and x.shift_id = s.id)::int as scanned,
  s.id as shift_id, cp.id as checkpoint_id
from shifts s join sites si on si.id = s.site_id join checkpoints cp on cp.site_id = si.id and cp.active
left join officers o on o.id = s.officer_id
where s.status in ('on-duty', 'completed') and s.signed_on_at is not null;

create view v_missed_patrols as
select ref, site, officer, day, checkpoint, every_minutes, expected, scanned, expected - scanned as missed,
  round(100.0 * least(scanned, expected) / nullif(expected, 0)) as completion_pct, shift_id
from v_patrols where scanned < expected;

-- Each site's week (Monday to Sunday, site local): contracted, rostered, worked, open.
create view v_site_week as
select si.code as site, si.name as site_name, c.code as client, si.contracted_hours_week as contracted_hours,
  coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0) filter (where s.status <> 'cancelled'), 0)::numeric(8,2) as rostered_hours,
  coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0) filter (where s.status = 'open'), 0)::numeric(8,2) as open_hours,
  coalesce(sum(extract(epoch from (s.signed_off_at - s.signed_on_at)) / 3600.0) filter (where s.status = 'completed'), 0)::numeric(8,2) as worked_hours,
  si.id as site_id
from sites si join clients c on c.id = si.client_id
left join shifts s on s.site_id = si.id
  and s.starts_at >= date_trunc('week', region_now(si.region)) and s.starts_at < date_trunc('week', region_now(si.region)) + interval '7 days'
where si.active
group by si.id, si.code, si.name, c.code, si.contracted_hours_week;

-- Worked shifts not yet on an invoice.
create view v_unbilled as
select c.code as client, c.currency, si.code as site, s.ref, s.starts_at::date as day,
  round(extract(epoch from (s.signed_off_at - s.signed_on_at)) / 3600.0, 2) as hours, si.bill_rate_cents,
  round(extract(epoch from (s.signed_off_at - s.signed_on_at)) / 3600.0 * si.bill_rate_cents)::bigint as amount_cents,
  s.id as shift_id, c.id as client_id
from shifts s join sites si on si.id = s.site_id join clients c on c.id = si.client_id
where s.status = 'completed' and not exists (select 1 from invoice_lines il where il.shift_id = s.id);

create view v_incidents as
select i.ref, si.code as site, c.code as client, i.occurred_at, i.kind, i.severity, i.summary, o.name as officer, i.police_event,
  i.injury, i.notifiable, i.regulator_notified_at, i.client_notified_at, i.closed_on,
  round(extract(epoch from (region_now(si.region) - i.occurred_at)) / 3600.0, 1) as hours_since,
  case when i.closed_on is not null then 'closed'
       when i.notifiable and i.regulator_notified_at is null then 'regulator not notified'
       when i.client_notified_at is null and extract(epoch from (region_now(si.region) - i.occurred_at)) / 3600.0 > setting_num('client_notify_hours', 24) then 'client not told'
       else 'open' end as standing,
  i.id, i.site_id
from incidents i join sites si on si.id = i.site_id join clients c on c.id = si.client_id left join officers o on o.id = i.officer_id;
