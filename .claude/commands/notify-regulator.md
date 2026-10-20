---
description: "Record that a notifiable event was reported to the regulator, with the reference they gave."
---

# notify-regulator

Record that a notifiable event was reported to the regulator, with the reference they gave.

Run `node scripts/guarding.mjs notify-regulator <ref> --reference="<their ref>" [--at=] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
