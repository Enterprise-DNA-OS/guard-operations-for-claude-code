---
description: "Mark that the rostered officer did not arrive. Opens a cover shift for the time left."
---

# no-show

Mark that the rostered officer did not arrive. Opens a cover shift for the time left.

Run `node scripts/guarding.mjs no-show <shift> [--note="<detail>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Run `/cover` on the new shift straight away.
