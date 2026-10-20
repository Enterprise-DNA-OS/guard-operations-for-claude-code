# CLI reference

Every command is `node scripts/guarding.mjs <command> ...`. Options use `--key=value`. Add `--json` to any command for machine output. Every write needs `--actor="<your name>"`. Times are the site's own clock, written `"YYYY-MM-DD HH:MM"`.

## activity

The activity log for the last 7 days (or --days=N): who did what.

```
node scripts/guarding.mjs activity [--days=7]
```

## add-checkpoint

Add a patrol checkpoint to a site and how often it must be scanned.

```
node scripts/guarding.mjs add-checkpoint <site> --name="<checkpoint>" --every=<minutes> --actor="<name>"
```

## add-client

Add a client. The currency follows the country (NZ is NZD, AU is AUD).

```
node scripts/guarding.mjs add-client --code=<CODE> --name="<name>" --country=NZ|AU [--contact=] [--email=] [--invoice-days=20] --actor="<name>"
```

## add-licence

Record a certificate of approval (NZ) or a state security licence (AU). In NZ the expiry defaults from the Act (5 years for a certificate, 3 months for a temporary one); in Australia copy it from the card.

```
node scripts/guarding.mjs add-licence <officer> --region=<NZ|NSW|VIC|QLD|...> --number=<number> --issued=YYYY-MM-DD [--expires=YYYY-MM-DD] [--kind=coa|temporary-coa] [--classes="<classes>"] --actor="<name>"
```

## add-officer

Add an officer, as an employee or through a subcontractor (--subcontractor).

```
node scripts/guarding.mjs add-officer --code=<O-123> --name="<name>" [--phone=] [--email=] [--pay=<hourly>] [--subcontractor=<name>] --actor="<name>"
```

## add-shift

Add a shift at a site (site time), optionally repeated daily (--repeat=N) and optionally with an officer, who goes through the same checks as fill. A refused officer leaves no shifts behind.

```
node scripts/guarding.mjs add-shift --site=<site> --start="YYYY-MM-DD HH:MM" --hours=<n> [--repeat=N] [--officer=<officer>] [--role=<role>] --actor="<name>"
```

## add-site

Add a site for a client: region, service, contracted hours a week and bill rate.

```
node scripts/guarding.mjs add-site --code=<CODE> --client=<client> --name="<name>" --region=<region> --rate=<hourly> [--hours=<per week>] [--service=static|mobile-patrol|alarm-response|crowd-control|concierge] [--address=] [--instructions=] --actor="<name>"
```

## add-subcontractor

Add a subcontractor. A NSW subcontractor needs its master licence number, because the s 38A notice names it.

```
node scripts/guarding.mjs add-subcontractor --name="<name>" --region=<region> [--licence=<master licence>] [--contact=] --actor="<name>"
```

## attention

Show what needs a person today: open shifts, shifts rostered against the law, house rules broken, expired and expiring licences, temporary certificates ending without training, no sign-on, not signed off, missed patrols, incidents the regulator or client has not heard about, sites under contract hours, overdue invoices and old unbilled work.

```
node scripts/guarding.mjs attention
```

## cancel

Cancel an open or assigned shift, with the reason (the client cancelled, the site is closed).

```
node scripts/guarding.mjs cancel <shift> --reason="<why>" --actor="<name>"
```

## check

Every rule a shift breaks now, or would break with a named officer on it (--officer), with the source of each rule.

```
node scripts/guarding.mjs check <shift> [--officer=<officer>] [--emergency]
```

## client-agreement

Record the day a client agreed in writing that a site may be staffed by a subcontractor (NSW s 38A(1)(a)).

```
node scripts/guarding.mjs client-agreement <site> --date=YYYY-MM-DD [--note=] --actor="<name>"
```

## clients

Every client: country, currency, invoice terms, contact, sites and what they owe.

```
node scripts/guarding.mjs clients
```

## close-incident

Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator.

```
node scripts/guarding.mjs close-incident <ref> --outcome="<what happened in the end>" --actor="<name>"
```

## compliance

Check the roster and incidents against the rules in docs/compliance.md, law first, each with its source.

