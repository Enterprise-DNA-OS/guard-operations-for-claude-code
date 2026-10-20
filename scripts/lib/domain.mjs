// The rules of the guarding desk. scripts/guarding.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Shift times are wall-clock times at the site: "2026-10-21 18:00" means 6 pm where the site is.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}

// "2026-10-21 18:00" (or with a T) -> "2026-10-21 18:00:00", a site wall-clock time.
export function stamp(v, label) {
  const s = String(v ?? '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})(?::00)?$/);
  if (!m) throw Error(`--${label} must be a date and time like 2026-10-21 18:00`);
  date(m[1], label);
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) throw Error(`--${label} has an impossible time`);
  return `${m[1]} ${String(h).padStart(2, '0')}:${m[3]}:00`;
}

// "46.50" or "$46.50" -> 4650 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 46.50`);
  const n = Math.round(parseFloat(s) * 100);
  if (n <= 0) throw Error(`--${label} must be more than zero`);
  return n;
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
// Wall-clock stamps compared as if UTC: both sides are the same site's clock.
const ms = (v) => Date.parse(String(v).replace(' ', 'T').slice(0, 19) + 'Z');
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);

const REGIONS = ['NZ', 'NSW', 'ACT', 'VIC', 'TAS', 'QLD', 'SA', 'NT', 'WA'];
const SERVICES = ['static', 'mobile-patrol', 'alarm-response', 'crowd-control', 'concierge'];
const KINDS = ['trespass', 'theft', 'damage', 'alarm', 'medical', 'fire', 'assault', 'suspicious', 'hazard', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}

// Resolve one record from a code, reference, id prefix or name. Exact (case-insensitive) beats
// partial; more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const client = async (db, term) => choose(await db.query('select * from clients order by code'), term, 'Client', (r) => [r.code, r.name, r.id]);
export const site = async (db, term) => choose(await db.query('select s.*, c.code as client, c.currency, c.country from sites s join clients c on c.id = s.client_id order by s.code'), term, 'Site', (r) => [r.code, r.name, r.id]);
export const officer = async (db, term) => choose(await db.query('select * from officers order by code'), term, 'Officer', (r) => [r.code, r.name, r.id]);
export const shift = async (db, term) => choose(await db.query('select * from v_shifts order by starts_at'), term, 'Shift', (r) => [r.ref, r.id]);
const incident = async (db, term) => choose(await db.query('select * from incidents order by ref'), term, 'Incident', (r) => [r.ref, r.id]);
const invoice = async (db, term) => choose(await db.query('select * from invoices order by ref'), term, 'Invoice', (r) => [r.ref, r.id]);
const subcontractor = async (db, term) => choose(await db.query('select * from subcontractors order by name'), term, 'Subcontractor', (r) => [r.name, r.master_licence, r.id]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);
const siteNow = async (db, region) => (await db.query('select region_now($1)::text as now', [region]))[0].now.slice(0, 19);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body);
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// ------------------------------------------------------------------ the gate on every roster change

// Problems the shift would have with this officer on it, worked out inside a savepoint so nothing sticks.
async function problemsWith(db, s, officerId, emergency) {
  await db.exec('savepoint probe');
  try {
    await db.query(`update shifts set officer_id = $2, status = case when status = 'open' then 'assigned' else status end, emergency_cover = $3 where id = $1`, [s.id, officerId, emergency]);
    return await db.query('select kind, problem, rule from v_shift_problems where shift_id = $1 order by kind, problem', [s.id]);
  } finally {
    await db.exec('rollback to savepoint probe');
  }
}

