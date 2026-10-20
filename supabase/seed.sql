-- Demo data: Harbourline Security, a fictional guarding firm with sites in Auckland, Sydney and Melbourne.
-- Every name, licence number and event here is invented. Dates are relative to today, so the
-- attention list always has something to say: a licence about to lapse, an expired licence still
-- rostered, a temporary certificate running out, subcontracted shifts with no client agreement,
-- an officer rostered at a site he has not been inducted at, open shifts, missed patrols, an
-- incident the client was never told about and a notifiable event not yet reported.
-- Safe to run twice: every row has a natural key.

insert into settings (key, value, note) values
  ('max_shift_hours', '12', 'House rule: longest shift we roster'),
  ('min_rest_hours', '10', 'House rule: shortest break between two shifts'),
  ('max_week_hours', '60', 'House rule: most hours one officer works in a week'),
  ('client_notify_hours', '24', 'Contract term: tell the client about an incident within this many hours'),
  ('gst_nz_pct', '15', 'GST in New Zealand'),
  ('gst_au_pct', '10', 'GST in Australia')
on conflict (key) do nothing;

insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days) values
  ('KPM', 'Kauri Point Mall Ltd', 'NZ', 'NZD', 'Rachel Moana', 'centre.manager@example.nz', 20),
  ('TLP', 'Tasman Logistics Park', 'NZ', 'NZD', 'Gareth Hollis', 'ops@example.nz', 20),
  ('PDH', 'Parramatta Data Hall Pty Ltd', 'AU', 'AUD', 'Nadia Haddad', 'facilities@example.com.au', 14),
  ('SBA', 'Southbank Apartments OC', 'AU', 'AUD', 'Owen Pike', 'strata.manager@example.com.au', 30)
on conflict (code) do nothing;

insert into subcontractors (name, region, master_licence, contact) values
  ('Westside Guarding Pty Ltd', 'NSW', '409912345', 'rostering@westside.example.com.au')
on conflict (name) do nothing;

insert into sites (code, client_id, name, address, region, service, contracted_hours_week, bill_rate_cents, induction_required, subcontract_agreed_on, subcontract_notice_on, instructions)
select v.code, c.id, v.name, v.address, v.region, v.service, v.hours, v.rate, true, null, case when v.code = 'PDH-HALL' then current_date - 10 end, v.instructions
from (values
  ('KPM-MALL', 'KPM', 'Kauri Point Mall', '1 Kauri Point Road, Auckland', 'NZ', 'static', 180, 4650, 'Lock the east doors at 21:00. Car park level 2 and the loading dock every hour after close.'),
  ('TLP-GATE', 'TLP', 'Tasman Logistics Park gatehouse', '40 Tasman Drive, Auckland', 'NZ', 'static', 84, 4400, 'Gatehouse 18:00 to 06:00. Every truck logged in and out. Perimeter fence every two hours.'),
  ('PDH-HALL', 'PDH', 'Parramatta Data Hall', '7 Hassall Street, Parramatta NSW', 'NSW', 'static', 168, 6200, 'Two-factor entry only. Escort every visitor in the hall. Fire panel check at 02:00.'),
  ('SBA-LOBBY', 'SBA', 'Southbank Apartments concierge', '88 City Road, Southbank VIC', 'VIC', 'concierge', 60, 5800, 'Weekdays 07:00 to 19:00. Parcels to the mail room. Contractors sign in.')
) as v(code, client, name, address, region, service, hours, rate, instructions)
join clients c on c.code = v.client
on conflict (code) do nothing;

