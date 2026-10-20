---
description: "Add a site for a client: region, service, contracted hours a week and bill rate."
---

# add-site

Add a site for a client: region, service, contracted hours a week and bill rate.

Run `node scripts/guarding.mjs add-site --code=<CODE> --client=<client> --name="<name>" --region=<region> --rate=<hourly> [--hours=<per week>] [--service=static|mobile-patrol|alarm-response|crowd-control|concierge] [--address=] [--instructions=] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then offer `/add-checkpoint`.