export const reads = {
  async attention(db) {
    const rows = await db.query(`
      select 1 as rank, 'open shift' as item, ref, site || ' ' || to_char(starts_at, 'Dy DD Mon HH24:MI') || ' for ' || planned_hours || 'h' as detail
        from v_shifts where status = 'open' and starts_at < site_now + interval '7 days' and ends_at > site_now
      union all
      select 2, 'rostered against the law', p.ref, p.problem || ' (' || s.officer || ', ' || to_char(s.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_shift_problems p join v_shifts s on s.id = p.shift_id
        where p.kind = 'law' and s.status in ('assigned', 'on-duty') and s.starts_at < s.site_now + interval '14 days'
      union all
      select 2, 'double booked', p.ref, p.problem || ' (' || s.officer || ', ' || to_char(s.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_shift_problems p join v_shifts s on s.id = p.shift_id
        where p.kind = 'clash' and s.status in ('assigned', 'on-duty') and s.starts_at < s.site_now + interval '14 days'
      union all
      select 3, 'house rule broken', p.ref, p.problem || ' (' || s.officer || ', ' || to_char(s.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_shift_problems p join v_shifts s on s.id = p.shift_id
        where p.kind = 'house' and s.status in ('assigned', 'on-duty') and s.starts_at < s.site_now + interval '7 days'
      union all
      select 2, 'licence expired', officer_code, officer || ': ' || region || ' ' || kind || ' expired ' || expires_on || coalesce(', next shift ' || to_char(next_shift, 'Dy DD Mon HH24:MI'), '')
        from v_licences where days_left < 0 and officer_status = 'active'
          and not exists (select 1 from licences n where n.officer_id = v_licences.officer_id and n.region = v_licences.region and n.expires_on > v_licences.expires_on)
      union all
      select 4, 'licence expires soon', officer_code, officer || ': ' || region || ' ' || kind || ' ' || number || ' expires ' || expires_on || ' (' || days_left || ' days)'
        from v_licences where days_left between 0 and 30 and officer_status = 'active'
          and not exists (select 1 from licences n where n.officer_id = v_licences.officer_id and n.region = v_licences.region and n.expires_on > v_licences.expires_on)
      union all
      select 3, 'temporary certificate ending, no training recorded', officer_code, officer || ': ' || number || ' ends ' || expires_on
        from v_licences where kind = 'temporary-coa' and training_done_on is null and days_left between 0 and 21 and officer_status = 'active'
      union all
      select 1, 'no sign-on', ref, officer || ' due at ' || site || ' ' || to_char(starts_at, 'HH24:MI')
        from v_shifts where status = 'assigned' and starts_at + interval '15 minutes' < site_now and ends_at > site_now
      union all
      select 2, 'not signed off', ref, officer || ' at ' || site || ', shift ended ' || to_char(ends_at, 'Dy HH24:MI')
        from v_shifts where status = 'on-duty' and ends_at + interval '30 minutes' < site_now
      union all
      select 3, 'missed patrols', ref, site || ' ' || officer || ' ' || day || ': ' || sum(missed) || ' checkpoint scans missed'
        from v_missed_patrols where day >= current_date - 3 group by ref, site, officer, day
      union all
      select 1, 'regulator not notified', ref, site || ': ' || summary
        from v_incidents where standing = 'regulator not notified'
      union all
      select 2, 'client not told', ref, site || ': ' || summary || ' (' || hours_since || 'h ago)'
        from v_incidents where standing = 'client not told'
      union all
      select 4, 'incident open over 7 days', ref, site || ': ' || summary
        from v_incidents where closed_on is null and hours_since > 168
      union all
      select 4, 'under contracted hours this week', site, (rostered_hours - open_hours) || 'h covered of ' || contracted_hours || 'h contracted' || case when open_hours > 0 then ', ' || open_hours || 'h still open' else '' end
        from v_site_week where rostered_hours - open_hours < contracted_hours
      union all
      select 3, 'invoice overdue', i.ref, c.code || ' ' || i.currency || ' ' || to_char(i.total_cents / 100.0, 'FM999,999,990.00') || ' due ' || i.due_on
        from invoices i join clients c on c.id = i.client_id where i.paid_on is null and i.sent_on is not null and i.due_on < current_date
      union all
      select 4, 'worked hours not invoiced', client, count(*) || ' shifts, ' || sum(hours) || 'h since ' || min(day)
        from v_unbilled group by client having min(day) < current_date - 14
      order by 1, 2, 3`);
    return rows.map(({ rank, ...r }) => r);
  },

  async roster(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 7;
    const from = f.from ? date(f.from, 'from') : null;
    const params = [days];
    let where = '';
    if (f.site) { params.push((await site(db, f.site)).id); where += ` and s.site_id = $${params.length}`; }
    if (f.officer) { params.push((await officer(db, f.officer)).id); where += ` and s.officer_id = $${params.length}`; }
    if (from) params.push(from);
    const start = from ? `$${params.length}::date` : 'site_now::date';
    return db.query(`select s.ref, to_char(s.starts_at, 'Dy DD Mon') as day, to_char(s.starts_at, 'HH24:MI') || '-' || to_char(s.ends_at, 'HH24:MI') as hours,
        s.site, coalesce(s.officer, '(open)') as officer, s.role, s.status,
        (select string_agg(p.problem, '; ') from v_shift_problems p where p.shift_id = s.id) as problems
      from v_shifts s where s.status <> 'cancelled' and s.starts_at >= ${start} and s.starts_at < ${start} + make_interval(days => $1) ${where}
      order by s.starts_at, s.site`, params);
  },

  async 'open-shifts'(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 14;
    return db.query(`select ref, site, region, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours as hours, role
      from v_shifts where status = 'open' and ends_at > site_now and starts_at < site_now + make_interval(days => $1) order by starts_at`, [days]);
  },

  // Who can take this shift, legally and inside the house rules, fewest hours that week first.
  async cover(db, args) {
    const s = await shift(db, args[0]);
    if (['completed', 'cancelled', 'no-show'].includes(s.status)) throw Error(`${s.ref} is ${s.status}`);
    const candidates = await db.query(`select o.id, o.code, o.name, o.employment,
        coalesce((select sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0) from shifts x where x.officer_id = o.id and x.status not in ('cancelled', 'no-show')
          and date_trunc('week', x.starts_at) = date_trunc('week', $2::timestamp)), 0)::numeric(6,1) as week_hours
      from officers o where o.status = 'active' and o.id is distinct from $1 order by o.code`, [s.officer_id, s.starts_at]);
    const out = [];
    await db.exec('begin');
    try {
      for (const c of candidates) {
        const p = await problemsWith(db, s, c.id, false);
        out.push({ officer: c.name, code: c.code, employment: c.employment, week_hours: c.week_hours,
          verdict: p.some((x) => x.kind !== 'house') ? 'cannot' : p.length ? 'house rule' : 'can cover', why: p.map((x) => x.problem).join('; ') });
      }
    } finally { await db.exec('rollback'); }
    const order = { 'can cover': 0, 'house rule': 1, cannot: 2 };
    return out.sort((a, b) => order[a.verdict] - order[b.verdict] || Number(a.week_hours) - Number(b.week_hours) || a.code.localeCompare(b.code));
  },

  async check(db, args, f) {
    const s = await shift(db, args[0]);
    if (f.officer) {
      const o = await officer(db, f.officer);
      await db.exec('begin');
      try { return await problemsWith(db, s, o.id, f.emergency === true); } finally { await db.exec('rollback'); }
    }
    return db.query('select kind, problem, rule from v_shift_problems where shift_id = $1 order by kind, problem', [s.id]);
  },

  async compliance(db, args, f) {
    const ahead = f.days ? num(f.days, 'days', { min: 1, max: 90 }) : 14;
    const back = f.past ? num(f.past, 'past', { min: 0, max: 365 }) : 30;
    const shiftRows = await db.query(`select p.kind, p.problem, p.rule, count(*)::int as shifts, min(p.ref) as first, min(s.starts_at)::text as earliest
      from v_shift_problems p join v_shifts s on s.id = p.shift_id
      where s.starts_at >= s.site_now - make_interval(days => $2) and s.starts_at < s.site_now + make_interval(days => $1)
      group by p.kind, p.problem, p.rule order by case p.kind when 'law' then 0 when 'clash' then 1 else 2 end, shifts desc`, [ahead, back]);
    const other = await db.query(`
      select 'law' as kind, 'temporary certificate past 3 months without full certificate' as problem, 'PSPPI Act 2010 s 60(5): a temporary certificate lasts 3 months' as rule,
        count(*)::int as shifts, min(officer_code) as first, null::text as earliest
        from v_licences t where kind = 'temporary-coa' and days_left < 0 and officer_status = 'active'
          and not exists (select 1 from licences c where c.officer_id = t.officer_id and c.kind = 'coa' and c.expires_on >= current_date)
        having count(*) > 0
      union all
      select 'law', 'notifiable event not reported to the regulator', 'HSWA 2015 s 56 (NZ) / WHS Act 2011 s 38 (AU): notify as soon as possible',
        count(*)::int, min(ref), min(occurred_at)::text from v_incidents where standing = 'regulator not notified' having count(*) > 0
      union all
      select 'house', 'client not told about an incident within ' || setting_num('client_notify_hours', 24) || ' hours', 'Contract term: client_notify_hours',
        count(*)::int, min(ref), min(occurred_at)::text from v_incidents where standing = 'client not told' having count(*) > 0`);
    return [...shiftRows.map(({ ...r }) => r), ...other];
  },

  async licences(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 0, max: 3650 }) : null;
    return db.query(`select officer_code as code, officer, region, kind, classes, number, issued_on, expires_on, days_left, standing,
        to_char(next_shift, 'Dy DD Mon HH24:MI') as next_shift
      from v_licences where officer_status = 'active' and ($1::int is null or days_left <= $1) order by expires_on`, [days]);
  },

  async officers(db) {
    return db.query(`select o.code, o.name, o.employment, sc.name as subcontractor, o.status, o.phone,
        (select string_agg(l.region || ' to ' || l.expires_on, ', ' order by l.region) from licences l where l.officer_id = o.id and l.expires_on >= current_date) as licensed,
        (select string_agg(si.code, ', ' order by si.code) from inductions i join sites si on si.id = i.site_id where i.officer_id = o.id) as inducted_at,
        coalesce((select sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0) from shifts x where x.officer_id = o.id and x.status not in ('cancelled', 'no-show')
          and date_trunc('week', x.starts_at) = date_trunc('week', localtimestamp)), 0)::numeric(6,1) as hours_this_week
      from officers o left join subcontractors sc on sc.id = o.subcontractor_id order by o.code`);
  },

  async officer(db, args) {
    const o = await officer(db, args[0]);
    const licences = await db.query('select region, kind, classes, number, issued_on, expires_on, days_left, standing, training_done_on from v_licences where officer_id = $1 order by expires_on desc', [o.id]);
    const inductions = await db.query('select si.code as site, i.inducted_on, i.inducted_by from inductions i join sites si on si.id = i.site_id where i.officer_id = $1 order by si.code', [o.id]);
    const upcoming = await db.query(`select ref, site, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours as hours, status,
        (select string_agg(p.problem, '; ') from v_shift_problems p where p.shift_id = v_shifts.id) as problems
      from v_shifts where officer_id = $1 and status in ('assigned', 'on-duty') order by starts_at limit 14`, [o.id]);
    const incidents = await db.query('select ref, site, occurred_at, kind, severity, summary from v_incidents where id in (select id from incidents where officer_id = $1) order by occurred_at desc limit 10', [o.id]);
    return { officer: o, licences, inductions, upcoming, incidents };
  },

  async clients(db) {
    return db.query(`select c.code, c.name, c.country, c.currency, c.invoice_days, c.contact_name, c.contact_email,
        (select count(*) from sites s where s.client_id = c.id and s.active)::int as sites,
        (select coalesce(sum(total_cents), 0) from invoices i where i.client_id = c.id and i.paid_on is null) as owing_cents
      from clients c order by c.code`);
  },

  async sites(db) {
    return db.query(`select s.code, s.name, c.code as client, s.region, s.service, s.contracted_hours_week as contracted, s.bill_rate_cents, c.currency,
        s.induction_required as induction, s.subcontract_agreed_on, s.subcontract_notice_on, s.active
      from sites s join clients c on c.id = s.client_id order by s.code`);
  },

  async site(db, args) {
    const s = await site(db, args[0]);
    const week = (await db.query('select contracted_hours, rostered_hours, open_hours, worked_hours from v_site_week where site_id = $1', [s.id]))[0] || null;
    const checkpoints = await db.query('select name, every_minutes, active from checkpoints where site_id = $1 order by name', [s.id]);
    const inducted = await db.query('select o.code, o.name, i.inducted_on from inductions i join officers o on o.id = i.officer_id where i.site_id = $1 order by o.code', [s.id]);
    const incidents = await db.query('select ref, occurred_at, kind, severity, summary, standing from v_incidents where site_id = $1 order by occurred_at desc limit 10', [s.id]);
    return { site: s, week, checkpoints, inducted, incidents };
  },

  async subcontractors(db) {
    return db.query(`select sc.name, sc.region, sc.master_licence, sc.contact,
      (select count(*) from officers o where o.subcontractor_id = sc.id and o.status = 'active')::int as officers from subcontractors sc order by sc.name`);
  },

  async patrols(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 90 }) : 7;
    return db.query(`select site, checkpoint, count(distinct shift_id)::int as shifts, sum(expected)::int as expected, sum(scanned)::int as scanned,
        round(100.0 * sum(least(scanned, expected)) / nullif(sum(expected), 0))::int as completion_pct,
        (select string_agg(distinct m.officer, ', ') from v_missed_patrols m where m.site = p.site and m.checkpoint = p.checkpoint and m.day >= current_date - $1::int) as missed_by
      from v_patrols p where day >= current_date - $1::int group by site, checkpoint order by completion_pct, site`, [days]);
  },

  async incidents(db, args, f) {
    return db.query(`select ref, site, to_char(occurred_at, 'DD Mon HH24:MI') as occurred, kind, severity, summary, officer, police_event, standing
      from v_incidents where ($1::boolean is not true or closed_on is null) order by occurred_at desc`, [f.open === true]);
  },

  async incident(db, args) {
    const i = await incident(db, args[0]);
    const [v] = await db.query('select * from v_incidents where id = $1', [i.id]);
    const activity = await db.query('select at, actor, action, detail from activity where ref = $1 order by at', [i.ref]);
    return { incident: { ...v, detail: i.detail, outcome: i.outcome }, activity };
  },

  async hours(db) {
    return db.query(`select site, client, contracted_hours as contracted, rostered_hours as rostered, open_hours as open, worked_hours as worked,
        (rostered_hours - open_hours - contracted_hours)::numeric(8,2) as covered_minus_contract from v_site_week order by site`);
  },

  async workload(db) {
    const max = await setting(db, 'max_week_hours', 60);
    return db.query(`select o.code, o.name, coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0), 0)::numeric(6,1) as hours_this_week,
        $1::numeric - coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0), 0)::numeric(6,1) as headroom, count(s.id)::int as shifts
      from officers o left join shifts s on s.officer_id = o.id and s.status not in ('cancelled', 'no-show') and date_trunc('week', s.starts_at) = date_trunc('week', localtimestamp)
      where o.status = 'active' group by o.id order by hours_this_week desc`, [max]);
  },

  async unbilled(db) {
    return db.query(`select client, currency, site, count(*)::int as shifts, sum(hours)::numeric(9,2) as hours, sum(amount_cents)::bigint as amount_cents, min(day) as oldest
      from v_unbilled group by client, currency, site order by client, site`);
  },

  async invoices(db) {
    return db.query(`select i.ref, c.code as client, i.period_from, i.period_to, i.hours, i.total_cents, i.currency, i.raised_on, i.due_on, i.sent_on, i.paid_on,
        case when i.paid_on is not null then 'paid' when i.sent_on is null then 'not sent' when i.due_on < current_date then 'overdue' else 'sent' end as standing
      from invoices i join clients c on c.id = i.client_id order by i.raised_on desc, i.ref`);
  },

  async activity(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at > now() - make_interval(days => $1) order by at desc`, [days]);
  },

  async insights(db) {
    return insights(db);
  },
};

// ------------------------------------------------------------------ ten questions TrackTik's dashboard does not answer

export const QUESTIONS = [
  ['Which sites earn the least per hour after officer pay, over the last 28 days?', `
    select site, round(avg(bill_rate_cents - pay_rate_cents))::int as margin_per_hour_cents, currency, sum(worked_hours)::numeric(8,1) as hours
    from v_shifts where status = 'completed' and starts_at >= current_date - 28 group by site, currency order by margin_per_hour_cents`],
  ['Which sites are rostered below their contracted hours this week, and by how much?', `
    select site, contracted_hours, rostered_hours - open_hours as covered_hours, (contracted_hours - rostered_hours + open_hours)::numeric(8,1) as short_hours
    from v_site_week where rostered_hours - open_hours < contracted_hours order by short_hours desc`],
  ['Which officers complete the fewest checkpoint scans, over the last 14 days?', `
    select officer, sum(expected)::int as expected, sum(scanned)::int as scanned, round(100.0 * sum(least(scanned, expected)) / nullif(sum(expected), 0))::int as completion_pct
    from v_patrols where day >= current_date - 14 group by officer order by completion_pct, officer`],
  ['Which officers have a licence that runs out before their last rostered shift?', `
    select l.officer, l.region, l.expires_on, max(s.ends_at)::date as last_rostered
    from v_licences l join v_shifts s on s.officer_id = l.officer_id and s.region = l.region and s.status = 'assigned'
    where not exists (select 1 from licences n where n.officer_id = l.officer_id and n.region = l.region and n.expires_on > l.expires_on)
    group by l.officer, l.region, l.expires_on having max(s.ends_at)::date > l.expires_on order by l.expires_on`],
  ['How much worked time is not invoiced yet, by client?', `
    select client, currency, count(*)::int as shifts, sum(hours)::numeric(9,1) as hours, sum(amount_cents)::bigint as amount_cents, min(day) as since
    from v_unbilled group by client, currency order by amount_cents desc`],
  ['Who signs on late, and by how many minutes on average, over the last 14 days?', `
    select officer, count(*)::int as shifts, round(avg(extract(epoch from (signed_on_at - starts_at)) / 60.0), 1) as avg_minutes_late,
      count(*) filter (where signed_on_at > starts_at + interval '5 minutes')::int as over_5_minutes
    from v_shifts where signed_on_at is not null and starts_at >= current_date - 14 group by officer order by avg_minutes_late desc`],
  ['Which sites have the most incidents per 100 hours worked, over the last 30 days?', `
    select s.site, count(distinct i.id)::int as incidents, coalesce(h.hours, 0)::numeric(8,1) as hours,
      round(100.0 * count(distinct i.id) / nullif(h.hours, 0), 2) as per_100_hours
    from (select distinct site, site_id from v_shifts) s
    left join incidents i on i.site_id = s.site_id and i.occurred_at >= current_date - 30
    left join (select site_id, sum(worked_hours) as hours from v_shifts where status = 'completed' and starts_at >= current_date - 30 group by site_id) h on h.site_id = s.site_id
    group by s.site, h.hours order by per_100_hours desc nulls last`],
  ['How many hours did subcontractors work, by site, and what share of the site is that?', `
    select site, coalesce(sum(planned_hours) filter (where employment = 'subcontractor'), 0)::numeric(8,1) as subcontractor_hours, sum(planned_hours)::numeric(8,1) as all_hours,
      round(100.0 * coalesce(sum(planned_hours) filter (where employment = 'subcontractor'), 0) / nullif(sum(planned_hours), 0))::int as share_pct
    from v_shifts where status not in ('cancelled', 'open') and starts_at >= current_date - 28 group by site order by share_pct desc`],
  ['Which officers are within 12 hours of the weekly limit this week?', `
    select o.name as officer, coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0), 0)::numeric(6,1) as hours_this_week, setting_num('max_week_hours', 60) as limit_hours
    from officers o join shifts s on s.officer_id = o.id and s.status not in ('cancelled', 'no-show') and date_trunc('week', s.starts_at) = date_trunc('week', localtimestamp)
    where o.status = 'active' group by o.name having sum(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0) >= setting_num('max_week_hours', 60) - 12 order by hours_this_week desc`],
  ['How long does each client wait to hear about an incident?', `
    select client, count(*)::int as incidents, round(avg(extract(epoch from (client_notified_at - occurred_at)) / 3600.0), 1) as avg_hours_to_tell,
      count(*) filter (where client_notified_at is null)::int as never_told
    from v_incidents group by client order by never_told desc, avg_hours_to_tell desc nulls last`],
];

export async function insights(db) {
  const out = [];
  for (const [question, sql] of QUESTIONS) out.push({ question, rows: await db.query(sql) });
  return out;
}

// ------------------------------------------------------------------ writes

const writes = {
  async 'add-client'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'country');
    const country = oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country');
    const code = String(f.code).toUpperCase();
    const [c] = await db.query(`insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days) values ($1,$2,$3,$4,$5,$6,$7) returning code, name, country, currency, invoice_days`,
      [code, String(f.name).trim(), country, country === 'NZ' ? 'NZD' : 'AUD', text(f.contact), text(f.email), f['invoice-days'] ? num(f['invoice-days'], 'invoice-days', { min: 0, max: 120 }) : 20]);
    await log(db, actor, 'add-client', code, c.name);
    return c;
  },

  async 'add-site'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'client', 'name', 'region', 'rate');
    const c = await client(db, f.client);
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    if ((c.country === 'NZ') !== (region === 'NZ')) throw Error(`${c.code} is an ${c.country} client; a ${region} site belongs to a client in that country`);
    const [s] = await db.query(`insert into sites (code, client_id, name, address, region, service, contracted_hours_week, bill_rate_cents, induction_required, instructions)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning code, name, region, service, contracted_hours_week, bill_rate_cents`,
      [String(f.code).toUpperCase(), c.id, String(f.name).trim(), text(f.address), region, oneOf(f.service || 'static', SERVICES, 'service'),
        f.hours ? num(f.hours, 'hours', { min: 0, max: 168 * 20 }) : 0, cents(f.rate, 'rate'), f.induction === undefined ? true : yesNo(f.induction, true), text(f.instructions)]);
    await log(db, actor, 'add-site', s.code, `${s.name} for ${c.code}`);
    return s;
  },

  async 'add-subcontractor'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'name', 'region');
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    if (region === 'NSW' && !text(f.licence)) throw Error('A NSW subcontractor needs --licence (its master licence number, s 38A notices name it)');
    const [s] = await db.query('insert into subcontractors (name, region, master_licence, contact) values ($1,$2,$3,$4) returning name, region, master_licence',
      [String(f.name).trim(), region, text(f.licence), text(f.contact)]);
    await log(db, actor, 'add-subcontractor', s.name, `${region} master licence ${s.master_licence || 'none'}`);
    return s;
  },

  // The client agreed in writing that a subcontractor may staff this site (NSW s 38A(1)(a)).
  async 'client-agreement'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'date');
    const s = await site(db, args[0]);
    const d = date(f.date, 'date');
    if (d > today()) throw Error('--date cannot be in the future: record the agreement once it is signed');
    await db.query('update sites set subcontract_agreed_on = $2 where id = $1', [s.id, d]);
    await log(db, actor, 'client-agreement', s.code, `Client agreed in writing to subcontracted staff on ${d}${f.note ? `: ${f.note}` : ''}`);
    return { site: s.code, subcontract_agreed_on: d };
  },

  // Written notice to the client of the subcontractor's name and master licence (NSW s 38A(1)(b)).
  async notice(db, args, f) {
    const actor = actorOf(f);
    need(f, 'date');
    const s = await site(db, args[0]);
    const d = date(f.date, 'date');
    if (d > today()) throw Error('--date cannot be in the future');
    await db.query('update sites set subcontract_notice_on = $2 where id = $1', [s.id, d]);
    await log(db, actor, 'subcontract-notice', s.code, `Client given written notice of the subcontractor's name and master licence on ${d}${f.note ? `: ${f.note}` : ''}`);
    return { site: s.code, subcontract_notice_on: d };
  },

  async 'add-officer'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name');
    const sub = f.subcontractor ? await subcontractor(db, f.subcontractor) : null;
    const [o] = await db.query(`insert into officers (code, name, phone, email, employment, subcontractor_id, pay_rate_cents, started_on)
      values ($1,$2,$3,$4,$5,$6,$7,$8) returning code, name, employment, pay_rate_cents`,
      [String(f.code).toUpperCase(), String(f.name).trim(), text(f.phone), text(f.email), sub ? 'subcontractor' : 'employee', sub?.id || null,
        f.pay ? cents(f.pay, 'pay') : 0, f.started ? date(f.started, 'started') : today()]);
    await log(db, actor, 'add-officer', o.code, `${o.name}${sub ? ` via ${sub.name}` : ''}`);
    return o;
  },

  async 'officer-status'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'status', 'reason');
    const o = await officer(db, args[0]);
    const status = oneOf(f.status, ['active', 'suspended', 'left'], 'status');
    await db.query('update officers set status = $2 where id = $1', [o.id, status]);
    const affected = status === 'active' ? [] : await db.query(`select ref from shifts where officer_id = $1 and status = 'assigned' order by starts_at`, [o.id]);
    await log(db, actor, 'officer-status', o.code, `${status}: ${f.reason}`);
    return { officer: o.name, status, shifts_to_recover: affected.map((r) => r.ref).join(', ') || 'none' };
  },

  async 'add-licence'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'region', 'number', 'issued');
    const o = await officer(db, args[0]);
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    const kind = region === 'NZ' ? oneOf(f.kind || 'coa', ['coa', 'temporary-coa'], 'kind') : 'security-licence';
    const issued = date(f.issued, 'issued');
    // NZ: s 56 (5 years) and s 60(5) (3 months) set the expiry when the card does not say.
    let expires = f.expires ? date(f.expires, 'expires') : null;
    if (!expires) {
      if (region !== 'NZ') throw Error('--expires is required for an Australian licence: copy it from the card');
      const [r] = await db.query(`select ($1::date + case when $2 = 'coa' then interval '5 years' else interval '3 months' end)::date::text as d`, [issued, kind]);
      expires = r.d;
    }
    const [l] = await db.query(`insert into licences (officer_id, region, kind, classes, number, issued_on, expires_on, training_done_on)
      values ($1,$2,$3,$4,$5,$6,$7,$8) returning region, kind, classes, number, issued_on, expires_on`,
      [o.id, region, kind, text(f.classes) || '', String(f.number).trim(), issued, expires, f.training ? date(f.training, 'training') : null]);
    await log(db, actor, 'add-licence', o.code, `${region} ${kind} ${l.number} to ${l.expires_on}`);
    return { officer: o.name, ...l };
  },

  async training(db, args, f) {
    const actor = actorOf(f);
    need(f, 'date');
    const o = await officer(db, args[0]);
    const d = date(f.date, 'date');
    const rows = await db.query(`update licences set training_done_on = $2 where officer_id = $1 and kind = 'temporary-coa' and expires_on >= current_date returning number`, [o.id, d]);
    if (!rows.length) throw Error(`${o.name} has no current temporary certificate`);
    await log(db, actor, 'training', o.code, `Required training completed ${d}${f.note ? `: ${f.note}` : ''}`);
    return { officer: o.name, training_done_on: d, next: 'Apply to the PSPLA for the full certificate and add it with add-licence once issued' };
  },

  async induct(db, args, f) {
    const actor = actorOf(f);
    const o = await officer(db, args[0]);
    const s = await site(db, args[1]);
    const d = f.date ? date(f.date, 'date') : today();
    if (d > today()) throw Error('--date cannot be in the future');
    await db.query(`insert into inductions (officer_id, site_id, inducted_on, inducted_by) values ($1,$2,$3,$4)
      on conflict (officer_id, site_id) do update set inducted_on = excluded.inducted_on, inducted_by = excluded.inducted_by`, [o.id, s.id, d, f.by ? String(f.by) : actor]);
    await log(db, actor, 'induct', o.code, `Inducted at ${s.code} on ${d}`);
    return { officer: o.name, site: s.code, inducted_on: d };
  },

  async 'add-shift'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'site', 'start', 'hours');
    const s = await site(db, f.site);
    const start = stamp(f.start, 'start');
    const len = num(f.hours, 'hours', { min: 0.5, max: 24 });
    const repeat = f.repeat ? num(f.repeat, 'repeat', { min: 1, max: 62 }) : 1;
    const o = f.officer ? await officer(db, f.officer) : null;
    return tx(db, async () => {
      const made = [];
      for (let i = 0; i < repeat; i++) {
        const [row] = await db.query(`insert into shifts (site_id, starts_at, ends_at, role, note)
          values ($1, $2::timestamp + make_interval(days => $3), $2::timestamp + make_interval(days => $3) + make_interval(mins => $4), $5, $6) returning *`,
          [s.id, start, i, Math.round(len * 60), text(f.role) || 'guard', text(f.note)]);
        if (o) {
          const p = await problemsWith(db, row, o.id, false);
          gate(p, f, row.ref, o.name);
          await db.query(`update shifts set officer_id = $2, status = 'assigned', override_reason = $3 where id = $1`, [row.id, o.id, p.length ? String(f.override) : null]);
        }
        made.push(row.ref);
      }
      await log(db, actor, 'add-shift', s.code, `${made.length} shift(s) from ${start}, ${len}h${o ? ` for ${o.name}` : ', open'}`);
      return db.query(`select ref, site, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours as hours, coalesce(officer, '(open)') as officer, status
        from v_shifts where ref = any($1) order by starts_at`, [made]);
    });
  },

  // Put an officer on a shift. A legal problem always refuses; a house rule refuses unless --override names the reason.
  async fill(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    const o = await officer(db, args[1] ?? f.officer);
    if (!['open', 'assigned'].includes(s.status)) throw Error(`${s.ref} is ${s.status}`);
    if (s.region !== 'NZ' && f.emergency) throw Error('--emergency is the NZ emergency appointment (PSPPI Act 2010 s 61); there is no equivalent in Australia');
    return tx(db, async () => {
      const p = await problemsWith(db, s, o.id, f.emergency === true);
      gate(p, f, s.ref, o.name);
      await db.query(`update shifts set officer_id = $2, status = 'assigned', emergency_cover = $3, override_reason = $4 where id = $1`,
        [s.id, o.id, f.emergency === true, p.length ? String(f.override) : null]);
      await log(db, actor, 'fill', s.ref, `${o.name}${s.officer ? ` replacing ${s.officer}` : ''}${f.emergency ? ' (emergency appointment, certificate applied for)' : ''}${p.length ? `; override: ${f.override} (${p.map((x) => x.problem).join('; ')})` : ''}`);
      return { shift: s.ref, site: s.site, starts: s.starts_at, officer: o.name, overridden: p.map((x) => x.problem).join('; ') || 'none' };
    });
  },

  async unassign(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const s = await shift(db, args[0]);
    if (s.status !== 'assigned') throw Error(`${s.ref} is ${s.status}; only an assigned shift can be opened again`);
    await db.query(`update shifts set officer_id = null, status = 'open', emergency_cover = false, override_reason = null where id = $1`, [s.id]);
    await log(db, actor, 'unassign', s.ref, `${s.officer} taken off: ${f.reason}`);
    return { shift: s.ref, status: 'open', was: s.officer };
  },

  async cancel(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const s = await shift(db, args[0]);
    if (!['open', 'assigned'].includes(s.status)) throw Error(`${s.ref} is ${s.status}`);
    await db.query(`update shifts set status = 'cancelled', cancel_reason = $2 where id = $1`, [s.id, String(f.reason)]);
    await log(db, actor, 'cancel', s.ref, String(f.reason));
    return { shift: s.ref, status: 'cancelled' };
  },

  async 'sign-on'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    if (s.status !== 'assigned') throw Error(`${s.ref} is ${s.status}`);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    if (ms(at) < ms(s.starts_at) - 2 * 3600000) throw Error(`${at} is more than two hours before ${s.ref} starts`);
    if (ms(at) >= ms(s.ends_at)) throw Error(`${at} is after ${s.ref} ends`);
    const laws = (await db.query(`select problem from v_shift_problems where shift_id = $1 and kind <> 'house'`, [s.id])).map((r) => r.problem);
    if (laws.length) throw Error(`${s.ref} cannot start: ${laws.join('; ')}. Fill it with someone who can (cover ${s.ref}).`);
    await db.query(`update shifts set status = 'on-duty', signed_on_at = $2 where id = $1`, [s.id, at]);
    await log(db, actor, 'sign-on', s.ref, `${s.officer} on at ${at}`);
    return { shift: s.ref, officer: s.officer, signed_on_at: at };
  },

  async 'sign-off'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    if (s.status !== 'on-duty') throw Error(`${s.ref} is ${s.status}`);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    if (ms(at) <= ms(s.signed_on_at)) throw Error('--at must be after the sign-on');
    await db.query(`update shifts set status = 'completed', signed_off_at = $2 where id = $1`, [s.id, at]);
    await log(db, actor, 'sign-off', s.ref, `${s.officer} off at ${at}`);
    const [v] = await db.query('select worked_hours from v_shifts where id = $1', [s.id]);
    return { shift: s.ref, officer: s.officer, signed_off_at: at, worked_hours: v.worked_hours };
  },

  async 'no-show'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    if (s.status !== 'assigned') throw Error(`${s.ref} is ${s.status}`);
    return tx(db, async () => {
      await db.query(`update shifts set status = 'no-show' where id = $1`, [s.id]);
      const [cover] = await db.query(`insert into shifts (site_id, starts_at, ends_at, role, note) select site_id, greatest(starts_at, region_now($2)), ends_at, role, 'Cover for no-show on ' || ref from shifts where id = $1 and ends_at > region_now($2) returning ref`, [s.id, s.region]);
      await log(db, actor, 'no-show', s.ref, `${s.officer} did not arrive${f.note ? `: ${f.note}` : ''}${cover ? `; open cover shift ${cover.ref}` : ''}`);
      return { shift: s.ref, officer: s.officer, status: 'no-show', cover_shift: cover?.ref || 'shift already over', next: cover ? `cover ${cover.ref}` : '' };
    });
  },

  async 'add-checkpoint'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'name', 'every');
    const s = await site(db, args[0]);
    const [c] = await db.query('insert into checkpoints (site_id, name, every_minutes) values ($1,$2,$3) returning name, every_minutes', [s.id, String(f.name).trim(), num(f.every, 'every', { min: 10, max: 720 })]);
    await log(db, actor, 'add-checkpoint', s.code, `${c.name} every ${c.every_minutes} minutes`);
    return { site: s.code, ...c };
  },

  async scan(db, args, f) {
    const actor = actorOf(f);
    need(f, 'checkpoint', 'at');
    const s = await shift(db, args[0]);
    const at = stamp(f.at, 'at');
    const cp = choose(await db.query('select * from checkpoints where site_id = $1 order by name', [s.site_id]), f.checkpoint, 'Checkpoint', (r) => [r.name, r.id]);
    if (!s.signed_on_at) throw Error(`${s.ref} has not signed on`);
    const end = s.signed_off_at || s.ends_at;
    if (ms(at) < ms(s.signed_on_at) || ms(at) > ms(end)) throw Error(`--at is outside ${s.ref}'s worked time`);
    await db.query('insert into scans (checkpoint_id, shift_id, scanned_at) values ($1,$2,$3) on conflict do nothing', [cp.id, s.id, at]);
    await log(db, actor, 'scan', s.ref, `${cp.name} at ${at}`);
    return { shift: s.ref, checkpoint: cp.name, scanned_at: at };
  },

  async 'log-incident'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'site', 'at', 'kind', 'summary');
    const s = await site(db, f.site);
    const at = stamp(f.at, 'at');
    if (at > (await siteNow(db, s.region))) throw Error('--at cannot be in the future');
    const [on] = await db.query(`select id, officer_id from shifts where site_id = $1 and starts_at <= $2 and coalesce(signed_off_at, ends_at) >= $2 and officer_id is not null and status <> 'cancelled' order by starts_at limit 1`, [s.id, at]);
    const o = f.officer ? await officer(db, f.officer) : null;
    const [i] = await db.query(`insert into incidents (site_id, shift_id, officer_id, occurred_at, kind, severity, summary, detail, police_event, injury, notifiable)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning ref, kind, severity, summary, notifiable`,
      [s.id, on?.id || null, o?.id || on?.officer_id || null, at, oneOf(f.kind, KINDS, 'kind'), oneOf(f.severity || 'low', SEVERITIES, 'severity'), String(f.summary).trim(),
        text(f.detail), text(f.police), f.injury === true || yesNo(f.injury), f.notifiable === true || yesNo(f.notifiable)]);
    await log(db, actor, 'incident', i.ref, `${i.kind} at ${s.code}: ${i.summary}`);
    const next = [`Tell ${s.client} (notify-client ${i.ref})`];
    if (i.notifiable) next.unshift(`Notify ${s.region === 'NZ' ? 'WorkSafe' : 'the state WHS regulator'} as soon as possible and preserve the site (notify-regulator ${i.ref})`);
    return { ...i, site: s.code, next: next.join('. ') };
  },

  async 'notify-client'(db, args, f) {
    const actor = actorOf(f);
    const i = await incident(db, args[0]);
    const s = await site(db, i.site_id);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    if (ms(at) < ms(i.occurred_at)) throw Error('--at is before the incident');
    await db.query('update incidents set client_notified_at = $2 where id = $1', [i.id, at]);
    await log(db, actor, 'notify-client', i.ref, `Client told at ${at}${f.note ? `: ${f.note}` : ''}`);
    return { incident: i.ref, client_notified_at: at };
  },

  async 'notify-regulator'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reference');
    const i = await incident(db, args[0]);
    if (!i.notifiable) throw Error(`${i.ref} is not marked notifiable`);
    const s = await site(db, i.site_id);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    await db.query('update incidents set regulator_notified_at = $2 where id = $1', [i.id, at]);
    await log(db, actor, 'notify-regulator', i.ref, `Regulator notified at ${at}, reference ${f.reference}`);
    return { incident: i.ref, regulator_notified_at: at, reference: f.reference };
  },

  async 'close-incident'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const i = await incident(db, args[0]);
    if (i.closed_on) throw Error(`${i.ref} closed on ${i.closed_on}`);
    if (i.notifiable && !i.regulator_notified_at) throw Error(`${i.ref} is notifiable and the regulator has not been notified`);
    if (!i.client_notified_at) throw Error(`${i.ref}: tell the client first (notify-client ${i.ref})`);
    await db.query('update incidents set closed_on = current_date, outcome = $2 where id = $1', [i.id, String(f.outcome)]);
    await log(db, actor, 'close-incident', i.ref, String(f.outcome));
    return { incident: i.ref, closed_on: today(), outcome: f.outcome };
  },

  // Raise an invoice from every worked, uninvoiced shift for the client in the period.
  async invoice(db, args, f) {
    const actor = actorOf(f);
    need(f, 'from', 'to');
    const c = await client(db, args[0]);
    const from = date(f.from, 'from');
    const to = date(f.to, 'to');
    if (to < from) throw Error('--to is before --from');
    return tx(db, async () => {
      const lines = await db.query('select * from v_unbilled where client_id = $1 and day between $2 and $3 order by day, site', [c.id, from, to]);
      if (!lines.length) throw Error(`No worked, uninvoiced shifts for ${c.code} between ${from} and ${to}`);
      const gstPct = await setting(db, c.country === 'NZ' ? 'gst_nz_pct' : 'gst_au_pct', c.country === 'NZ' ? 15 : 10);
      const subtotal = lines.reduce((t, l) => t + Number(l.amount_cents), 0);
      const hours = lines.reduce((t, l) => t + Number(l.hours), 0);
      const gst = Math.round((subtotal * gstPct) / 100);
      const [inv] = await db.query(`insert into invoices (client_id, period_from, period_to, currency, hours, subtotal_cents, gst_cents, total_cents, due_on)
        values ($1,$2,$3,$4,$5,$6,$7,$8, current_date + $9::int) returning ref, currency, hours, subtotal_cents, gst_cents, total_cents, due_on`,
        [c.id, from, to, c.currency, hours.toFixed(2), subtotal, gst, subtotal + gst, c.invoice_days]);
      const [{ id }] = await db.query('select id from invoices where ref = $1', [inv.ref]);
      for (const l of lines) await db.query('insert into invoice_lines (invoice_id, shift_id, hours, rate_cents, amount_cents) values ($1,$2,$3,$4,$5)', [id, l.shift_id, l.hours, l.bill_rate_cents, l.amount_cents]);
      await log(db, actor, 'invoice', inv.ref, `${c.code} ${from} to ${to}: ${lines.length} shifts, ${money(inv.total_cents, c.currency)} incl GST`);
      return { ...inv, client: c.code, shifts: lines.length, next: `npm run docs -- invoice, check it, send it from your accounts system, then invoice-sent ${inv.ref}` };
    });
  },

  async 'invoice-sent'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update invoices set sent_on = $2 where id = $1', [i.id, d]);
    await log(db, actor, 'invoice-sent', i.ref, `Sent ${d}`);
    return { invoice: i.ref, sent_on: d };
  },

  async 'invoice-paid'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    if (!i.sent_on) throw Error(`${i.ref} has not been sent`);
    await db.query('update invoices set paid_on = $2 where id = $1', [i.id, d]);
    await log(db, actor, 'invoice-paid', i.ref, `Paid ${d}`);
    return { invoice: i.ref, paid_on: d };
  },

  async set(db, args, f) {
    const actor = actorOf(f);
    const [key, value] = args;
    const known = (await db.query('select key from settings')).map((r) => r.key);
    if (!known.includes(key)) throw Error(`Unknown setting "${key}". Settings: ${known.join(', ')}`);
    num(value, 'value', { min: 0, max: 168 });
    await db.query('update settings set value = $2 where key = $1', [key, String(value)]);
    await log(db, actor, 'set', key, String(value));
    return db.query('select key, value, note from settings order by key');
  },

  async log(db, args, f) {
    const actor = actorOf(f);
    need(f, 'note');
    const ref = String(args[0] ?? '').trim();
    if (!ref) throw Error('Name the site, officer, shift or incident the note is about');
    await log(db, actor, 'note', ref, String(f.note));
    return { ref, note: f.note };
  },
};

