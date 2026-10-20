---
description: "Record the day the client was given written notice of the subcontractor's name and master licence number for a site (NSW s 38A(1)(b))."
---

# notice

Record the day the client was given written notice of the subcontractor's name and master licence number for a site (NSW s 38A(1)(b)).

Run `node scripts/guarding.mjs notice <site> --date=YYYY-MM-DD [--note=] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Only record a notice that was actually given.
