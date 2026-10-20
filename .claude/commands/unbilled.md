---
description: "Worked shifts not yet on an invoice, by client and site."
---

# unbilled

Worked shifts not yet on an invoice, by client and site.

Run `node scripts/guarding.mjs unbilled`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer `/invoice` for the oldest.