function gate(problems, f, ref, who) {
  const law = problems.filter((p) => p.kind !== 'house');
  if (law.length) throw Error(`${who} cannot work ${ref}: ${law.map((p) => `${p.problem} (${p.rule})`).join('; ')}`);
  if (problems.length && !(typeof f.override === 'string' && f.override.trim())) {
    throw Error(`${who} on ${ref} breaks a house rule: ${problems.map((p) => p.problem).join('; ')}. Pick someone else (cover ${ref}) or add --override="<reason>"`);
  }
}

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const drafts = {
  async 'draft-client-report'(db, args, f) {
    const c = await client(db, args[0]);
    const to = f.to ? date(f.to, 'to') : today();
    const from = f.from ? date(f.from, 'from') : new Date(Date.parse(to) - 29 * 86400000).toISOString().slice(0, 10);
    const hours = await db.query(`select site, count(*)::int as shifts, sum(worked_hours)::numeric(8,1) as hours from v_shifts
      where client = $1 and status = 'completed' and starts_at::date between $2 and $3 group by site order by site`, [c.code, from, to]);
    const patrols = await db.query(`select site, sum(expected)::int as expected, sum(scanned)::int as scanned, round(100.0 * sum(least(scanned, expected)) / nullif(sum(expected), 0))::int as pct
      from v_patrols p where site in (select code from sites where client_id = $1) and day between $2 and $3 group by site order by site`, [c.id, from, to]);
    const inc = await db.query(`select ref, site, to_char(occurred_at, 'DD Mon HH24:MI') as at, kind, severity, summary, police_event, standing from v_incidents
      where client = $1 and occurred_at::date between $2 and $3 order by occurred_at`, [c.code, from, to]);
    const missed = await db.query(`select count(*)::int as n from v_shifts where client = $1 and status = 'no-show' and starts_at::date between $2 and $3`, [c.code, from, to]);
    const lines = [`# Service report: ${c.name}`, '', `Period ${from} to ${to}. Prepared [DATE] by [YOUR NAME].`, '', '## Hours delivered', '',
      '| Site | Shifts | Hours |', '|---|---|---|', ...hours.map((h) => `| ${h.site} | ${h.shifts} | ${h.hours} |`), '',
      '## Patrols', '', '| Site | Checkpoint scans due | Done | Completion |', '|---|---|---|---|', ...patrols.map((p) => `| ${p.site} | ${p.expected} | ${p.scanned} | ${p.pct ?? '-'}% |`), '',
      '## Incidents', '', inc.length ? '| Ref | Site | When | Type | Severity | What happened | Police event |\n|---|---|---|---|---|---|---|\n' + inc.map((i) => `| ${i.ref} | ${i.site} | ${i.at} | ${i.kind} | ${i.severity} | ${i.summary} | ${i.police_event || ''} |`).join('\n') : 'No incidents this period.', '',
      `Shifts where the rostered officer did not arrive: ${missed[0].n}. [Say how each was covered.]`, '',
      '## Next period', '', '[What changes on site, what we recommend.]', ''];
    const file = draftFile(`client-report-${c.code}-${to}.md`, lines.join('\n'));
    return { draft: file, client: c.code, from, to, incidents: inc.length, note: 'Draft only. Check every line before it goes to the client.' };
  },

  async 'draft-incident-report'(db, args) {
    const i = await incident(db, args[0]);
    const [v] = await db.query('select * from v_incidents where id = $1', [i.id]);
    const [s] = await db.query('select s.name, s.address, c.name as client, c.contact_name from sites s join clients c on c.id = s.client_id where s.id = $1', [i.site_id]);
    const lines = [`# Incident report ${i.ref}`, '', `To: ${s.contact_name || '[CLIENT CONTACT]'}, ${s.client}`, `Site: ${s.name}, ${s.address || ''}`,
      `When: ${String(i.occurred_at).slice(0, 16)}`, `Type: ${i.kind}, severity ${i.severity}`, `Officer: ${v.officer || '[OFFICER]'}`, `Police event: ${i.police_event || 'none'}`, '',
      '## What happened', '', i.summary, '', i.detail || '[Detail from the officer\'s notes.]', '', '## What we did', '', '[Actions taken on the night.]', '',
      '## What we recommend', '', '[Recommendation, or "No further action".]', ''];
    if (i.notifiable) lines.push(`This was a notifiable event. ${i.regulator_notified_at ? `The regulator was notified at ${String(i.regulator_notified_at).slice(0, 16)}.` : 'The regulator HAS NOT been notified yet: do that first (notify-regulator).'}`, '');
    const file = draftFile(`incident-${i.ref}.md`, lines.join('\n'));
    return { draft: file, incident: i.ref, note: 'Draft only. Nothing is sent from here.' };
  },

  async 'draft-licence-reminder'(db, args) {
    const o = await officer(db, args[0]);
    const [l] = await db.query(`select * from v_licences where officer_id = $1 order by expires_on limit 1`, [o.id]);
    if (!l) throw Error(`${o.name} has no licence on record`);
    const body = l.region === 'NZ'
      ? `${l.kind === 'temporary-coa' ? `Your temporary certificate of approval ${l.number} ends on ${l.expires_on}. A temporary certificate lasts 3 months (PSPPI Act 2010 s 60(5)). ${l.training_done_on ? 'Your training is recorded, so apply for the full certificate now.' : 'Your required training is not recorded yet. Book it this week and send us the result.'}` : `Your certificate of approval ${l.number} expires on ${l.expires_on}. Apply to the PSPLA to renew it before then; a renewal lodged before expiry keeps it in force until it is decided (s 56(3)).`}`
      : `Your ${l.region} security licence ${l.number} expires on ${l.expires_on}. Renew it with the ${l.region} licensing authority before then. We cannot roster you on a ${l.region} site after that date without the renewed licence.`;
    const lines = [`To: ${o.name} <${o.email || '[EMAIL]'}>`, `Subject: Your licence expires ${l.expires_on}`, '', `Hi ${o.name.split(' ')[0]},`, '', body, '',
      'Once you have it, send a photo of the new card and we will update your record.', '', '[YOUR NAME]', ''];
    const file = draftFile(`licence-${o.code}.md`, lines.join('\n'));
    return { draft: file, officer: o.name, expires_on: l.expires_on, note: 'Draft only. Nothing is sent from here.' };
  },

  async 'weekly-review'(db) {
    const att = await reads.attention(db);
    const comp = await reads.compliance(db, [], {});
    const open = await reads['open-shifts'](db, [], { days: '7' });
    const hrs = await reads.hours(db);
    const unb = await reads.unbilled(db);
    const count = (item) => att.filter((r) => r.item === item).length;
    const lines = [`# Monday review, ${today()}`, '',
      `- Rostered against the law: ${count('rostered against the law')} shifts. ${comp.filter((r) => r.kind === 'law').map((r) => `${r.problem} (${r.shifts})`).join('; ') || 'None.'}`,
      `- Open shifts in the next 7 days: ${open.length}${open.length ? ` (${open.map((o) => `${o.ref} ${o.site} ${o.starts}`).join(', ')})` : ''}.`,
      `- Licences: ${count('licence expired')} expired, ${count('licence expires soon')} expiring within 30 days, ${count('temporary certificate ending, no training recorded')} temporary certificates ending without training.`,
      `- Incidents: ${count('regulator not notified')} notifiable not reported, ${count('client not told')} clients not told.`,
      `- Patrols: ${count('missed patrols')} shifts with missed checkpoint scans in the last three days.`,
      `- Hours: ${hrs.filter((h) => Number(h.covered_minus_contract) < 0).map((h) => `${h.site} ${h.covered_minus_contract}h`).join(', ') || 'every site covered to contract'}.`,
      `- Not invoiced: ${unb.map((u) => `${u.site} ${u.hours}h`).join(', ') || 'nothing'}.`, '',
      '## Everything on the attention list', '', '| Item | Ref | Detail |', '|---|---|---|', ...att.map((r) => `| ${r.item} | ${r.ref} | ${r.detail} |`), ''];
    const file = draftFile(`weekly-review-${today()}.md`, lines.join('\n'));
    return { draft: file, attention_items: att.length, law_breaches: count('rostered against the law'), open_shifts: open.length };
  },
};