insert into officers (code, name, phone, email, employment, subcontractor_id, pay_rate_cents, status, started_on)
select v.code, v.name, v.phone, v.email, v.employment, sc.id, v.pay, 'active', current_date - v.since
from (values
  ('O-101', 'Aroha Ngata', '021 555 0101', 'aroha@example.nz', 'employee', null, 2950, 900),
  ('O-102', 'Ben Fraser', '021 555 0102', 'ben@example.nz', 'employee', null, 2850, 1600),
  ('O-103', 'Sione Taufa', '021 555 0103', 'sione@example.nz', 'employee', null, 2700, 80),
  ('O-104', 'Mere Walker', '021 555 0104', 'mere@example.nz', 'employee', null, 3000, 2100),
  ('O-105', 'Liam Chen', '021 555 0105', 'liam@example.nz', 'employee', null, 2800, 300),
  ('O-106', 'Rawiri Hohaia', '021 555 0106', 'rawiri@example.nz', 'employee', null, 2900, 1300),
  ('O-201', 'Priya Sharma', '0412 555 201', 'priya@example.com.au', 'employee', null, 3600, 700),
  ('O-204', 'Lucy Tran', '0412 555 204', 'lucy@example.com.au', 'employee', null, 3550, 950),
  ('O-202', 'Daniel Okafor', '0412 555 202', 'daniel@example.com.au', 'subcontractor', 'Westside Guarding Pty Ltd', 3900, 200),
  ('O-203', 'Tom Reilly', '0412 555 203', 'tom@example.com.au', 'subcontractor', 'Westside Guarding Pty Ltd', 3900, 400),
  ('O-301', 'Grace Nguyen', '0413 555 301', 'grace@example.com.au', 'employee', null, 3400, 500),
  ('O-302', 'Hamish Doyle', '0413 555 302', 'hamish@example.com.au', 'employee', null, 3300, 1100)
) as v(code, name, phone, email, employment, sub, pay, since)
left join subcontractors sc on sc.name = v.sub
on conflict (code) do nothing;

-- Licences: Ben's certificate lapses in 4 days, Sione's temporary certificate runs out in 9 with no
-- training recorded, Tom's NSW licence expired 3 days ago, Hamish's VIC licence has 45 days left.
insert into licences (officer_id, region, kind, classes, number, issued_on, expires_on, training_done_on)
select o.id, v.region, v.kind, v.classes, v.number, v.issued, v.expires, v.training
from (values
  ('O-101', 'NZ', 'coa', 'property guard, crowd controller', 'COA-24-118204', current_date - 700, current_date - 700 + 1825, current_date - 720),
  ('O-102', 'NZ', 'coa', 'property guard', 'COA-21-090311', current_date - 1821, current_date + 4, current_date - 1830),
  ('O-103', 'NZ', 'temporary-coa', 'property guard', 'TCOA-26-004417', current_date - 76, current_date + 9, null),
  ('O-104', 'NZ', 'coa', 'property guard, personal guard', 'COA-23-051120', current_date - 1000, current_date - 1000 + 1825, current_date - 1010),
  ('O-105', 'NZ', 'coa', 'property guard', 'COA-26-001982', current_date - 300, current_date - 300 + 1825, current_date - 310),
  ('O-106', 'NZ', 'coa', 'property guard', 'COA-25-033871', current_date - 450, current_date - 450 + 1825, current_date - 460),
  ('O-201', 'NSW', 'security-licence', '1A, 1C', '000118203', current_date - 500, current_date + 595, null),
  ('O-204', 'NSW', 'security-licence', '1A', '000121940', current_date - 300, current_date + 795, null),
  ('O-202', 'NSW', 'security-licence', '1A', '000120477', current_date - 200, current_date + 895, null),
  ('O-203', 'NSW', 'security-licence', '1A', '000099318', current_date - 1098, current_date - 3, null),
  ('O-301', 'VIC', 'security-licence', 'unarmed guard', 'VIC-871204', current_date - 400, current_date + 695, null),
  ('O-302', 'VIC', 'security-licence', 'unarmed guard, crowd controller', 'VIC-760091', current_date - 1050, current_date + 45, null)
) as v(officer, region, kind, classes, number, issued, expires, training)
join officers o on o.code = v.officer
on conflict (region, kind, number) do nothing;

-- Inductions. Liam has never been inducted at the Tasman gatehouse.
insert into inductions (officer_id, site_id, inducted_on, inducted_by)
select o.id, s.id, current_date - 60, 'Kate Brennan (ops manager)'
from (values ('O-101', 'KPM-MALL'), ('O-102', 'KPM-MALL'), ('O-103', 'KPM-MALL'), ('O-105', 'KPM-MALL'), ('O-104', 'TLP-GATE'), ('O-106', 'TLP-GATE'), ('O-204', 'PDH-HALL'),
  ('O-201', 'PDH-HALL'), ('O-202', 'PDH-HALL'), ('O-203', 'PDH-HALL'), ('O-301', 'SBA-LOBBY'), ('O-302', 'SBA-LOBBY')) as v(officer, site)
join officers o on o.code = v.officer join sites s on s.code = v.site
on conflict do nothing;

