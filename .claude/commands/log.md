---
description: "Add a note to the activity log about a site, officer, shift or incident."
---

# log

Add a note to the activity log about a site, officer, shift or incident.

Run `node scripts/guarding.mjs log <ref> --note="<note>" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
