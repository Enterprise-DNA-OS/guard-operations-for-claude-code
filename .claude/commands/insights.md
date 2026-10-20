---
description: "The ten questions TrackTik's dashboard does not answer: margin per hour by site, sites short of contract, patrol completion by officer, licences that lapse before the last rostered shift, unbilled work, late sign-ons, incidents per 100 hours, subcontractor share, officers near the weekly limit, and how long clients wait to hear about incidents."
---

# insights

The ten questions TrackTik's dashboard does not answer: margin per hour by site, sites short of contract, patrol completion by officer, licences that lapse before the last rostered shift, unbilled work, late sign-ons, incidents per 100 hours, subcontractor share, officers near the weekly limit, and how long clients wait to hear about incidents.

Run `node scripts/guarding.mjs insights`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Answer each question in one line, then the table.
