---
description: "Take the officer off an assigned shift and open it again, with the reason."
---

# unassign

Take the officer off an assigned shift and open it again, with the reason.

Run `node scripts/guarding.mjs unassign <shift> --reason="<why>" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer `/cover` straight after.
