---
description: "Cancel an open or assigned shift, with the reason (the client cancelled, the site is closed)."
---

# cancel

Cancel an open or assigned shift, with the reason (the client cancelled, the site is closed).

Run `node scripts/guarding.mjs cancel <shift> --reason="<why>" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