insert into checkpoints (site_id, name, every_minutes)
select s.id, v.name, v.every from (values
  ('KPM-MALL', 'Car park level 2', 60), ('KPM-MALL', 'Loading dock', 60),
  ('TLP-GATE', 'Perimeter fence north', 120), ('PDH-HALL', 'Fire panel', 240), ('PDH-HALL', 'Hall B cage row', 120)
) as v(site, name, every) join sites s on s.code = v.site
on conflict (site_id, name) do nothing;

-- The roster: seven days back and seven days ahead, planned in each site's own time.
with plan as (
  select si.code as site, si.region, d, (region_now(si.region)::date + d) as day, p.slot, p.start_h, p.len_h, p.role,
    case
      when si.code = 'KPM-MALL' and p.slot = 'day' then case when d % 2 = 0 then 'O-101' else 'O-105' end
      when si.code = 'KPM-MALL' and p.slot = 'night' then case when d % 2 = 0 then 'O-102' else 'O-103' end
      when si.code = 'KPM-MALL' and p.slot = 'event' then null
      when si.code = 'TLP-GATE' then case when d = 3 then 'O-105' when d % 2 = 0 then 'O-104' else 'O-106' end
      when si.code = 'PDH-HALL' and p.slot = 'day' then case when d % 2 = 0 then 'O-201' else 'O-204' end
      when si.code = 'PDH-HALL' and p.slot = 'night' then case when d % 2 = 0 then 'O-202' else 'O-203' end
      when si.code = 'PDH-HALL' and p.slot = 'escort' then 'O-201'
      when si.code = 'SBA-LOBBY' then case when d in (2, 6) then null when extract(isodow from region_now(si.region)::date + d) in (1, 3, 5) then 'O-301' else 'O-302' end
    end as officer
  from sites si
  cross join generate_series(-7, 7) as d
  join (values
    ('KPM-MALL', 'day', 6, 12, 'guard'), ('KPM-MALL', 'night', 18, 12, 'guard'), ('KPM-MALL', 'event', 10, 6, 'event cover'),
    ('TLP-GATE', 'night', 18, 12, 'gatehouse'),
    ('PDH-HALL', 'day', 6, 12, 'guard'), ('PDH-HALL', 'night', 18, 12, 'guard'), ('PDH-HALL', 'escort', 22, 6, 'escort'),
    ('SBA-LOBBY', 'day', 7, 12, 'concierge')
  ) as p(site, slot, start_h, len_h, role) on p.site = si.code
  where (p.slot <> 'event' or d = 1)
    and (p.slot <> 'escort' or d = 2)
    and (si.code <> 'SBA-LOBBY' or extract(isodow from region_now(si.region)::date + d) < 6 or d in (2, 6))
),
timed as (
  select plan.*, (day + make_interval(hours => start_h))::timestamp as starts_at,
    (day + make_interval(hours => start_h + len_h))::timestamp as ends_at, region_now(region) as now_local
  from plan
)
insert into shifts (site_id, officer_id, starts_at, ends_at, role, status, signed_on_at, signed_off_at, external_id)
select si.id, o.id, t.starts_at, t.ends_at, t.role,
  case when o.id is null then 'open'
       when t.site = 'KPM-MALL' and t.slot = 'night' and t.d = -2 then 'no-show'
       when t.ends_at <= t.now_local then 'completed'
       when t.starts_at <= t.now_local then 'on-duty'
       else 'assigned' end,
  case when o.id is not null and t.starts_at <= t.now_local and not (t.site = 'KPM-MALL' and t.slot = 'night' and t.d = -2)
       then t.starts_at + make_interval(mins => (abs(t.d) * 3) % 9) end,
  case when o.id is not null and t.ends_at <= t.now_local and not (t.site = 'KPM-MALL' and t.slot = 'night' and t.d = -2)
       then t.ends_at + make_interval(mins => (abs(t.d) * 7) % 20) end,
  'seed:' || t.site || ':' || t.slot || ':' || t.day
from timed t
join sites si on si.code = t.site
left join officers o on o.code = t.officer
on conflict (external_id) do nothing;

-- Checkpoint scans for every worked shift. Sione's night shifts at the mall stop scanning after
-- six hours, and the Parramatta fire panel was missed on the night of three days ago.
insert into scans (checkpoint_id, shift_id, scanned_at)
select cp.id, s.id, g.at
from shifts s
join sites si on si.id = s.site_id
join checkpoints cp on cp.site_id = si.id
left join officers o on o.id = s.officer_id
cross join lateral generate_series(s.signed_on_at + interval '5 minutes',
  coalesce(s.signed_off_at, least(region_now(si.region), s.ends_at)) - interval '1 minute',
  make_interval(mins => cp.every_minutes)) as g(at)
