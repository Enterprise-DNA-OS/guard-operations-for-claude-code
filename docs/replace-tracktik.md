# Switching from TrackTik

Bring your sites, officers (with their licences) and scheduled shifts across in an afternoon. Keep TrackTik running until a week of rosters here matches.

## 1. Export from TrackTik

Run three reports in TrackTik and export each as a comma-separated file:

1. **Sites**: site ID, site name, client, address, state or region, bill rate, contracted hours.
2. **Employees**: employee ID, first and last name (or one name column), mobile, email, licence number, licence expiry, pay rate.
3. **Scheduled shifts**: shift ID, site, employee, start, end, position.

Report layouts differ between accounts. The importer reads the headings in `examples/tracktik/` and their common alternatives. If yours are different, write a map naming your heading for each field and pass `--map=map.json`:

```json
{ "code": "Post Code", "name": "Post Name", "rate": "Charge Rate" }
```

## 2. Add your clients

Sites belong to clients, so add each client first:

```bash
node scripts/guarding.mjs add-client --code=TLP --name="Tasman Logistics Park" --country=NZ --actor="Your name"
```

## 3. Import, dry run first

```bash
node scripts/guarding.mjs import tracktik sites.csv --kind=sites --client=TLP --actor="Your name" --dry-run
node scripts/guarding.mjs import tracktik employees.csv --kind=officers --region=NZ --actor="Your name" --dry-run
node scripts/guarding.mjs import tracktik shifts.csv --kind=shifts --actor="Your name" --dry-run
```

Check the counts, then run each again without `--dry-run`. Pass `--client` when a sites file covers one client (or include a Client column matching a client code or name). Pass `--region` when the employees file has no licence state column.

Imports are atomic: one bad row stops the whole file and nothing is kept. Each record keeps its TrackTik ID, so running the same file again skips what is already here.

## What maps

| TrackTik | Here |
|---|---|
| Site ID, name, address, state | `sites` (code, name, address, region) |
| Bill rate, contracted hours | `sites.bill_rate_cents`, `sites.contracted_hours_week` |
| Employee ID, name, mobile, email, pay rate | `officers` |
| Licence number and expiry | `licences`: a certificate of approval in NZ, a security licence in Australia. The issue date is set to the earliest the expiry allows; correct it from the card |
| Scheduled shift: site, employee, start, end, position | `shifts`, assigned if it has an employee, open if not. Times are read as the site's own clock |

## What does not come across

- **Guard tour scans, incident reports and photos.** They stay in TrackTik. Export the incident register as a file and keep it with your records; new incidents are logged here.
- **Checkpoints.** Add them per site with `add-checkpoint` (a few minutes a site).
- **Inductions and temporary-certificate training.** Not in a standard export. Record them with `induct` and `training`.
- **Payroll, billing history and client portal logins.** Invoice from here going forward; past invoices stay in your accounts system.
- **The guard phone app.** Officers sign on and scan in TrackTik's app today. Here a supervisor records sign-on, sign-off and scans, or Enterprise DNA builds your officers a phone screen that writes to the same database.

## After the import

Run `/compliance`. Imported shifts go through the same rules as new ones: anyone rostered without a current licence, or a subcontractor on a NSW site without the client's agreement, shows up straight away.
