---
description: "Record a checkpoint scan on a shift (for scans read off a guard tour app or a paper log)."
---

# scan

Record a checkpoint scan on a shift (for scans read off a guard tour app or a paper log).

Run `node scripts/guarding.mjs scan <shift> --checkpoint=<name> --at="YYYY-MM-DD HH:MM" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
