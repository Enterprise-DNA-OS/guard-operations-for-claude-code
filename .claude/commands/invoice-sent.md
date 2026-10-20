---
description: "Record that an invoice was sent."
---

# invoice-sent

Record that an invoice was sent.

Run `node scripts/guarding.mjs invoice-sent <ref> [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
