---
description: "Add a subcontractor. A NSW subcontractor needs its master licence number, because the s 38A notice names it."
---

# add-subcontractor

Add a subcontractor. A NSW subcontractor needs its master licence number, because the s 38A notice names it.

Run `node scripts/guarding.mjs add-subcontractor --name="<name>" --region=<region> [--licence=<master licence>] [--contact=] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