where s.external_id like 'seed:%' and s.signed_on_at is not null
  and not (o.code = 'O-103' and si.code = 'KPM-MALL' and g.at > s.signed_on_at + interval '6 hours')
  and not (si.code = 'PDH-HALL' and cp.name = 'Fire panel' and s.starts_at::date = region_now(si.region)::date - 3 and s.role = 'guard' and extract(hour from s.starts_at) = 18)
on conflict (checkpoint_id, scanned_at) do nothing;

insert into incidents (ref, site_id, shift_id, officer_id, occurred_at, kind, severity, summary, detail, police_event, injury, notifiable,
  regulator_notified_at, client_notified_at, closed_on, outcome)
select v.ref, si.id,
  (select s.id from shifts s where s.site_id = si.id and s.starts_at <= v.at and s.ends_at > v.at and s.officer_id is not null order by s.starts_at limit 1),
  (select s.officer_id from shifts s where s.site_id = si.id and s.starts_at <= v.at and s.ends_at > v.at and s.officer_id is not null order by s.starts_at limit 1),
  v.at, v.kind, v.severity, v.summary, v.detail, v.police, v.injury, v.notifiable, null,
  case when v.told then v.at + interval '2 hours' end, v.closed, v.outcome
from (values
  ('INC-501', 'KPM-MALL', (region_now('NZ')::date - 1) + time '21:40', 'trespass', 'low', 'Two youths in the car park after close', 'Asked to leave, left by the south exit at 21:52.', null, false, false, true, region_now('NZ')::date - 1, 'Moved on, no damage'),
  ('INC-502', 'KPM-MALL', (region_now('NZ')::date - 2) + time '02:15', 'damage', 'medium', 'Forced door on tenancy 14 found on patrol', 'Door frame split, alarm had not triggered. Tenancy checked with police, nothing taken that we could see.', 'P061384922', false, false, false, null, null),
  ('INC-503', 'PDH-HALL', (region_now('NSW')::date - 1) + time '03:10', 'medical', 'high', 'Contractor fell from a step ladder in Hall B', 'Contractor struck his head, ambulance called at 03:12, taken to Westmead Hospital and admitted.', null, true, true, true, null, null),
  ('INC-504', 'TLP-GATE', (region_now('NZ')::date - 4) + time '23:05', 'alarm', 'low', 'Perimeter alarm zone 4', 'Possum on the fence line. Alarm reset 23:20.', null, false, false, true, region_now('NZ')::date - 4, 'False alarm, wildlife'),
  ('INC-505', 'SBA-LOBBY', (region_now('VIC')::date - 3) + time '15:30', 'hazard', 'medium', 'Water leak from level 3 ceiling into the lobby', 'Area coned off, building manager and plumber called.', null, false, false, true, null, null)
) as v(ref, site, at, kind, severity, summary, detail, police, injury, notifiable, told, closed, outcome)
join sites si on si.code = v.site
on conflict (ref) do nothing;

-- One invoice paid, one sent and overdue.
insert into invoices (ref, client_id, period_from, period_to, currency, hours, subtotal_cents, gst_cents, total_cents, raised_on, due_on, sent_on, paid_on)
select v.ref, c.id, v.pfrom, v.pto, c.currency, v.hours, v.sub, v.gst, v.sub + v.gst, v.raised, v.raised + c.invoice_days, v.raised, v.paid
from (values
  ('INV-1998', 'KPM', current_date - 45, current_date - 39, 168.00, 781200, 117180, current_date - 38, null::date),
  ('INV-1999', 'PDH', current_date - 31, current_date - 25, 168.00, 1041600, 104160, current_date - 24, current_date - 12)
) as v(ref, client, pfrom, pto, hours, sub, gst, raised, paid)
join clients c on c.code = v.client
on conflict (ref) do nothing;

insert into activity (actor, action, ref, detail)
select 'Kate Brennan (ops manager)', v.action, v.ref, v.detail
from (values
  ('import', null, 'Demo data loaded: 4 clients, 4 sites, 12 officers, a fortnight of shifts'),
  ('incident', 'INC-503', 'Logged by Priya Sharma at 03:25'),
  ('note', 'PDH-HALL', 'Westside Guarding supplying the night shifts from this week')
) as v(action, ref, detail)
where not exists (select 1 from activity);
