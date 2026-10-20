<h1 align="center">Guard Operations for Claude Code</h1>

<p align="center">
  <strong>The open-source guard management system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your TrackTik data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=tracktik">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/tracktik?utm_source=github&utm_medium=readme&utm_campaign=tracktik">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#bring-your-tracktik-data">Instead of TrackTik</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Guard Operations for Claude Code does the job you pay TrackTik for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the TrackTik dashboard cannot.

TrackTik publishes no price. Its pricing page says a quote is "built around your site count and the modules you run": tours and reporting to start, with billing, payroll, business intelligence and visitor management as add-ons ([trackforce.com/pricing](https://www.trackforce.com/pricing/), checked 20 October 2026). Every site you win adds to the bill. Here the database is yours, and a new site costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=tracktik).

It covers a guarding business in New Zealand or Australia, from 10 officers to a few hundred: clients and sites, officers, their certificates and licences, the roster, patrol checkpoints, incidents, and invoices for the hours worked. Every shift is checked before anyone starts: a current certificate of approval in New Zealand (Private Security Personnel and Private Investigators Act 2010) or a state licence in Australia, site induction, rest between shifts, and in New South Wales the client's written agreement and notice before a subcontractor works their site (Security Industry Act 1997 s 38A).

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/guard-operations-for-claude-code.git
cd guard-operations-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/cover S-1050`, `/compliance` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Open shifts, shifts rostered against the law, expired and expiring licences, temporary certificates ending without training, no sign-on, missed patrols, incidents the regulator or client has not heard about, sites short of contract, overdue invoices |
| `/cover` | Who can take a shift: every officer checked against licence, induction, subcontracting, rest, shift length and weekly hours, best first. Changes nothing |
| `/fill` | Put an officer on a shift. The law refuses outright; a house rule needs a reason, which is logged |
| `/roster` | The next 7 days, every shift with its officer and anything wrong with it |
| `/compliance` | The roster and incidents checked against the rules in [docs/compliance.md](docs/compliance.md), law first, with sources |
| `/licences` | Every certificate and licence, soonest to expire first, with the next rostered shift |
| `/patrols` | Checkpoint scans due against scans done, by site and checkpoint, with who missed them |
| `/log-incident` | Log an incident; a notifiable event points straight at WorkSafe or the state regulator |
| `/hours` | Each site this week: contracted, rostered, open and worked hours |
| `/invoice` | Raise an invoice from worked, uninvoiced shifts at the site's rate, GST by country, never twice |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/draft-client-report` | A client's service report: hours, patrol completion, incidents, shifts not covered |
| `/draft-incident-report` | The incident report for the client, with a warning if the regulator has not been told |
| `/draft-licence-reminder` | A reminder to an officer whose licence is running out, with the rule that applies |
| `/insights` | The ten questions below |

The working commands: `/add-shift`, `/unassign`, `/cancel`, `/sign-on`, `/sign-off`, `/no-show`, `/scan`, `/add-checkpoint`, `/add-licence`, `/training`, `/induct`, `/add-officer`, `/officer-status`, `/add-client`, `/add-site`, `/add-subcontractor`, `/client-agreement`, `/notice`, `/notify-client`, `/notify-regulator`, `/close-incident`, `/invoice-sent`, `/invoice-paid`, `/set`, `/log`. The reads: `/open-shifts`, `/check`, `/officers`, `/officer`, `/workload`, `/clients`, `/sites`, `/site`, `/subcontractors`, `/incidents`, `/incident`, `/unbilled`, `/invoices`, `/activity`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 60 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or code works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- `/fill`, `/add-shift` with an officer, and `/sign-on` refuse a shift the law does not allow: no certificate of approval or state licence current for the whole shift, a New Zealand emergency appointment past two weeks (s 61), or a subcontracted officer on a New South Wales site without the client's written agreement or the written notice of the subcontractor's name and master licence (s 38A).
- House rules (site induction, 10 hours rest, 12-hour shifts, 60 hours a week, all changeable with `/set`) refuse unless `--override` gives a reason. The reason goes in the activity log.
- `/add-licence` sets a New Zealand expiry from the Act when the card does not say: 5 years for a certificate (s 56), 3 months for a temporary one (s 60(5)). The database refuses a temporary certificate longer than 3 months.
- `/close-incident` refuses until the client has been told, and for a notifiable event, until the regulator has been notified.
- `/invoice` bills each worked shift once, at the site's rate, with 15% GST in New Zealand and 10% in Australia.
- `/no-show` opens a cover shift for the time left. `/officer-status` lists the shifts that need someone else.

The software records and checks; the operator decides. It is not legal advice, and it sends nothing.

## Bring your TrackTik data

Export your sites, employees and scheduled shifts from TrackTik reports as comma-separated files, then import them in that order, dry run first:

```bash
node scripts/guarding.mjs import tracktik sites.csv --kind=sites --client=TLP --actor="Your name" --dry-run
node scripts/guarding.mjs import tracktik employees.csv --kind=officers --region=NZ --actor="Your name" --dry-run
node scripts/guarding.mjs import tracktik shifts.csv --kind=shifts --actor="Your name" --dry-run
```

The [switching guide](docs/replace-tracktik.md) covers the headings it reads, `--map` for reports with other headings, what comes across and what does not. Imports are atomic: repeat rows are skipped and one bad row stops the whole file.

## Ten questions answered from your records

`/insights` runs all ten today.

1. Which sites earn the least per hour after officer pay, over the last 28 days?
2. Which sites are rostered below their contracted hours this week, and by how much?
3. Which officers complete the fewest checkpoint scans, over the last 14 days?
4. Which officers have a licence that runs out before their last rostered shift?
5. How much worked time is not invoiced yet, by client?
6. Who signs on late, and by how many minutes on average?
7. Which sites have the most incidents per 100 hours worked?
8. How many hours did subcontractors work, by site, and what share of the site is that?
9. Which officers are within 12 hours of the weekly limit this week?
10. How long does each client wait to hear about an incident?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Ben called in sick for tonight. Who can cover his shift?
3. Is anyone rostered this fortnight without a current licence?
4. Put Mere on the Tasman gatehouse every night next week.
5. Log a forced door at the mall at 2.15 am, police event P061384922.
6. Which incidents has the client not heard about yet?
7. Draft Kauri Point Mall's service report for last month.
8. Invoice Parramatta Data Hall for last week.
9. Put our business name, licence number and logo on the invoices and reports.
10. Add a field for the client's purchase order number on every site through `/customise`.

## Verification

`npm test` runs every command on a temporary database with the demo firm: migrations, repeatable seed data, each site's own time zone, the licence rule against expiry dates, NZ certificate and temporary certificate terms, the two-week emergency limit, NSW s 38A agreement and notice, induction, rest, shift length and weekly hours, cover ranking that changes nothing, overrides logged, refused repeats leaving nothing behind, sign-on refusing an unlicensed officer, patrol scans due against done, no-show cover shifts, the incident notification order, invoices to the cent with GST by country and never twice, TrackTik imports with dry run, repeats and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
guard-operations-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Guard Operations for Claude Code for your business, migrates your TrackTik data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=tracktik)
- Read more: [enterprisedna.co/omni/instead-of/tracktik](https://enterprisedna.co/omni/instead-of/tracktik?utm_source=github&utm_medium=readme&utm_campaign=tracktik)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
