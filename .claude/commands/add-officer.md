---
description: "Add an officer, as an employee or through a subcontractor (--subcontractor)."
---

# add-officer

Add an officer, as an employee or through a subcontractor (--subcontractor).

Run `node scripts/guarding.mjs add-officer --code=<O-123> --name="<name>" [--phone=] [--email=] [--pay=<hourly>] [--subcontractor=<name>] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then ask for the licence (`/add-licence`) and inductions (`/induct`).
