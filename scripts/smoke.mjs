#!/usr/bin/env node
// npm test: a temporary database, the demo firm, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, QUESTIONS, cents, stamp, date } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'guarding-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
// A wall-clock time at a site, n days from the site's today, at hh:mm.
const at = async (region, days, hhmm) => (await one(`select (region_now($1)::date + $2::int)::text as d`, [region, days])).d + ' ' + hhmm;

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  const shiftsOnce = (await one('select count(*)::int as n from shifts')).n;
  await seed(db);
  eq((await one('select count(*)::int as n from shifts')).n, shiftsOnce, 'seed is idempotent (shifts)');
  eq((await one('select count(*)::int as n from officers')).n, 12, 'seed is idempotent (officers)');
  eq((await one('select count(*)::int as n from activity')).n, 3, 'seed activity written once');
  ok(shiftsOnce > 80, 'a fortnight of shifts');

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { cover: ['S-1050'], check: ['S-1052'], officer: ['Ben'], site: ['PDH'], incident: ['INC-503'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  eq(ins.length, 10);
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');

  // Parsing is strict.
  eq(cents('46.50', 'x'), 4650);
  eq(cents('$1,200', 'x'), 120000);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  assert.throws(() => cents('0', 'x'), /more than zero/); checks++;
  eq(stamp('2026-10-21 6:05', 'x'), '2026-10-21 06:05:00');
  eq(stamp('2026-10-21T18:00', 'x'), '2026-10-21 18:00:00');
  assert.throws(() => stamp('2026-10-21 25:00', 'x'), /impossible/); checks++;
  assert.throws(() => stamp('21/10/2026', 'x'), /date and time/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;

  // Time zones: each site's "now" is its own clock.
  const zones = await one(`select region_zone('NZ') as nz, region_zone('NSW') as nsw, region_zone('WA') as wa, region_zone('XX') as bad,
    extract(epoch from (region_now('NZ') - region_now('WA'))) / 3600 as nz_ahead_of_wa`);
  eq(zones.nz, 'Pacific/Auckland'); eq(zones.nsw, 'Australia/Sydney'); eq(zones.wa, 'Australia/Perth'); eq(zones.bad, null);
  ok([4, 5].includes(Math.round(Number(zones.nz_ahead_of_wa))), 'Auckland is 4 or 5 hours ahead of Perth');

  // The demo firm says what it should.
  const attention = await call('attention');
  const has = (item, ref) => attention.some((r) => r.item === item && (!ref || r.ref === ref));
  ok(has('licence expired', 'O-203'), 'expired NSW licence still active');
  ok(has('licence expires soon', 'O-102'), 'certificate lapsing in 4 days');
  ok(has('temporary certificate ending, no training recorded', 'O-103'), 'temporary certificate ending without training');
  ok(has('regulator not notified', 'INC-503'), 'notifiable event not reported');
  ok(has('client not told', 'INC-502'), 'client never told');
  ok(has('open shift'), 'open shifts');
  ok(has('rostered against the law'), 'unlawful roster');
  ok(has('house rule broken'), 'house rule broken');
  ok(has('missed patrols'), 'missed patrols');
  ok(has('invoice overdue', 'INV-1998'), 'overdue invoice');
  ok(attention.every((r) => r.item && r.detail), 'every attention row says what and why');

  const problems = await db.query('select ref, kind, problem, rule from v_shift_problems');
  const tomShifts = await db.query(`select s.ref, s.ends_at::date::text as ends from v_shifts s where officer_code = 'O-203' and status <> 'cancelled'`);
  for (const t of tomShifts) {
    const flagged = problems.some((p) => p.ref === t.ref && p.problem === 'no current licence');
    eq(flagged, t.ends > (await one(`select (current_date - 3)::text as d`)).d, `${t.ref}: licence rule follows the expiry date`);
  }
  ok(problems.some((p) => p.problem.startsWith('subcontracted without') && /38A\(1\)\(a\)/.test(p.rule)), 'NSW s 38A agreement rule cites its section');
  ok(!problems.some((p) => p.problem.startsWith('no written notice')), 'notice already given for the seeded subcontracted shifts');
  ok(problems.some((p) => p.problem === 'not inducted at this site'), 'induction rule');
  ok(problems.some((p) => p.problem.startsWith('under 10 hours rest')), 'rest rule');
  ok(problems.every((p) => p.rule), 'every problem cites a rule');
  const benLate = await db.query(`select p.ref from v_shift_problems p join v_shifts s on s.id = p.shift_id where s.officer_code = 'O-102' and p.problem = 'no current licence'`);
  ok(benLate.length >= 1, 'shifts after a certificate lapses are flagged');

  const comp = await call('compliance');
  ok(comp.some((r) => r.problem === 'notifiable event not reported to the regulator'), 'compliance: notifiable');
  ok(comp.some((r) => r.kind === 'law' && r.shifts > 0), 'compliance: law rows');

  // Licences: NZ expiry defaults from the Act; Australia needs the card's date; limits enforced.
  const lic = await call('add-licence', ['Rawiri'], { ...A, region: 'NZ', kind: 'temporary-coa', number: 'TCOA-TEST-1', issued: '2026-01-31' });
  eq(lic.expires_on, '2026-04-30', 'temporary certificate: 3 months (s 60(5))');
  const lic5 = await call('add-licence', ['Rawiri'], { ...A, region: 'NZ', number: 'COA-TEST-2', issued: '2024-02-29' });
  eq(lic5.expires_on, '2029-02-28', 'certificate of approval: 5 years (s 56)');
  await fails(async () => call('add-licence', ['Lucy'], { ...A, region: 'NSW', number: 'X1', issued: '2026-01-01' }), /--expires is required/);
  await fails(async () => call('add-licence', ['Rawiri'], { ...A, region: 'NZ', kind: 'temporary-coa', number: 'TCOA-TEST-3', issued: '2026-01-01', expires: '2026-06-01' }), /check|violates/i, 'temporary certificate cannot run past 3 months');
  await fails(async () => call('add-licence', ['Rawiri'], { ...A, region: 'NZ', kind: 'security-licence', number: 'X2', issued: '2026-01-01' }), /--kind/);
  await fails(async () => call('add-licence', ['Rawiri'], { region: 'NZ', number: 'X3', issued: '2026-01-01' }), /--actor/);

  // Name resolution.
  await fails(async () => call('officer', ['zzz']), /not found/);
  await fails(async () => call('officer', ['a']), /ambiguous/);
  eq((await call('officer', ['o-104'])).officer.name, 'Mere Walker', 'codes match case-insensitively');

  // cover: who can legally take a shift, best first.
  const cov = await call('cover', ['S-1050']);
  eq(cov[0].verdict, 'can cover', 'someone can cover');
  ok(cov.filter((c) => c.verdict === 'cannot').every((c) => /licence|double booked/.test(c.why)), 'cannot = a legal or clash reason');
  ok(cov.every((c, i) => i === 0 || ['can cover', 'house rule', 'cannot'].indexOf(cov[i - 1].verdict) <= ['can cover', 'house rule', 'cannot'].indexOf(c.verdict)), 'sorted by verdict');
  eq((await one(`select officer_code from v_shifts where ref = 'S-1050'`)).officer_code, 'O-106', 'cover changes nothing');

  // fill: the law refuses, house rules need a reason, the log says why.
  const nzOpen = (await one(`select ref from v_shifts where status = 'open' and site = 'KPM-MALL' order by starts_at limit 1`)).ref;
  await fails(async () => call('fill', [nzOpen, 'Lucy'], A), /no current licence/, 'an NSW officer cannot work an NZ site');
  await fails(async () => call('fill', [nzOpen, 'Mere'], A), /house rule.*not inducted/, 'house rule refuses without --override');
  const filled = await call('fill', [nzOpen, 'Mere'], { ...A, override: 'Walked the site with the supervisor on arrival' });
  ok(/not inducted/.test(filled.overridden), 'override recorded');
  eq((await one('select override_reason from shifts where ref = $1', [nzOpen])).override_reason, 'Walked the site with the supervisor on arrival');
  ok((await one(`select detail from activity where action = 'fill' and ref = $1`, [nzOpen])).detail.includes('override'), 'activity shows the override');
  const vicOpen = (await one(`select ref from v_shifts where status = 'open' and site = 'SBA-LOBBY' order by starts_at limit 1`)).ref;
  await fails(async () => call('fill', [vicOpen, 'Grace'], { ...A, emergency: true }), /no equivalent in Australia/);

  // NZ emergency appointment (s 61): no certificate needed for up to 2 weeks, then the law refuses.
  await call('add-officer', [], { ...A, code: 'O-107', name: 'Pita Rangi', pay: '27.00' });
  await call('induct', ['O-107', 'TLP-GATE'], A);
  const e1 = await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 20, '08:00'), hours: '8', role: 'day relief' });
  await fails(async () => call('fill', [e1[0].ref, 'O-107'], A), /no current licence/, 'no certificate, no shift');
  await call('fill', [e1[0].ref, 'O-107'], { ...A, emergency: true });
  const e2 = await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 35, '08:00'), hours: '8' });
  await fails(async () => call('fill', [e2[0].ref, 'O-107'], { ...A, emergency: true }), /emergency cover past 2 weeks/, 's 61 two-week limit');

  // NSW s 38A: a subcontracted officer needs the client's written agreement and the notice.
  const nswShift = await call('add-shift', [], { ...A, site: 'PDH-HALL', start: await at('NSW', 30, '10:00'), hours: '8', role: 'visitor escort' });
  await fails(async () => call('fill', [nswShift[0].ref, 'Daniel'], A), /written agreement/, 'no client agreement');
  await fails(async () => call('client-agreement', ['PDH-HALL'], { ...A, date: '2999-01-01' }), /future/);
  const todayD = (await one('select current_date::text as d')).d;
  await db.query(`update sites set subcontract_notice_on = null where code = 'PDH-HALL'`);
  await call('client-agreement', ['PDH-HALL'], { ...A, date: todayD });
  await fails(async () => call('fill', [nswShift[0].ref, 'Daniel'], A), /no written notice/, 'agreement alone is not enough');
  eq((await call('notice', ['PDH-HALL'], { ...A, date: todayD })).subcontract_notice_on, todayD);
  await call('fill', [nswShift[0].ref, 'Daniel'], A);
  eq((await one(`select officer_code from v_shifts where ref = $1`, [nswShift[0].ref])).officer_code, 'O-202', 'filled once both are in place');
  await fails(async () => call('add-subcontractor', [], { ...A, name: 'No Licence Pty Ltd', region: 'NSW' }), /master licence/);
  ok(await call('add-subcontractor', [], { ...A, name: 'Harbour Patrols Ltd', region: 'NZ' }), 'NZ subcontractor without a NSW licence');

  // Rest and week limits come from settings.
  const restA = await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 40, '06:00'), hours: '8', officer: 'Rawiri' });
  eq(restA[0].officer, 'Rawiri Hohaia');
  await fails(async () => call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 40, '20:00'), hours: '8', officer: 'Rawiri' }), /rest/, 'six hours rest is short');
  await call('set', ['min_rest_hours', '6'], A);
  ok(await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 40, '20:00'), hours: '8', officer: 'Rawiri' }), 'allowed once the house rule changes');
  await call('set', ['min_rest_hours', '10'], A);
  await fails(async () => call('set', ['nonsense', '1'], A), /Unknown setting/);
  await fails(async () => call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 41, '20:00'), hours: '13', officer: 'Mere' }), /over 12 hours/);
  await fails(async () => call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 41, '20:00'), hours: '25' }), /hours/);
  const rep = await call('add-shift', [], { ...A, site: 'SBA-LOBBY', start: await at('VIC', 50, '07:00'), hours: '12', repeat: '5' });
  eq(rep.length, 5, 'repeat makes five shifts');
  ok(rep.every((r) => r.status === 'open'), 'repeated shifts start open');
  await fails(async () => call('add-shift', [], { ...A, site: 'SBA-LOBBY', start: await at('VIC', 60, '07:00'), hours: '12', repeat: '3', officer: 'Lucy' }), /licence/);
  eq((await one(`select count(*)::int as n from shifts s join sites si on si.id = s.site_id where si.code = 'SBA-LOBBY' and s.starts_at::date = (region_now('VIC')::date + 60)`)).n, 0, 'a refused repeat leaves nothing behind');

  // A shift's day: sign-on refuses an unlawful shift, sign-off, scans, no-show and cover.
  const live = await call('add-shift', [], { ...A, site: 'KPM-MALL', start: await at('NZ', 9, '09:00'), hours: '6', officer: 'Aroha', role: 'day relief' });
  const ref = live[0].ref;
  await fails(async () => call('sign-off', [ref], A), /assigned/);
  await fails(async () => call('sign-on', [ref], { ...A, at: await at('NZ', 9, '05:00') }), /two hours before/);
  await call('sign-on', [ref], { ...A, at: await at('NZ', 9, '09:04') });
  await call('scan', [ref], { ...A, checkpoint: 'loading', at: await at('NZ', 9, '10:00') });
  await fails(async () => call('scan', [ref], { ...A, checkpoint: 'loading', at: await at('NZ', 9, '20:00') }), /outside/);
  await fails(async () => call('scan', [ref], { ...A, checkpoint: 'nowhere', at: await at('NZ', 9, '10:30') }), /not found/);
  await fails(async () => call('sign-off', [ref], { ...A, at: await at('NZ', 9, '09:00') }), /after the sign-on/);
  const off = await call('sign-off', [ref], { ...A, at: await at('NZ', 9, '15:04') });
  eq(Number(off.worked_hours), 6, 'worked hours from sign-on to sign-off');
  const pat = await db.query('select * from v_patrols where ref = $1', [ref]);
  eq(pat.find((p) => p.checkpoint === 'Loading dock').expected, 6, 'six hourly scans due');
  eq(pat.find((p) => p.checkpoint === 'Loading dock').scanned, 1, 'one done');
  const tomRef = (await one(`select ref from v_shifts where officer_code = 'O-203' and status = 'assigned' order by starts_at limit 1`)).ref;
  await fails(async () => call('sign-on', [tomRef], { ...A, at: (await one('select starts_at::text as s from shifts where ref = $1', [tomRef])).s.slice(0, 16) }), /cannot start: no current licence/);

  const ns = await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 25, '18:00'), hours: '12', officer: 'Mere' });
  const nsr = await call('no-show', [ns[0].ref], { ...A, note: 'No answer on phone' });
  eq(nsr.status, 'no-show');
  ok(/^S-/.test(nsr.cover_shift), 'a no-show opens a cover shift');
  eq((await one('select status from shifts where ref = $1', [nsr.cover_shift])).status, 'open');
  await fails(async () => call('unassign', [ns[0].ref], { ...A, reason: 'x' }), /only an assigned/);
  const un = await call('add-shift', [], { ...A, site: 'TLP-GATE', start: await at('NZ', 27, '18:00'), hours: '12', officer: 'Mere' });
  await fails(async () => call('unassign', [un[0].ref], A), /--reason/);
  eq((await call('unassign', [un[0].ref], { ...A, reason: 'Annual leave' })).status, 'open');
  eq((await call('cancel', [un[0].ref], { ...A, reason: 'Client closed the site for the day' })).status, 'cancelled');
  await fails(async () => call('cancel', [un[0].ref], { ...A, reason: 'again' }), /cancelled/);

  // The no sign-on alarm: an assigned shift that started over 15 minutes ago.
  await db.query(`insert into shifts (site_id, officer_id, starts_at, ends_at, status, external_id)
    select si.id, o.id, region_now('VIC') - interval '40 minutes', region_now('VIC') + interval '3 hours', 'assigned', 'test:late'
    from sites si, officers o where si.code = 'SBA-LOBBY' and o.code = 'O-301'`);
  ok((await call('attention')).some((r) => r.item === 'no sign-on'), 'no sign-on alarm');

  // Officers: status and training.
  const sus = await call('officer-status', ['Tom'], { ...A, status: 'suspended', reason: 'Licence expired' });
  ok(sus.shifts_to_recover !== 'none', 'suspending lists the shifts to recover');
  ok((await db.query(`select problem from v_shift_problems p join v_shifts s on s.id = p.shift_id where s.officer_code = 'O-203' and s.status = 'assigned'`)).some((p) => p.problem === 'officer is suspended'), 'suspended officer flagged');
  await fails(async () => call('training', ['Mere'], { ...A, date: '2026-10-01' }), /no current temporary/);
  ok(await call('training', ['Sione'], { ...A, date: (await one('select current_date::text as d')).d }), 'training recorded');
  ok(!(await call('attention')).some((r) => r.item === 'temporary certificate ending, no training recorded'), 'training clears the warning');
  await fails(async () => call('induct', ['Mere', 'KPM'], { ...A, date: '2999-01-01' }), /future/);

  // Incidents.
  await fails(async () => call('log-incident', [], { ...A, site: 'KPM', at: await at('NZ', 3, '10:00'), kind: 'theft', summary: 'x' }), /future/);
  await fails(async () => call('log-incident', [], { ...A, site: 'KPM', at: await at('NZ', -1, '10:00'), kind: 'burglary', summary: 'x' }), /--kind/);
  const inc = await call('log-incident', [], { ...A, site: 'KPM', at: await at('NZ', -1, '11:30'), kind: 'medical', severity: 'high', summary: 'Shopper collapsed near the food court', notifiable: true, injury: true });
  ok(/WorkSafe/.test(inc.next), 'NZ notifiable points at WorkSafe');
  ok((await one('select officer_id from incidents where ref = $1', [inc.ref])).officer_id, 'officer on shift attached');
  await fails(async () => call('close-incident', [inc.ref], { ...A, outcome: 'done' }), /regulator/);
  await fails(async () => call('notify-regulator', [inc.ref], A), /--reference/);
  await call('notify-regulator', [inc.ref], { ...A, reference: 'WS-TEST-1' });
  await fails(async () => call('close-incident', [inc.ref], { ...A, outcome: 'done' }), /tell the client/);
  await fails(async () => call('notify-client', [inc.ref], { ...A, at: await at('NZ', -2, '10:00') }), /before the incident/);
  await call('notify-client', [inc.ref], A);
  eq((await call('close-incident', [inc.ref], { ...A, outcome: 'Ambulance attended, shopper discharged' })).incident, inc.ref);
  await fails(async () => call('close-incident', [inc.ref], { ...A, outcome: 'again' }), /closed/);
  await fails(async () => call('notify-regulator', ['INC-501'], { ...A, reference: 'x' }), /not marked notifiable/);
  eq((await call('incidents', [], { open: true })).some((i) => i.ref === inc.ref), false, '--open hides closed');

  // Invoicing: every worked shift billed once, GST by country.
  const unb = await call('unbilled');
  const kpm = unb.filter((u) => u.client === 'KPM').reduce((t, u) => t + Number(u.amount_cents), 0);
  ok(kpm > 0, 'KPM has unbilled work');
  const inv = await call('invoice', ['KPM'], { ...A, from: '2000-01-01', to: '2999-12-31' });
  eq(Number(inv.subtotal_cents), kpm, 'invoice subtotal equals unbilled amount');
  eq(Number(inv.gst_cents), Math.round(kpm * 0.15), 'NZ GST 15%');
  eq(Number(inv.total_cents), Number(inv.subtotal_cents) + Number(inv.gst_cents));
  await fails(async () => call('invoice', ['KPM'], { ...A, from: '2000-01-01', to: '2999-12-31' }), /No worked, uninvoiced/, 'never billed twice');
  const invAu = await call('invoice', ['SBA'], { ...A, from: '2000-01-01', to: '2999-12-31' });
  eq(Number(invAu.gst_cents), Math.round(Number(invAu.subtotal_cents) * 0.10), 'AU GST 10%');
  eq(invAu.currency, 'AUD');
  await fails(async () => call('invoice-paid', [inv.ref], A), /not been sent/);
  await call('invoice-sent', [inv.ref], A);
  await call('invoice-paid', [inv.ref], A);
  eq((await call('invoices')).find((i) => i.ref === inv.ref).standing, 'paid');
  await fails(async () => call('invoice', ['KPM'], { ...A, from: '2026-02-01', to: '2026-01-01' }), /before/);
  await fails(async () => db.query(`insert into invoice_lines (invoice_id, shift_id, hours, rate_cents, amount_cents) select invoice_id, shift_id, 1, 1, 1 from invoice_lines limit 1`), /duplicate|unique/i);
  checks++;

  // Clients and sites.
  await fails(async () => call('add-client', [], { ...A, code: 'NEW', name: 'New', country: 'UK' }), /--country/);
  const nc = await call('add-client', [], { ...A, code: 'QCC', name: 'Queen City Carparks', country: 'AU' });
  eq(nc.currency, 'AUD', 'currency follows the country');
  await fails(async () => call('add-site', [], { ...A, code: 'QCC-1', client: 'QCC', name: 'Level 1', region: 'NZ', rate: '50' }), /AU client/);
  const ns2 = await call('add-site', [], { ...A, code: 'QCC-1', client: 'QCC', name: 'Adelaide Street car park', region: 'QLD', rate: '52.50', hours: '40', service: 'mobile-patrol' });
  eq(ns2.bill_rate_cents, 5250);
  await call('add-checkpoint', ['QCC-1'], { ...A, name: 'Level 4 stairwell', every: '45' });
  await fails(async () => call('add-checkpoint', ['QCC-1'], { ...A, name: 'Fast', every: '1' }), /--every/);

  // Drafts land in drafts/ and send nothing.
  for (const [cmd, a] of [['draft-client-report', ['KPM']], ['draft-incident-report', ['INC-503']], ['draft-licence-reminder', ['Ben']], ['draft-licence-reminder', ['Sione']], ['weekly-review', []]]) {
    const r = await call(cmd, a, {});
    ok(r.draft && existsSync(path.join(process.env.OUTPUT_DIR, r.draft)), `${cmd} wrote ${r.draft}`);
  }
  const ir = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'incident-INC-503.md'), 'utf8');
  ok(/HAS NOT been notified/.test(ir), 'incident draft warns when the regulator is not notified');
  const lr = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'licence-O-102.md'), 'utf8');
  ok(/s 56\(3\)/.test(lr), 'NZ reminder cites the renewal rule');
  const cr = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', `client-report-KPM-${new Date().toISOString().slice(0, 10)}.md`), 'utf8');
  ok(/INC-502/.test(cr) && /Hours delivered/.test(cr), 'client report has hours and incidents');

  // Import from TrackTik exports: dry run, atomic, repeat rows skipped.
  const ex = path.join(REPO_ROOT, 'examples', 'tracktik');
  const dry = await call('import', ['tracktik', path.join(ex, 'sites.csv')], { ...A, kind: 'sites', client: 'TLP', 'dry-run': true });
  ok(dry.dry_run && dry.added > 0, 'dry run counts');
  eq((await one(`select count(*)::int as n from sites where external_id like 'tracktik:%'`)).n, 0, 'dry run keeps nothing');
  const si = await call('import', ['tracktik', path.join(ex, 'sites.csv')], { ...A, kind: 'sites', client: 'TLP' });
  const of = await call('import', ['tracktik', path.join(ex, 'employees.csv')], { ...A, kind: 'officers', region: 'NZ' });
  const sh = await call('import', ['tracktik', path.join(ex, 'shifts.csv')], { ...A, kind: 'shifts' });
  ok(si.added > 0 && of.added > 0 && sh.added > 0, 'sites, officers and shifts imported');
  eq((await call('import', ['tracktik', path.join(ex, 'shifts.csv')], { ...A, kind: 'shifts' })).skipped, sh.added, 'a second import skips repeats');
  ok((await one(`select count(*)::int as n from licences l join officers o on o.id = l.officer_id where o.external_id like 'tracktik:%'`)).n > 0, 'licences come across');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Shift ID,Site,Employee,Start,End\nX1,TT-NORTH,,2026-11-01 08:00,2026-11-01 16:00\nX2,NOWHERE,,2026-11-01 08:00,2026-11-01 16:00\n');
  const before = (await one('select count(*)::int as n from shifts')).n;
  await fails(async () => call('import', ['tracktik', bad], { ...A, kind: 'shifts' }), /row 3: site "NOWHERE" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from shifts')).n, before, 'a bad row stops the whole file');
  await fails(async () => call('import', ['tracktik', bad], { ...A, kind: 'payroll' }), /--kind/);

  // Export, activity, and the log cannot be rewritten.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.shifts > 0, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 20, 'activity log fills');
  await fails(async () => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(async () => db.query('delete from activity'), /append-only/);
  await fails(async () => call('log', [], { ...A, note: 'x' }), /Name the/);
  ok(await call('log', ['TLP-GATE'], { ...A, note: 'Gate code changed' }), 'notes');

  // Database guards beyond the CLI.
  await fails(async () => db.query(`update shifts set ends_at = starts_at where ref = 'S-1001'`), /check|violates/i);
  await fails(async () => db.query(`insert into licences (officer_id, region, kind, number, issued_on, expires_on) select id, 'NSW', 'coa', 'Z', current_date, current_date + 10 from officers limit 1`), /check|violates/i);
  await fails(async () => db.query(`insert into clients (code, name, country, currency) values ('ZZ', 'Z', 'NZ', 'AUD')`), /check|violates/i);
  await fails(async () => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/guarding.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('cover'), 'help lists commands');
  const j = cli(['licences', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('regulator not notified'), 'human output');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = readFileSync(path.join(process.env.OUTPUT_DIR, 'views', 'week.html'), 'utf8');
  ok(!page.includes('TODO') && page.includes('Needs attention'), 'week view rendered');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'documents', 'compliance'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
