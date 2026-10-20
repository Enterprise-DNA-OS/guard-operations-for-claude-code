# Guard Operations for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR SECURITY BUSINESS], licence [NZ PSPLA licence or state master licence number]
- **Operator:** [YOUR NAME], [your role: owner, operations manager, rostering]
- **What matters most:** [for example: no officer ever works without a current licence, every client hears about an incident the same day]

The work is a guarding business in New Zealand or Australia: clients and their sites, officers and their licences, a roster that must be legal before anyone starts, patrol checkpoints, incidents, and invoices for the hours worked.

## Rules

- Read the CLI result before answering. Every answer about a shift, officer, site or incident starts with data from `node scripts/guarding.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- Times are the site's own clock. "18:00" at the Parramatta site is 6 pm in Sydney. Write them as `--start="2026-10-21 18:00"`.
- Before anyone goes on a shift, run `cover` or `check`. If the law says no (no current licence or certificate, NSW subcontracting without the client's written agreement or notice, NZ emergency cover past two weeks), say why and stop. Never look for a way around it.
- A house rule (induction, rest between shifts, shift length, weekly hours) can be overridden only with a reason the operator gives. Never invent the reason.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a licence number, an expiry date, an incident detail, a police event number, an agreement date or an outcome. Copy them from the card, the officer's notes or the operator.
- Never send, call, pay or delete. Reports, letters and invoices are drafts in `drafts/` or documents in `docs-out/`. Recording a notification or an invoice as sent does not send it; a person does that.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| The activity log for the last 7 days (or --days=N): who did what. | `/activity` |
| Add a patrol checkpoint to a site and how often it must be scanned. | `/add-checkpoint` |
| Add a client. The currency follows the country (NZ is NZD, AU is AUD). | `/add-client` |
| Record a certificate of approval (NZ) or a state security licence (AU). In NZ the expiry defaults from the Act (5 years for a certificate, 3 months for a temporary one); in Australia copy it from the card. | `/add-licence` |
| Add an officer, as an employee or through a subcontractor (--subcontractor). | `/add-officer` |
| Add a shift at a site (site time), optionally repeated daily (--repeat=N) and optionally with an officer, who goes through the same checks as fill. A refused officer leaves no shifts behind. | `/add-shift` |
| Add a site for a client: region, service, contracted hours a week and bill rate. | `/add-site` |
| Add a subcontractor. A NSW subcontractor needs its master licence number, because the s 38A notice names it. | `/add-subcontractor` |
| Show what needs a person today: open shifts, shifts rostered against the law, house rules broken, expired and expiring licences, temporary certificates ending without training, no sign-on, not signed off, missed patrols, incidents the regulator or client has not heard about, sites under contract hours, overdue invoices and old unbilled work. | `/attention` |
| Cancel an open or assigned shift, with the reason (the client cancelled, the site is closed). | `/cancel` |
| Every rule a shift breaks now, or would break with a named officer on it (--officer), with the source of each rule. | `/check` |
| Record the day a client agreed in writing that a site may be staffed by a subcontractor (NSW s 38A(1)(a)). | `/client-agreement` |
| Every client: country, currency, invoice terms, contact, sites and what they owe. | `/clients` |
| Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator. | `/close-incident` |
| Check the roster and incidents against the rules in docs/compliance.md, law first, each with its source. | `/compliance` |
| Who can take a shift: every active officer checked against the licence, induction, subcontracting, rest, shift-length and weekly-hours rules, those who can cover first, fewest hours that week first. Changes nothing. | `/cover` |
| Make this system yours in plain language. Add a field, rename a status, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Render monthly client service reports, incident reports, tax invoices and site instructions as branded HTML from the records. | `/documents` |
| Draft a client's service report for a period (default the last 30 days): hours delivered by site, patrol completion, incidents and shifts not covered. Written to drafts/, never sent. | `/draft-client-report` |
| Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent. | `/draft-incident-report` |
| Draft a reminder to an officer whose certificate or licence is running out, with the rule that applies. Written to drafts/, never sent. | `/draft-licence-reminder` |
| Export every record to one JSON file the business owns. | `/export` |
| Put an officer on a shift. Refuses outright if the law would be broken (no current licence or certificate, NSW subcontracting without the client's written agreement or notice, NZ emergency cover past 2 weeks). A house rule (induction, rest, shift length, weekly hours) refuses unless --override names the reason, which is logged. | `/fill` |
| Each site this week (Monday to Sunday, site time): contracted, rostered, open and worked hours, and the gap to contract. | `/hours` |
| Bring sites, employees (with licences) or scheduled shifts across from a TrackTik export (comma-separated). Dry run first. Import sites, then officers, then shifts. | `/import` |
| One incident in full, with its activity. | `/incident` |
| Every incident, newest first, with whether the client and regulator have been told. --open hides closed ones. | `/incidents` |
| Record that an officer has been inducted at a site. | `/induct` |
| The ten questions TrackTik's dashboard does not answer: margin per hour by site, sites short of contract, patrol completion by officer, licences that lapse before the last rostered shift, unbilled work, late sign-ons, incidents per 100 hours, subcontractor share, officers near the weekly limit, and how long clients wait to hear about incidents. | `/insights` |
| Raise an invoice for a client from every worked, uninvoiced shift in the period, at the site's bill rate, with GST (15% NZ, 10% AU). A shift is never invoiced twice. | `/invoice` |
| Record that an invoice was paid. | `/invoice-paid` |
| Record that an invoice was sent. | `/invoice-sent` |
| Every invoice with its standing: not sent, sent, overdue or paid. | `/invoices` |
| Every active officer's certificate or licence, soonest to expire first, with the next rostered shift. --days=N shows only those expiring within N days. | `/licences` |
| Add a note to the activity log about a site, officer, shift or incident. | `/log` |
| Log an incident at a site: when (site time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The officer on shift is attached. | `/log-incident` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in your brand by `npm run view`. | `/new-view` |
| Mark that the rostered officer did not arrive. Opens a cover shift for the time left. | `/no-show` |
| Record the day the client was given written notice of the subcontractor's name and master licence number for a site (NSW s 38A(1)(b)). | `/notice` |
| Record that the client was told about an incident (now, or --at). | `/notify-client` |
| Record that a notifiable event was reported to the regulator, with the reference they gave. | `/notify-regulator` |
| Everything about one officer: licences, inductions, upcoming shifts with any problems, and incidents. | `/officer` |
| Suspend an officer, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else. | `/officer-status` |
| Every officer: employee or subcontractor, status, licensed regions, sites inducted at, hours this week. | `/officers` |
| Shifts with no officer in the next 14 days (or --days=N), soonest first. | `/open-shifts` |
| Checkpoint scans due against scans done, by site and checkpoint, over the last 7 days (or --days=N), with who missed them. | `/patrols` |
| The roster: every shift for the next 7 days (or --days=N from --from=date), with officer, role, status and anything wrong with it. Filter by --site or --officer. | `/roster` |
| Record a checkpoint scan on a shift (for scans read off a guard tour app or a paper log). | `/scan` |
| Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, client_notify_hours, gst_nz_pct or gst_au_pct. | `/set` |
| Record an officer finishing a shift (now, or --at). The worked hours are what gets invoiced. | `/sign-off` |
| Record an officer starting a shift (now, or --at in site time). Refuses a shift that breaks the law: an officer without a current licence does not start. | `/sign-on` |
| Everything about one site: this week against contract, checkpoints, who is inducted, and recent incidents. | `/site` |
| Every site: client, region, service, contracted hours, bill rate, whether induction is required, and the NSW subcontracting agreement and notice dates. | `/sites` |
| Every subcontractor: region, master licence and how many active officers they supply. | `/subcontractors` |
| Record that an officer on a temporary certificate has finished the required training. | `/training` |
| Take the officer off an assigned shift and open it again, with the reason. | `/unassign` |
| Worked shifts not yet on an invoice, by client and site. | `/unbilled` |
| Render the read-only dashboards in views.json (this week, the roster, the licence register, money) as HTML in your brand. | `/view` |
| Write the Monday review to drafts/ from attention, compliance, open shifts, hours and unbilled work. | `/weekly-review` |
| Hours rostered this week per officer against the weekly limit. | `/workload` |

If an ask fits nothing here, run `node scripts/guarding.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/guarding.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `v_shift_problems` is every rule a shift can break, in one place: the CLI, the views and the documents all read it. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `settings` holds the house rules (`set` changes them). Laws and their sources are in `docs/compliance.md`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/replace-tracktik.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=tracktik&utm_medium=readme
