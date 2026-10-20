---
description: "The roster: every shift for the next 7 days (or --days=N from --from=date), with officer, role, status and anything wrong with it. Filter by --site or --officer."
---

# roster

The roster: every shift for the next 7 days (or --days=N from --from=date), with officer, role, status and anything wrong with it. Filter by --site or --officer.

Run `node scripts/guarding.mjs roster [--site=<site>] [--officer=<officer>] [--days=7] [--from=YYYY-MM-DD]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Group by day. Show problems next to the shift, plainly.