// ------------------------------------------------------------------ import and export

// Column names a TrackTik export typically uses, with the plain alternatives. --map overrides any of them.
const MAPS = {
  sites: { code: ['Site ID', 'Site Code', 'Code'], name: ['Site Name', 'Site', 'Name'], client: ['Client', 'Client Name', 'Customer'], address: ['Address', 'Site Address'],
    region: ['Region', 'State', 'State/Province', 'Province'], rate: ['Bill Rate', 'Billing Rate', 'Rate'], hours: ['Contracted Hours', 'Weekly Hours'] },
  officers: { code: ['Employee ID', 'Employee Number', 'Code'], name: ['Employee Name', 'Name'], first: ['First Name'], last: ['Last Name'], phone: ['Phone', 'Mobile'],
    email: ['Email'], licence: ['License Number', 'Licence Number', 'License #'], licence_region: ['License Region', 'License State', 'Licence State'],
    licence_expiry: ['License Expiry', 'License Expiration', 'Licence Expiry', 'License Expiration Date'], pay: ['Pay Rate', 'Hourly Rate'] },
  shifts: { id: ['Shift ID', 'ID'], site: ['Site ID', 'Site Code', 'Site', 'Site Name'], officer: ['Employee ID', 'Employee', 'Employee Name'],
    start: ['Start', 'Start Time', 'Shift Start', 'Scheduled Start'], end: ['End', 'End Time', 'Shift End', 'Scheduled End'], role: ['Position', 'Role'] },
};

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!base) throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
  const extra = mapFile ? JSON.parse(readFileSync(path.resolve(mapFile), 'utf8')) : {};
  return (row, field) => pick(row, ...(extra[field] ? [extra[field]] : []), ...(base[field] || []));
}
// "2026-10-21 18:00", "2026-10-21T18:00", "21/10/2026 18:00" -> wall-clock stamp.
function looseStamp(v, label) {
  const s = String(v || '').trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/);
  if (dmy) return stamp(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')} ${dmy[4]}:${dmy[5]}`, label);
  return stamp(s.slice(0, 16), label);
}