```
node scripts/guarding.mjs compliance [--days=14] [--past=30]
```

## cover

Who can take a shift: every active officer checked against the licence, induction, subcontracting, rest, shift-length and weekly-hours rules, those who can cover first, fewest hours that week first. Changes nothing.

```
node scripts/guarding.mjs cover <shift>
```

## draft-client-report

Draft a client's service report for a period (default the last 30 days): hours delivered by site, patrol completion, incidents and shifts not covered. Written to drafts/, never sent.

```
node scripts/guarding.mjs draft-client-report <client> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
```

## draft-incident-report

Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent.

```
node scripts/guarding.mjs draft-incident-report <ref>
```

## draft-licence-reminder

Draft a reminder to an officer whose certificate or licence is running out, with the rule that applies. Written to drafts/, never sent.

```
node scripts/guarding.mjs draft-licence-reminder <officer>
```

## export

Export every record to one JSON file the business owns.

```
node scripts/guarding.mjs export [--out=<file>]
```

## fill

Put an officer on a shift. Refuses outright if the law would be broken (no current licence or certificate, NSW subcontracting without the client's written agreement or notice, NZ emergency cover past 2 weeks). A house rule (induction, rest, shift length, weekly hours) refuses unless --override names the reason, which is logged.

```
node scripts/guarding.mjs fill <shift> <officer> --actor="<name>" [--emergency] [--override="<reason>"]
```

## hours

Each site this week (Monday to Sunday, site time): contracted, rostered, open and worked hours, and the gap to contract.

```
node scripts/guarding.mjs hours
```

## import

Bring sites, employees (with licences) or scheduled shifts across from a TrackTik export (comma-separated). Dry run first. Import sites, then officers, then shifts.

```
node scripts/guarding.mjs import tracktik <file.csv> --kind=sites|officers|shifts [--client=<client>] [--region=<region>] [--map=<map.json>] --actor="<name>" --dry-run
```

## incident

One incident in full, with its activity.

```
node scripts/guarding.mjs incident <ref>
```

## incidents

Every incident, newest first, with whether the client and regulator have been told. --open hides closed ones.

```
node scripts/guarding.mjs incidents [--open]
```

## induct

Record that an officer has been inducted at a site.

```
node scripts/guarding.mjs induct <officer> <site> [--date=YYYY-MM-DD] [--by="<who>"] --actor="<name>"
```

## insights

The ten questions TrackTik's dashboard does not answer: margin per hour by site, sites short of contract, patrol completion by officer, licences that lapse before the last rostered shift, unbilled work, late sign-ons, incidents per 100 hours, subcontractor share, officers near the weekly limit, and how long clients wait to hear about incidents.

```
node scripts/guarding.mjs insights
```

## invoice

Raise an invoice for a client from every worked, uninvoiced shift in the period, at the site's bill rate, with GST (15% NZ, 10% AU). A shift is never invoiced twice.

```
node scripts/guarding.mjs invoice <client> --from=YYYY-MM-DD --to=YYYY-MM-DD --actor="<name>"
```

## invoice-paid

Record that an invoice was paid.

```
node scripts/guarding.mjs invoice-paid <ref> [--date=YYYY-MM-DD] --actor="<name>"
```

## invoice-sent

Record that an invoice was sent.

```
node scripts/guarding.mjs invoice-sent <ref> [--date=YYYY-MM-DD] --actor="<name>"
```

## invoices

Every invoice with its standing: not sent, sent, overdue or paid.

```
node scripts/guarding.mjs invoices
```

## licences

Every active officer's certificate or licence, soonest to expire first, with the next rostered shift. --days=N shows only those expiring within N days.

```
node scripts/guarding.mjs licences [--days=60]
```

## log

Add a note to the activity log about a site, officer, shift or incident.

```
node scripts/guarding.mjs log <ref> --note="<note>" --actor="<name>"
```

## log-incident

Log an incident at a site: when (site time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The officer on shift is attached.

```
node scripts/guarding.mjs log-incident --site=<site> --at="YYYY-MM-DD HH:MM" --kind=<trespass|theft|damage|alarm|medical|fire|assault|suspicious|hazard|other> --summary="<one line>" [--severity=low|medium|high|critical] [--detail=] [--police=<event no>] [--injury] [--notifiable] --actor="<name>"
```

## no-show

Mark that the rostered officer did not arrive. Opens a cover shift for the time left.

```
node scripts/guarding.mjs no-show <shift> [--note="<detail>"] --actor="<name>"
```

## notice

Record the day the client was given written notice of the subcontractor's name and master licence number for a site (NSW s 38A(1)(b)).

```
node scripts/guarding.mjs notice <site> --date=YYYY-MM-DD [--note=] --actor="<name>"
```

## notify-client

Record that the client was told about an incident (now, or --at).

```
node scripts/guarding.mjs notify-client <ref> [--at="YYYY-MM-DD HH:MM"] [--note=] --actor="<name>"
```

## notify-regulator

Record that a notifiable event was reported to the regulator, with the reference they gave.

```
node scripts/guarding.mjs notify-regulator <ref> --reference="<their ref>" [--at=] --actor="<name>"
```

## officer

Everything about one officer: licences, inductions, upcoming shifts with any problems, and incidents.

```
node scripts/guarding.mjs officer <officer>
```

## officer-status

Suspend an officer, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else.

```
node scripts/guarding.mjs officer-status <officer> --status=active|suspended|left --reason="<why>" --actor="<name>"
```

## officers

Every officer: employee or subcontractor, status, licensed regions, sites inducted at, hours this week.

```
node scripts/guarding.mjs officers
```

## open-shifts

Shifts with no officer in the next 14 days (or --days=N), soonest first.

```
node scripts/guarding.mjs open-shifts [--days=14]
```

## patrols

Checkpoint scans due against scans done, by site and checkpoint, over the last 7 days (or --days=N), with who missed them.

```
node scripts/guarding.mjs patrols [--days=7]
```

## roster

The roster: every shift for the next 7 days (or --days=N from --from=date), with officer, role, status and anything wrong with it. Filter by --site or --officer.

```
node scripts/guarding.mjs roster [--site=<site>] [--officer=<officer>] [--days=7] [--from=YYYY-MM-DD]
```

## scan

Record a checkpoint scan on a shift (for scans read off a guard tour app or a paper log).

```
node scripts/guarding.mjs scan <shift> --checkpoint=<name> --at="YYYY-MM-DD HH:MM" --actor="<name>"
```

## set

Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, client_notify_hours, gst_nz_pct or gst_au_pct.

```
node scripts/guarding.mjs set <key> <value> --actor="<name>"
```

## sign-off

Record an officer finishing a shift (now, or --at). The worked hours are what gets invoiced.

```
node scripts/guarding.mjs sign-off <shift> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## sign-on

Record an officer starting a shift (now, or --at in site time). Refuses a shift that breaks the law: an officer without a current licence does not start.

```
node scripts/guarding.mjs sign-on <shift> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## site

Everything about one site: this week against contract, checkpoints, who is inducted, and recent incidents.

```
node scripts/guarding.mjs site <site>
```

## sites

Every site: client, region, service, contracted hours, bill rate, whether induction is required, and the NSW subcontracting agreement and notice dates.

```
node scripts/guarding.mjs sites
```

## subcontractors

Every subcontractor: region, master licence and how many active officers they supply.

```
node scripts/guarding.mjs subcontractors
```

## training

Record that an officer on a temporary certificate has finished the required training.

```
node scripts/guarding.mjs training <officer> --date=YYYY-MM-DD --actor="<name>"
```

## unassign

Take the officer off an assigned shift and open it again, with the reason.

```
node scripts/guarding.mjs unassign <shift> --reason="<why>" --actor="<name>"
```

## unbilled

Worked shifts not yet on an invoice, by client and site.

```
node scripts/guarding.mjs unbilled
```

## weekly-review

Write the Monday review to drafts/ from attention, compliance, open shifts, hours and unbilled work.

```
node scripts/guarding.mjs weekly-review
```

## workload

Hours rostered this week per officer against the weekly limit.

```
node scripts/guarding.mjs workload
```

