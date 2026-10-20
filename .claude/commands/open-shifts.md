---
description: "Shifts with no officer in the next 14 days (or --days=N), soonest first."
---

# open-shifts

Shifts with no officer in the next 14 days (or --days=N), soonest first.

Run `node scripts/guarding.mjs open-shifts [--days=14]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

For the first one, offer to run `/cover` on it.
