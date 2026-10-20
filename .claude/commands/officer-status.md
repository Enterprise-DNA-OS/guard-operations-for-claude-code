---
description: "Suspend an officer, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else."
---

# officer-status

Suspend an officer, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else.

Run `node scripts/guarding.mjs officer-status <officer> --status=active|suspended|left --reason="<why>" --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer `/cover` for each shift listed.