async function importTracktik(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'tracktik') throw Error('Usage: import tracktik <file.csv> --kind=sites|officers|shifts');
  if (!file || !existsSync(file)) throw Error(`File not found: ${file}`);
  need(f, 'kind');
  const kind = String(f.kind);
  const get = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const counts = { rows: rows.length, added: 0, skipped: 0 };
  await db.exec('begin');
  try {
    for (const [n, r] of rows.entries()) {
      const at = `row ${n + 2}`;
      try {
        if (kind === 'sites') {
          const ext = `tracktik:${get(r, 'code')}`;
          if ((await db.query('select 1 from sites where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const c = await client(db, f.client || get(r, 'client'));
          const region = oneOf(String(get(r, 'region')).toUpperCase(), REGIONS, `region (${at})`);
          if ((c.country === 'NZ') !== (region === 'NZ')) throw Error(`${c.code} is an ${c.country} client and this site is in ${region}`);
          await db.query(`insert into sites (code, client_id, name, address, region, contracted_hours_week, bill_rate_cents, external_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [String(get(r, 'code')).toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 16), c.id, get(r, 'name'), get(r, 'address') || null, region,
              get(r, 'hours') ? num(get(r, 'hours'), 'hours') : 0, f.rate ? cents(f.rate, 'rate') : cents(get(r, 'rate'), `rate (${at})`), ext]);
        } else if (kind === 'officers') {
          const ext = `tracktik:${get(r, 'code')}`;
          if ((await db.query('select 1 from officers where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const name = get(r, 'name') || `${get(r, 'first')} ${get(r, 'last')}`.trim();
          if (!name) throw Error('no employee name');
          const [o] = await db.query(`insert into officers (code, name, phone, email, pay_rate_cents, external_id) values ($1,$2,$3,$4,$5,$6) returning id`,
            [String(get(r, 'code')).toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 12), name, get(r, 'phone') || null, get(r, 'email') || null, get(r, 'pay') ? cents(get(r, 'pay'), 'pay') : 0, ext]);
          if (get(r, 'licence')) {
            const region = oneOf(String(get(r, 'licence_region') || f.region || '').toUpperCase(), REGIONS, `licence region (${at}; or pass --region)`);
            const expires = date(get(r, 'licence_expiry'), `licence expiry (${at})`);
            const kindL = region === 'NZ' ? 'coa' : 'security-licence';
            const [iss] = await db.query(`select greatest(($1::date - interval '5 years' + interval '1 day')::date, current_date - 3650)::text as d`, [expires]);
            await db.query(`insert into licences (officer_id, region, kind, number, issued_on, expires_on) values ($1,$2,$3,$4,$5,$6)`, [o.id, region, kindL, get(r, 'licence'), iss.d, expires]);
          }
        } else if (kind === 'shifts') {
          const ext = `tracktik:${get(r, 'id')}`;
          if (!get(r, 'id')) throw Error('no shift ID');
          if ((await db.query('select 1 from shifts where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const sRow = await db.query('select id from sites where external_id = $1 or code = upper($2) or lower(name) = lower($2)', [`tracktik:${get(r, 'site')}`, get(r, 'site')]);
          if (sRow.length !== 1) throw Error(`site "${get(r, 'site')}" not found (import sites first)`);
          const oName = get(r, 'officer');
          const oRow = oName ? await db.query('select id from officers where external_id = $1 or code = upper($2) or lower(name) = lower($2)', [`tracktik:${oName}`, oName]) : [];
          if (oName && oRow.length !== 1) throw Error(`employee "${oName}" not found (import officers first)`);
          const start = looseStamp(get(r, 'start'), `start (${at})`);
          const end = looseStamp(get(r, 'end'), `end (${at})`);
          await db.query(`insert into shifts (site_id, officer_id, starts_at, ends_at, role, status, external_id) values ($1,$2,$3,$4,$5,$6,$7)`,
            [sRow[0].id, oRow[0]?.id || null, start, end, get(r, 'role') || 'guard', oRow[0] ? 'assigned' : 'open', ext]);
        } else throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
        counts.added++;
      } catch (e) {
        throw Error(`${at}: ${e.message}. Nothing was imported.`);
      }
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `tracktik-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'clients', 'subcontractors', 'sites', 'officers', 'licences', 'inductions', 'shifts', 'checkpoints', 'scans', 'incidents', 'invoices', 'invoice_lines', 'activity'];
  const out = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `guarding-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importTracktik, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
