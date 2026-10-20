---
description: "Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator."
---

# close-incident

Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator.

Run `node scripts/guarding.mjs close-incident <ref> --outcome="<what happened in the end>" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Never write the outcome for the operator.
