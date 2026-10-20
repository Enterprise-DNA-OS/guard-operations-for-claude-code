---
description: "Record an officer finishing a shift (now, or --at). The worked hours are what gets invoiced."
---

# sign-off

Record an officer finishing a shift (now, or --at). The worked hours are what gets invoiced.

Run `node scripts/guarding.mjs sign-off <shift> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the worked hours.
